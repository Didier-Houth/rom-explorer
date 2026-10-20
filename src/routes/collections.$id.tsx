import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

type Video = {
  rome_code: string;
  rome_label: string;
  video_id: string;
  title: string;
  channel_title: string;
  duration_seconds: number;
  long_link: string;
  watch_link: string;
  thumbnail_url: string;
  summary: string;
};
type Coll = { name: string; rome_code: string; rome_label: string; videos: Video[] };

export const Route = createFileRoute("/collections/$id")({
  head: () => ({
    meta: [
      { title: "Collection de vidéos métiers — France Travail" },
      { name: "description", content: "Vidéos d'une collection métier : lecture, liens et résumé." },
      { property: "og:title", content: "Collection de vidéos métiers — France Travail" },
      { property: "og:description", content: "Regardez les vidéos d'une collection métier." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionPage,
});

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input readOnly value={value} className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground" />
        <button
          type="button"
          onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="h-11 shrink-0 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-accent"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

function CollectionPage() {
  const { id } = Route.useParams();
  const [coll, setColl] = useState<Coll | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Video | null>(null);

  useEffect(() => {
    void supabase
      .from("collections_videos")
      .select("name,rome_code,rome_label,videos")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError("Collection introuvable.");
        else setColl({ ...data, videos: (data.videos as Video[]) ?? [] } as Coll);
      });
  }, [id]);

  function select(v: Video) {
    setSelected(v);
    setTimeout(() => document.getElementById("lecteur")?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/collections" className="text-sm font-semibold text-primary hover:underline">← Toutes les collections</Link>
        {error && <p className="mt-6 text-destructive">{error}</p>}
        {!coll && !error && <p className="mt-6 text-muted-foreground">Chargement…</p>}
        {coll && (
          <>
            <h1 className="mt-4 font-display text-4xl font-extrabold text-foreground">{coll.name}</h1>
            {coll.rome_code !== "LIBRE" && (
              <p className="mt-2 text-muted-foreground">{coll.rome_code} · {coll.rome_label}</p>
            )}

            <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold text-foreground">Vidéos de la collection ({coll.videos.length})</h2>
              <p className="mt-1 text-sm text-muted-foreground">Cliquez sur une vidéo pour la lire.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {coll.videos.map((v) => (
                  <button
                    key={v.video_id}
                    type="button"
                    onClick={() => select(v)}
                    className={`overflow-hidden rounded-lg border text-left transition-colors ${
                      selected?.video_id === v.video_id ? "border-primary bg-secondary" : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    {v.thumbnail_url && (
                      <img src={v.thumbnail_url} alt={`Miniature de la vidéo ${v.title}`} loading="lazy" className="h-32 w-full object-cover" />
                    )}
                    <div className="space-y-1 p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{v.title}</p>
                      <p className="text-xs text-muted-foreground">{v.channel_title} · {fmt(v.duration_seconds)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {selected && (
              <section id="lecteur" className="mt-10 grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <h2 className="font-display text-xl font-bold text-foreground">Lecteur vidéo</h2>
                  <div className="aspect-video overflow-hidden rounded-lg border border-border bg-primary">
                    <iframe
                      title={selected.title}
                      src={`https://www.youtube.com/embed/${selected.video_id}?rel=0`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{selected.title}</p>
                  <CopyField label="Lien long" value={selected.long_link} />
                  <CopyField label="Lien watch" value={selected.watch_link} />
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-xl font-bold text-foreground">Résumé de la transcription</h2>
                  <div className="min-h-56 whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                    {selected.summary || "Aucun résumé enregistré pour cette vidéo."}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
