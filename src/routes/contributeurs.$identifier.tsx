import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Archive, CheckCircle2, Plus, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { savedCollectionsOptions, videoReviewsOptions, videoArchivesOptions } from "@/lib/saved-collections";
import { validatedVideos, archivedVideos, rejectedVideos } from "@/lib/video-reviews";
import { contributorGroupId, rejectedGroupId } from "@/lib/contributors";

export const Route = createFileRoute("/contributeurs/$identifier")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(savedCollectionsOptions), context.queryClient.ensureQueryData(videoReviewsOptions), context.queryClient.ensureQueryData(videoArchivesOptions)]);
  },
  head: ({ params }) => ({ meta: [
    { title: `${params.identifier} — Collections du contributeur` },
    { name: "description", content: `Collections, vidéos validées et archives du contributeur ${params.identifier}.` },
    { property: "og:title", content: `${params.identifier} — Collections du contributeur` },
    { property: "og:description", content: `Collections, vidéos validées et archives du contributeur ${params.identifier}.` },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  errorComponent: ({ error }) => <p role="alert" className="p-6">{error instanceof Error ? error.message : "Erreur de chargement."}</p>,
  notFoundComponent: () => <p className="p-6">Identifiant introuvable.</p>,
  component: ContributorPage,
});

function ContributorPage() {
  const { identifier } = Route.useParams();
  const { data: allRows } = useSuspenseQuery(savedCollectionsOptions);
  const { data: reviews } = useSuspenseQuery(videoReviewsOptions);
  const { data: allArchives } = useSuspenseQuery(videoArchivesOptions);
  const rows = allRows.filter(r => r.contributor_identifier === identifier);
  const archives = allArchives.filter(r => r.contributor_identifier === identifier);
  const validated = validatedVideos(rows, reviews).length;
  const archived = archivedVideos(archives).length;
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline"><Link to="/collections">← Toutes les collections</Link></Button>
        <Button asChild className="h-12 px-6 font-bold uppercase"><Link to="/"><Plus /> Enregistrer une nouvelle collection</Link></Button>
      </div>
      <h1 className="mt-6 break-words font-display text-4xl font-extrabold">{identifier}</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link to="/collections/$id" params={{ id: contributorGroupId(identifier) }} className="rounded-lg border-2 border-success bg-success/10 p-5 text-success hover:bg-success/20">
          <CheckCircle2 className="mb-3 size-6" /><p className="font-bold">Vidéos validées</p><p className="mt-2 text-sm">{validated} vidéo(s)</p>
        </Link>
        <Link to="/collections/$id" params={{ id: contributorGroupId(identifier, true) }} className="rounded-lg border-2 border-archive bg-archive/10 p-5 text-archive hover:bg-archive/20">
          <Archive className="mb-3 size-6" /><p className="font-bold">Vidéos validées archivées</p><p className="mt-2 text-sm">{archived} vidéo(s)</p>
        </Link>
        <Link to="/collections/$id" params={{ id: rejectedGroupId(identifier) }} className="rounded-lg border-2 border-destructive bg-destructive/10 p-5 text-destructive hover:bg-destructive/20">
          <XCircle className="mb-3 size-6" /><p className="font-bold">Vidéos refusées</p><p className="mt-2 text-sm">{rejectedVideos(rows, reviews).length} vidéo(s)</p>
        </Link>
      </div>
      <h2 className="mt-10 font-display text-2xl font-bold">Collections ({rows.length})</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(c => <Link key={c.id} to="/collections/$id" params={{ id: c.id }} className="rounded-lg border border-border bg-card p-5 shadow-sm hover:border-primary">
          <p className="break-words font-display text-lg font-bold">{c.name}</p>
          {c.rome_code !== "LIBRE" && <p className="mt-1 text-sm text-muted-foreground">{c.rome_code} · {c.rome_label}</p>}
          <p className="mt-3 text-sm font-semibold text-primary">{c.videos.length} vidéo(s) · {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
        </Link>)}
      </div>
      {rows.length === 0 && <p className="mt-4 text-muted-foreground">Aucune collection pour cet identifiant.</p>}
    </main>
  </div>;
}
