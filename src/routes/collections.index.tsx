import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

type Row = { id: string; name: string; rome_code: string; rome_label: string; videos: unknown; created_at: string };

export const Route = createFileRoute("/collections/")({
  head: () => ({
    meta: [
      { title: "Collections de vidéos métiers — France Travail" },
      { name: "description", content: "Liste des collections de vidéos métiers enregistrées." },
      { property: "og:title", content: "Collections de vidéos métiers — France Travail" },
      { property: "og:description", content: "Consultez les collections de vidéos métiers enregistrées." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CollectionsPage,
});

function CollectionsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase
      .from("collections_videos")
      .select("id,name,rome_code,rome_label,videos,created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data ?? []) as Row[]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link to="/" className="text-sm font-semibold text-primary hover:underline">← Retour à la recherche</Link>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-foreground">Collections enregistrées</h1>
        {error && <p className="mt-6 text-destructive">{error}</p>}
        {!rows && !error && <p className="mt-6 text-muted-foreground">Chargement…</p>}
        {rows && rows.length === 0 && <p className="mt-6 text-muted-foreground">Aucune collection pour l'instant.</p>}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows?.map((c) => {
            const count = Array.isArray(c.videos) ? c.videos.length : 0;
            return (
              <Link
                key={c.id}
                to="/collections/$id"
                params={{ id: c.id }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary"
              >
                <p className="font-display text-lg font-bold text-foreground">{c.name}</p>
                {c.rome_code !== "LIBRE" && (
                  <p className="mt-1 text-sm text-muted-foreground">{c.rome_code} · {c.rome_label}</p>
                )}
                <p className="mt-3 text-sm font-semibold text-primary">
                  {count} vidéo{count > 1 ? "s" : ""} · {new Date(c.created_at).toLocaleDateString("fr-FR")}
                </p>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
