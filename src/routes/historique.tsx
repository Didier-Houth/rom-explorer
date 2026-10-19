import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { collectionPayload } from "@/lib/collections";

export const Route = createFileRoute("/historique")({
  head: () => ({
    meta: [
      { title: "Historique des recherches — Vidéos métiers ROME" },
      {
        name: "description",
        content:
          "Retrouvez toutes les recherches enregistrées : code ROME, métier, vidéo trouvée, liens de partage et résumé automatique.",
      },
      { property: "og:title", content: "Historique des recherches — Vidéos métiers ROME" },
      {
        property: "og:description",
        content:
          "Toutes les fiches enregistrées : code ROME, métier, vidéo, liens long et watch, résumé.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoriquePage,
});

type Row = {
  id: string;
  rome_code: string;
  rome_label: string;
  video_id: string;
  title: string;
  channel_title: string | null;
  duration_seconds: number | null;
  long_link: string;
  watch_link: string;
  thumbnail_url: string | null;
  summary: string | null;
  created_at: string;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
    >
      {copied ? "Copié" : label}
    </button>
  );
}

function HistoriquePage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const collectionsQuery = useQuery({
    queryKey: ["collections-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("collections_videos").select("*").order("created_at", { ascending: false });
      if (error) throw new Error("Lecture des collections impossible.");
      return (data ?? []).map((collection) => ({ ...collection,
        videos: collection.videos as ReturnType<typeof collectionPayload>["videos"],
      }));
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["historique"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("videos_metiers")
        .select(
          "id, rome_code, rome_label, video_id, title, channel_title, duration_seconds, long_link, watch_link, thumbnail_url, summary, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as Row[];
    },
  });

  const rows = (data ?? []).filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.rome_code.toLowerCase().includes(q) ||
      r.rome_label.toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground">
          Historique des recherches
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Toutes les fiches enregistrées : code ROME, métier, vidéo trouvée, liens de partage et
          résumé.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrer par code ROME, métier ou titre de vidéo"
          className="mt-6 h-11 w-full max-w-md rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />

        {isLoading && <p className="mt-8 text-sm text-muted-foreground">Chargement…</p>}
        {error && (
          <p className="mt-8 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Lecture de l'historique impossible.
          </p>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <p className="mt-8 text-sm text-muted-foreground">Aucune fiche enregistrée pour le moment.</p>
        )}

        {rows.length > 0 && (
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-secondary/60">
                <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Code ROME</th>
                  <th className="px-4 py-3 font-semibold">Métier</th>
                  <th className="px-4 py-3 font-semibold">Vidéo</th>
                  <th className="px-4 py-3 font-semibold">Liens</th>
                  <th className="px-4 py-3 font-semibold">Résumé</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border align-top last:border-0">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{r.rome_code}</td>
                    <td className="px-4 py-3 text-foreground">{r.rome_label}</td>
                    <td className="px-4 py-3">
                      <a
                        href={r.watch_link}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {r.title}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">{r.channel_title}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <CopyButton value={r.long_link} label="Lien long" />
                        <CopyButton value={r.watch_link} label="Lien watch" />
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-muted-foreground">
                      <p className={openId === r.id ? "whitespace-pre-wrap" : "line-clamp-3"}>
                        {r.summary ?? "—"}
                      </p>
                      {r.summary && (
                        <button
                          type="button"
                          onClick={() => setOpenId(openId === r.id ? null : r.id)}
                          className="mt-1 text-xs font-semibold text-primary hover:underline"
                        >
                          {openId === r.id ? "Réduire" : "Voir tout"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold text-foreground">Collections enregistrées</h2>
          {collectionsQuery.isLoading && <p className="mt-4 text-sm text-muted-foreground">Chargement des collections…</p>}
          {collectionsQuery.error && <p role="alert" className="mt-4 text-sm text-destructive">Lecture des collections impossible.</p>}
          {collectionsQuery.data?.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Aucune collection enregistrée.</p>}
          <div className="mt-4 divide-y divide-border">
            {collectionsQuery.data?.filter((c) => !query.trim() || `${c.name} ${c.videos.map(v => `${v.rome_code} ${v.rome_label} ${v.title}`).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())).map((c) => (
              <details key={c.id} className="py-4">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">{c.name} · {c.videos.length} vidéos · {new Date(c.created_at).toLocaleDateString("fr-FR")}</summary>
                <ul className="mt-4 space-y-6">
                  {c.videos.map((v, index) => (
                    <li key={`${v.video_id}-${index}`} className="space-y-2 border-l-2 border-primary pl-4">
                      <a href={v.watch_link} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">{v.title}</a>
                      <p className="text-xs text-muted-foreground">{v.rome_code} · {v.rome_label} · {v.channel_title} · {v.duration_seconds} s</p>
                      <div className="flex flex-wrap gap-2"><CopyButton value={v.long_link} label="Lien long" /><CopyButton value={v.watch_link} label="Lien watch" /></div>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{v.summary || "Résumé indisponible"}</p>
                      <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Transcription</summary><p className="mt-2 whitespace-pre-wrap">{v.transcript || "Transcription indisponible pour cette vidéo."}</p></details>
                      <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">Description de la vidéo</summary><p className="mt-2 whitespace-pre-wrap">{v.description || "Aucune description disponible."}</p></details>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      </main>
      <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
        Outil interne France Travail · Historique des vidéos métiers
      </footer>
    </div>
  );
}
