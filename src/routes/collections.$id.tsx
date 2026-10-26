import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Archive, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { CollectionVideos } from "@/components/CollectionVideos";
import { savedCollectionsOptions, videoReviewsOptions, videoArchivesOptions } from "@/lib/saved-collections";
import { validatedVideos, rejectedVideos, archivedVideos, archiveAfterConfirmation } from "@/lib/video-reviews";
import { parseContributorGroup, contributorGroupId } from "@/lib/contributors";

export const Route = createFileRoute("/collections/$id")({
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(savedCollectionsOptions), context.queryClient.ensureQueryData(videoReviewsOptions), context.queryClient.ensureQueryData(videoArchivesOptions)]);
  },
  head: ({ params }) => ({ meta: [
    { title: parseContributorGroup(params.id) ? `${parseContributorGroup(params.id)?.identifier} — Vidéos ${parseContributorGroup(params.id)?.rejected ? "refusées" : parseContributorGroup(params.id)?.archived ? "archivées" : "validées"} — France Travail` : params.id === "refusees" ? "Vidéos refusées — France Travail" : params.id === "validees-archivees" ? "Vidéos validées archivées — France Travail" : params.id === "validees" ? "Vidéos validées — France Travail" : "Collection de vidéos métiers — France Travail" },
    { name: "description", content: "Vidéos métiers, codes ROME et OGR, validation et lecture des collections France Travail." },
    { property: "og:title", content: parseContributorGroup(params.id) ? `${parseContributorGroup(params.id)?.identifier} — Vidéos ${parseContributorGroup(params.id)?.rejected ? "refusées" : parseContributorGroup(params.id)?.archived ? "archivées" : "validées"} — France Travail` : params.id === "refusees" ? "Vidéos refusées — France Travail" : params.id === "validees-archivees" ? "Vidéos validées archivées — France Travail" : params.id === "validees" ? "Vidéos validées — France Travail" : "Collection de vidéos métiers — France Travail" },
    { property: "og:description", content: "Consultez les vidéos et leurs métiers, puis retrouvez toutes les vidéos validées." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CollectionPage,
});

function CollectionPage() {
  const { id } = Route.useParams();
  const { data: collections } = useSuspenseQuery(savedCollectionsOptions);
  const { data: reviews } = useSuspenseQuery(videoReviewsOptions);
  const { data: archives } = useSuspenseQuery(videoArchivesOptions);
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const group = parseContributorGroup(id);
  const rejected = id === "refusees" || Boolean(group?.rejected);
  const general = id === "validees" || Boolean(group && !group.archived && !group.rejected);
  const archived = id === "validees-archivees" || Boolean(group?.archived);
  const collection = collections.find(c => c.id === id);
  const groupRows = group ? collections.filter(row => row.contributor_identifier === group.identifier) : collections;
  const videos = rejected ? rejectedVideos(groupRows, reviews) : archived ? archivedVideos(group ? archives.filter(row => row.contributor_identifier === group.identifier) : archives) : general ? validatedVideos(group ? collections.filter(row => row.contributor_identifier === group.identifier) : collections, reviews) : collection?.videos ?? [];
  const title = `${group ? `${group.identifier} — ` : collection?.contributor_identifier ? `${collection.contributor_identifier} — ` : ""}${rejected ? "Vidéos refusées" : archived ? "Vidéos validées archivées" : general ? "Vidéos validées" : collection?.name ?? "Collection"}`;

  async function clearCollection() {
    if (clearing) return;
    setClearing(true); setError(null);
    try {
      await archiveAfterConfirmation(true, async () => {
        const { error } = group ? await supabase.rpc("archive_contributor_videos", { target_identifier: group.identifier }) : await supabase.rpc("archive_validated_videos");
        if (error) throw new Error(error.message);
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: videoReviewsOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: videoArchivesOptions.queryKey }),
      ]);
      setConfirmOpen(false);
    } catch { setError("La collection n’a pas pu être vidée. Réessayez."); }
    finally { setClearing(false); }
  }
  return <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild className="h-12 px-6 font-bold uppercase"><Link to="/">← Formulaire recherche</Link></Button>
        <Button asChild variant="link"><Link to="/collections">← Toutes les collections</Link></Button>
        {!general && <Button asChild variant="outline"><Link to="/collections/$id" params={{ id: "validees" }}>Vidéos validées</Link></Button>}
      </div>
      {!general && !archived && !rejected && !collection ? <p className="mt-6 text-destructive">Collection introuvable.</p> : <>
        <h1 className="mt-6 break-words font-display text-4xl font-extrabold">{title}</h1>
        {general && <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="destructive" disabled={videos.length === 0 || clearing} onClick={() => { setError(null); setConfirmOpen(true); }}><Archive className="size-4" />Vider la collection</Button>
          <Button asChild variant="outline"><Link to="/collections/$id" params={{ id: group ? contributorGroupId(group.identifier, true) : "validees-archivees" }}>Vidéos validées archivées</Link></Button>
        </div>}
        {!general && !archived && !rejected && collection?.rome_code !== "LIBRE" && <p className="mt-2 text-muted-foreground">{collection?.rome_code} · {collection?.rome_label}</p>}
        <CollectionVideos key={`${id}:${videos.length}`} videos={videos} collectionId={general || archived || rejected ? undefined : id} emptyMessage={rejected ? "Aucune vidéo refusée pour l’instant." : archived ? "Aucune vidéo archivée pour l’instant." : undefined} />
      </>}
      {general && <AlertDialog open={confirmOpen} onOpenChange={open => { if (!clearing) setConfirmOpen(open); }}>
        <AlertDialogContent className="w-[calc(100%-2rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Vider la collection « {title} » ?</AlertDialogTitle>
            <AlertDialogDescription>Toutes les vidéos de cette collection seront déplacées dans « Vidéos validées archivées », avec leurs codes ROME, OGR, métier et informations associées. Les collections d’origine seront conservées.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
            <Button variant="destructive" disabled={clearing} onClick={() => void clearCollection()}>{clearing && <Loader2 className="size-4 animate-spin" />}{clearing ? "Archivage en cours…" : "Confirmer le vidage"}</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>}
    </main>
  </div>;
}
