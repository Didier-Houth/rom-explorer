import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type VideoResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  longLink: string;
  watchLink: string;
  thumbnailUrl: string;
  description: string;
};

const SearchInput = z.object({
  romeCode: z.string().min(1),
  romeLabel: z.string().min(1),
});

function parseIsoDuration(iso: string): number {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

export const searchRomeVideos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<VideoResult[]> => {
    const key = process.env["YOUTUBE_API_KEY"];
    if (!key) {
      throw new Error(
        "La clé d'accès à YouTube n'est pas encore enregistrée dans l'outil.",
      );
    }

    const query = `${data.romeLabel} métier`;
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoDuration", "short");
    searchUrl.searchParams.set("videoEmbeddable", "true");
    searchUrl.searchParams.set("relevanceLanguage", "fr");
    searchUrl.searchParams.set("regionCode", "FR");
    searchUrl.searchParams.set("maxResults", "25");
    searchUrl.searchParams.set("key", key);

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      const body = await searchRes.text();
      throw new Error(`Recherche YouTube impossible (${searchRes.status}). ${body.slice(0, 200)}`);
    }
    const searchJson = (await searchRes.json()) as {
      items?: Array<{ id?: { videoId?: string } }>;
    };
    const ids = (searchJson.items ?? [])
      .map((i) => i.id?.videoId)
      .filter((v): v is string => Boolean(v));
    if (ids.length === 0) return [];

    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "snippet,contentDetails");
    detailsUrl.searchParams.set("id", ids.join(","));
    detailsUrl.searchParams.set("key", key);

    const detailsRes = await fetch(detailsUrl);
    if (!detailsRes.ok) {
      const body = await detailsRes.text();
      throw new Error(`Détails YouTube indisponibles (${detailsRes.status}). ${body.slice(0, 200)}`);
    }
    const detailsJson = (await detailsRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          channelTitle?: string;
          description?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
        contentDetails?: { duration?: string };
      }>;
    };

    return (detailsJson.items ?? [])
      .map((item) => {
        const durationSeconds = parseIsoDuration(item.contentDetails?.duration ?? "");
        return {
          videoId: item.id,
          title: item.snippet?.title ?? "Sans titre",
          channelTitle: item.snippet?.channelTitle ?? "",
          durationSeconds,
          longLink: `https://youtu.be/${item.id}`,
          watchLink: `https://www.youtube.com/watch?v=${item.id}`,
          thumbnailUrl:
            item.snippet?.thumbnails?.medium?.url ??
            item.snippet?.thumbnails?.default?.url ??
            "",
          description: item.snippet?.description ?? "",
        };
      })
      .filter((v) => v.durationSeconds > 0 && v.durationSeconds <= 240)
      .sort((a, b) => a.durationSeconds - b.durationSeconds);
  });

const SummaryInput = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  romeLabel: z.string().min(1),
  description: z.string().default(""),
});

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=fr`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();
    const match = /"captionTracks":(\[.*?\])/.exec(html);
    if (!match?.[1]) return null;
    const tracks = JSON.parse(match[1].replace(/\\u0026/g, "&")) as Array<{
      baseUrl?: string;
      languageCode?: string;
    }>;
    const track = tracks.find((t) => t.languageCode?.startsWith("fr")) ?? tracks[0];
    if (!track?.baseUrl) return null;
    const capRes = await fetch(`${track.baseUrl}&fmt=json3`);
    if (!capRes.ok) return null;
    const capJson = (await capRes.json()) as {
      events?: Array<{ segs?: Array<{ utf8?: string }> }>;
    };
    const text = (capJson.events ?? [])
      .flatMap((e) => (e.segs ?? []).map((s) => s.utf8 ?? ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > 40 ? text : null;
  } catch {
    return null;
  }
}

export const summarizeVideo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SummaryInput.parse(input))
  .handler(async ({ data }): Promise<{ transcript: string | null; summary: string }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Le service de résumé n'est pas configuré.");

    const transcript = await fetchTranscript(data.videoId);
    const source = transcript ?? data.description;
    if (!source || source.trim().length < 30) {
      return {
        transcript,
        summary:
          "Aucune transcription n'est disponible pour cette vidéo : le résumé automatique n'a pas pu être produit.",
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu rédiges en français, pour France Travail, des synthèses de vidéos métiers. Style clair, neutre, orienté découverte du métier.",
          },
          {
            role: "user",
            content: `Métier concerné : ${data.romeLabel}\nTitre de la vidéo : ${data.title}\n\nÀ partir de la transcription ci-dessous, rédige :\n1) un résumé de 5 à 8 lignes ;\n2) une liste « À retenir » de 4 points clés (activités, compétences, conditions d'exercice, accès au métier) ;\n3) une phrase d'accroche de 20 mots maximum réutilisable en communication.\n\nTranscription :\n${source.slice(0, 20000)}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Trop de demandes de résumé, réessayez dans un instant.");
      if (res.status === 402) throw new Error("Les crédits IA de l'espace de travail sont épuisés.");
      throw new Error(`Résumé indisponible (${res.status}). ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return {
      transcript,
      summary: json.choices?.[0]?.message?.content?.trim() ?? "Résumé vide.",
    };
  });
