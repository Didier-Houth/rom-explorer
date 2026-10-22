import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { nextReviewStatus, videoReferences, type ReviewStatus, type SavedVideo } from "@/lib/video-reviews";
import { videoReviewsOptions } from "@/lib/saved-collections";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase text-muted-foreground">{label}</label>
    <div className="flex gap-2">
      <input aria-label={label} readOnly value={value} className="h-11 w-full min-w-0 rounded-md border border-border bg-card px-3 text-sm" />
      <Button variant="secondary" className="h-11" onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); }
      }}>{copied ? "Copié" : "Copier"}</Button>
    </div>
  </div>;
}

export function CollectionVideos({ videos, collectionId }: { videos: SavedVideo[]; collectionId?: string }) {
  const { data: reviews } = useSuspenseQuery(videoReviewsOptions);
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<SavedVideo | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function review(video: SavedVideo, current: ReviewStatus, choice: "approved" | "rejected", checked: boolean) {
    if (!collectionId || saving) return;
    setSaving(video.video_id); setError(null);
    try {
      const status = nextReviewStatus(current, choice, checked);
      const { error } = await supabase.from("collection_video_reviews").upsert({ collection_id: collectionId, video_id: video.video_id, status }, { onConflict: "collection_id,video_id" });
      if (error) throw new Error(error.message);
      await queryClient.invalidateQueries({ queryKey: videoReviewsOptions.queryKey });
    } catch { setError("Le choix n’a pas été enregistré. Réessayez."); }
    finally { setSaving(null); }
  }

  return <>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    <section className="mt-8">
      <h2 className="font-display text-2xl font-bold">Vidéos de la collection ({videos.length})</h2>
      {videos.length === 0 && <p className="mt-4 text-muted-foreground">Aucune vidéo validée pour l’instant.</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v, index) => {
          const status = collectionId ? reviews.find(r => r.collection_id === collectionId && r.video_id === v.video_id)?.status ?? "pending" : "approved";
          const ref = videoReferences(v);
          const colors = status === "approved" ? "border-success bg-success/10" : status === "rejected" ? "border-destructive bg-destructive/10" : "border-border bg-card";
          return <article key={`${v.video_id}:${index}`} data-review={status} className={`overflow-hidden rounded-lg border-2 ${colors}`}>
            <Button variant="ghost" className="h-auto w-full flex-col items-stretch gap-0 overflow-hidden whitespace-normal rounded-none p-0 text-left" onClick={() => {
              setSelected(v); setTimeout(() => document.getElementById("lecteur")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
            }} aria-label={`Lire ${v.title}`}>
              {v.thumbnail_url && <img src={v.thumbnail_url} alt={`Miniature de ${v.title}`} loading="lazy" className="aspect-video w-full object-cover" />}
              <div className="space-y-2 p-4">
                <p className={`text-sm font-bold ${status === "approved" ? "text-success" : status === "rejected" ? "text-destructive" : "text-foreground"}`}>{v.title}</p>
                <p className="text-xs text-muted-foreground">{v.channel_title} · {Math.floor(v.duration_seconds / 60)}:{String(v.duration_seconds % 60).padStart(2, "0")}</p>
                <dl className="space-y-1 text-xs text-foreground">
                  <div><dt className="inline font-semibold">Code ROME : </dt><dd className="inline">{ref.rome}</dd></div>
                  <div><dt className="inline font-semibold">Code OGR : </dt><dd className="inline">{ref.ogr || "Non renseigné"}</dd></div>
                  <div><dt className="inline font-semibold">Métier ROME : </dt><dd className="inline">{ref.metier || "Non renseigné"}</dd></div>
                </dl>
              </div>
            </Button>
            {collectionId && <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-border px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-destructive"><Checkbox aria-label={`Refusée — ${v.title}`} checked={status === "rejected"} disabled={saving !== null} onCheckedChange={checked => void review(v, status, "rejected", checked === true)} className="border-destructive data-[state=checked]:bg-destructive" />Refusée</label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-success"><Checkbox aria-label={`Validée — ${v.title}`} checked={status === "approved"} disabled={saving !== null} onCheckedChange={checked => void review(v, status, "approved", checked === true)} className="border-success data-[state=checked]:bg-success" />Validée</label>
            </div>}
          </article>;
        })}
      </div>
    </section>
    {selected && <section id="lecteur" className="mt-10 grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold">Lecteur vidéo</h2>
        <div className="aspect-video overflow-hidden rounded-lg border border-border bg-primary"><iframe title={selected.title} src={`https://www.youtube.com/embed/${selected.video_id}?rel=0`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen className="h-full w-full" /></div>
        <p className="text-sm font-semibold">{selected.title}</p>
        <CopyField label="Lien long" value={selected.long_link} />
        <CopyField label="Lien watch" value={selected.watch_link} />
      </div>
      <div className="space-y-3"><h2 className="font-display text-xl font-bold">Résumé de la transcription</h2><div className="min-h-56 whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm leading-relaxed">{selected.summary || "Aucun résumé enregistré pour cette vidéo."}</div></div>
    </section>}
  </>;
}