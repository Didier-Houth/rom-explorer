import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { CollectionVideos } from "@/components/CollectionVideos";
import { savedCollectionsOptions, videoReviewsOptions } from "@/lib/saved-collections";
import { validatedVideos } from "@/lib/video-reviews";

export const Route = createFileRoute("/collections/$id")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(savedCollectionsOptions), context.queryClient.ensureQueryData(videoReviewsOptions)]);
  },
  head: ({ params }) => ({ meta: [
    { title: params.id === "validees" ? "Vidéos validées — France Travail" : "Collection de vidéos métiers — France Travail" },
    { name: "description", content: "Vidéos métiers, codes ROME et OGR, validation et lecture des collections France Travail." },
    { property: "og:title", content: params.id === "validees" ? "Vidéos validées — France Travail" : "Collection de vidéos métiers — France Travail" },
    { property: "og:description", content: "Consultez les vidéos et leurs métiers, puis retrouvez toutes les vidéos validées." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CollectionPage,
});

function CollectionPage() {
  const { id } = Route.useParams();
  const { data: collections } = useSuspenseQuery(savedCollectionsOptions);
  const { data: reviews } = useSuspenseQuery(videoReviewsOptions);
  const general = id === "validees";
  const collection = collections.find(c => c.id === id);
  const videos = general ? validatedVideos(collections, reviews) : collection?.videos ?? [];
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-12 px-6 font-bold uppercase"><Link to="/">← Formulaire recherche</Link></Button>
        <Button asChild variant="link"><Link to="/collections">← Toutes les collections</Link></Button>
        {!general && <Button asChild variant="outline"><Link to="/collections/$id" params={{ id: "validees" }}>Vidéos validées</Link></Button>}
      </div>
      {!general && !collection ? <p className="mt-6 text-destructive">Collection introuvable.</p> : <>
        <h1 className="mt-6 break-words font-display text-4xl font-extrabold">{general ? "Vidéos validées" : collection?.name}</h1>
        {!general && collection?.rome_code !== "LIBRE" && <p className="mt-2 text-muted-foreground">{collection?.rome_code} · {collection?.rome_label}</p>}
        <CollectionVideos key={id} videos={videos} collectionId={general ? undefined : id} />
      </>}
    </main>
  </div>;
}
