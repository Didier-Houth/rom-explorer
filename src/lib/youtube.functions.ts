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

function parseLengthText(text: string): number {
  const parts = text.trim().split(":").map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function collectVideos(node: unknown, out: VideoResult[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectVideos(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const vr = obj["videoRenderer"] as Record<string, unknown> | undefined;
  if (vr && typeof vr["videoId"] === "string") {
    const runs = (v: unknown): string =>
      ((v as { runs?: Array<{ text?: string }> })?.runs ?? [])
        .map((r) => r.text ?? "")
        .join("");
    const lengthText = (vr["lengthText"] as { simpleText?: string } | undefined)?.simpleText ?? "";
    const durationSeconds = lengthText ? parseLengthText(lengthText) : 0;
    const thumbs = (vr["thumbnail"] as { thumbnails?: Array<{ url?: string }> } | undefined)?.thumbnails ?? [];
    out.push({
      videoId: vr["videoId"] as string,
      title: runs(vr["title"]) || "Sans titre",
      channelTitle: runs(vr["ownerText"]) || runs(vr["longBylineText"]),
      durationSeconds,
      longLink: `https://youtu.be/${vr["videoId"] as string}`,
      watchLink: `https://www.youtube.com/watch?v=${vr["videoId"] as string}`,
      thumbnailUrl: thumbs[thumbs.length - 1]?.url ?? "",
      description: runs(vr["descriptionSnippet"]),
    });
    return;
  }
  for (const value of Object.values(obj)) collectVideos(value, out);
}

export const searchRomeVideos = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }): Promise<VideoResult[]> => {
    // Recherche anonyme, comme un visiteur YouTube non connecté : aucune clé API requise.
    const query = `${data.romeLabel} métier`;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&hl=fr&gl=FR`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
    if (!res.ok) {
      throw new Error(`Recherche YouTube impossible (${res.status}). Réessayez dans un instant.`);
    }
    const html = await res.text();
    const match = /var ytInitialData = (\{.*?\});<\/script>/.exec(html)
      ?? /ytInitialData"?\s*[:=]\s*(\{.*?\})\s*;\s*(?:var |window\.|<\/script>)/.exec(html);
    if (!match?.[1]) {
      throw new Error("YouTube n'a pas renvoyé de résultats exploitables. Réessayez.");
    }

    let initialData: unknown;
    try {
      initialData = JSON.parse(match[1]);
    } catch {
      throw new Error("Les résultats YouTube n'ont pas pu être lus. Réessayez.");
    }

    const videos: VideoResult[] = [];
    collectVideos(initialData, videos);

    const seen = new Set<string>();
    return videos
      .filter((v) => {
        if (seen.has(v.videoId)) return false;
        seen.add(v.videoId);
        return v.durationSeconds > 0 && v.durationSeconds <= 240;
      })
      .sort((a, b) => a.durationSeconds - b.durationSeconds)
      .slice(0, 12);
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
