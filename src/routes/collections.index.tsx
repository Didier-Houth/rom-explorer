import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { savedCollectionsOptions, videoReviewsOptions, videoArchivesOptions } from "@/lib/saved-collections";
import { validatedVideos, archivedVideos } from "@/lib/video-reviews";
import { contributorGroupId } from "@/lib/contributors";

export const Route = createFileRoute("/collections/")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(savedCollectionsOptions), context.queryClient.ensureQueryData(videoReviewsOptions), context.queryClient.ensureQueryData(videoArchivesOptions)]);
  },
  head: () => ({ meta: [
    { title: "Collections de vidéos métiers — France Travail" },
    { name: "description", content: "Collections enregistrées et collection générale des vidéos validées avec leurs métiers ROME et codes OGR." },
    { property: "og:title", content: "Collections de vidéos métiers — France Travail" },
    { property: "og:description", content: "Consultez les collections de vidéos métiers et toutes les vidéos validées." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: rows } = useSuspenseQuery(savedCollectionsOptions);
  const { data: reviews } = useSuspenseQuery(videoReviewsOptions);
  const { data: archives } = useSuspenseQuery(videoArchivesOptions);
  const count = validatedVideos(rows, reviews).length;
  const identifiers = [...new Set([...rows, ...archives].map(row => row.contributor_identifier).filter((identifier): identifier is string => Boolean(identifier)))].sort();
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-12 px-6 font-bold uppercase"><Link to="/">← Formulaire recherche</Link></Button>
        <Button asChild variant="link"><Link to="/historique">Historique</Link></Button>
      </div>
      <h1 className="mt-6 font-display text-4xl font-extrabold">Collections enregistrées</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/collections/$id" params={{ id: "validees" }} className="rounded-lg border-2 border-success bg-success/10 p-5 transition-colors hover:bg-success/20">
          <CheckCircle2 className="mb-3 size-7 text-success" />
          <p className="font-display text-lg font-bold text-success">Vidéos validées</p>
          <p className="mt-1 text-sm text-muted-foreground">Collection générale</p>
          <p className="mt-3 text-sm font-semibold text-success">{count} vidéo{count > 1 ? "s" : ""}</p>
        </Link>
        <Link to="/collections/$id" params={{ id: "validees-archivees" }} className="rounded-lg border-2 border-archive bg-archive/10 p-5 transition-colors hover:bg-archive/20">
          <Archive className="mb-3 size-7 text-archive" />
          <p className="font-display text-lg font-bold text-archive">Vidéos validées archivées</p>
          <p className="mt-3 text-sm font-semibold text-archive">{archivedVideos(archives).length} vidéo(s)</p>
        </Link>
        {rows.map(c => <Link key={c.id} to="/collections/$id" params={{ id: c.id }} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary">
          <p className="break-words font-display text-lg font-bold">{c.contributor_identifier ? `${c.contributor_identifier} — ` : ""}{c.name}</p>
          {c.rome_code !== "LIBRE" && <p className="mt-1 text-sm text-muted-foreground">{c.rome_code} · {c.rome_label}</p>}
          <p className="mt-3 text-sm font-semibold text-primary">{c.videos.length} vidéo{c.videos.length > 1 ? "s" : ""} · {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
        </Link>)}
      </div>
      {identifiers.map(identifier => <section key={identifier} className="mt-10 border-t border-border pt-6">
        <h2 className="break-words font-display text-xl font-bold">{identifier}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link to="/collections/$id" params={{ id: contributorGroupId(identifier) }} className="rounded-lg border-2 border-success bg-success/10 p-5 text-success">
            <CheckCircle2 className="mb-3 size-6" /><p className="break-words font-bold">{identifier} — Vidéos validées</p><p className="mt-2 text-sm">{validatedVideos(rows.filter(row => row.contributor_identifier === identifier), reviews).length} vidéo(s)</p>
          </Link>
          <Link to="/collections/$id" params={{ id: contributorGroupId(identifier, true) }} className="rounded-lg border-2 border-archive bg-archive/10 p-5 text-archive">
            <Archive className="mb-3 size-6" /><p className="break-words font-bold">{identifier} — Vidéos validées archivées</p><p className="mt-2 text-sm">{archivedVideos(archives.filter(row => row.contributor_identifier === identifier)).length} vidéo(s)</p>
          </Link>
        </div>
      </section>)}
      {rows.length === 0 && <p className="mt-6 text-muted-foreground">Aucune collection enregistrée pour l’instant.</p>}
    </main>
  </div>;
}
