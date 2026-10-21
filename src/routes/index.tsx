import { createFileRoute, Link } from "@tanstack/react-router";
import { Library } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { displayRomeCodePair, isRomeCodeFormat, lookupRomeLabel, normalizeRomeCode, ROME_CODES } from "@/lib/rome-codes";
import { searchRomeVideos, summarizeVideo, type VideoResult } from "@/lib/youtube.functions";

const SEARCH_TEMPLATES = [
  "Métier de [métier] témoignage",
  "[métier] témoignage professionnel",
  "Je suis [métier]",
  "Une journée dans la vie de [métier]",
  "Découvrir le métier de [métier]",
] as const;
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { collectionPayload, type CollectionItem } from "@/lib/collections";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vidéo métier ROME — Outil France Travail" },
      {
        name: "description",
        content:
          "Saisissez un code ROME, trouvez une vidéo métier de moins de 4 minutes sur YouTube, récupérez ses liens et un résumé automatique de sa transcription.",
      },
      { property: "og:title", content: "Vidéo métier ROME — Outil France Travail" },
      {
        property: "og:description",
        content:
          "Recherche de vidéos métiers par code ROME, liens de partage et résumé automatique de la transcription.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Field({
  label,
  value,
  placeholder,
}: {
  label: string;
  value: string;
  placeholder: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          placeholder={placeholder}
          className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none"
        />
        <button
          type="button"
          disabled={!value}
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="h-11 shrink-0 rounded-md border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-40"
        >
          {copied ? "Copié" : "Copier"}
        </button>
      </div>
    </div>
  );
}

type BatchRow = {
  romeCode: string;
  romeLabel: string;
  status: "en attente" | "en cours" | "terminé" | "erreur";
  video: VideoResult | null;
  summary: string;
  message?: string | undefined;
};

function Index() {
  const search = useServerFn(searchRomeVideos);
  const summarize = useServerFn(summarizeVideo);

  const [romeCode, setRomeCode] = useState("");
  const [ogrCode, setOgrCode] = useState("");
  const [metierLibre, setMetierLibre] = useState("");
  const [results, setResults] = useState<VideoResult[] | null>(null);
  const [selected, setSelected] = useState<VideoResult | null>(null);
  const [summary, setSummary] = useState("");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [batchInput, setBatchInput] = useState("");
  const [batchRows, setBatchRows] = useState<BatchRow[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);

  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [collectionName, setCollectionName] = useState("");
  const [collectionCode, setCollectionCode] = useState("");
  const [collectionMetier, setCollectionMetier] = useState("");
  const [collectionSaving, setCollectionSaving] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState<string | null>(null);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [videoTexts, setVideoTexts] = useState<Record<string, { transcript: string | null; summary: string }>>({});

  function toggleCollection(video: VideoResult, romeCode: string, romeLabel: string) {
    setCollectionMessage(null);
    const adding = !collection.some((i) => i.video.videoId === video.videoId);
    if (adding && collection.length === 0) {
      // Pré-remplit les champs ROME de la collection avec la recherche en cours.
      setCollectionCode(romeCode === "LIBRE" ? "" : romeCode);
      setCollectionMetier(romeLabel);
    }
    setCollection((prev) =>
      prev.some((i) => i.video.videoId === video.videoId)
        ? prev.filter((i) => i.video.videoId !== video.videoId)
        : [...prev, { romeCode, romeLabel, video, ...videoTexts[video.videoId] }],
    );
  }

  async function handleSaveCollection() {
    if (collectionSaving) return;
    setCollectionError(null);
    setCollectionMessage(null);
    try {
      const meta = { romeCode: collectionCode, romeLabel: collectionMetier };
      collectionPayload(collectionName, collection, meta);
      setCollectionSaving(true);
      const complete: CollectionItem[] = [];
      for (const item of collection) {
        setCollectionMessage(`Préparation des vidéos : ${complete.length + 1}/${collection.length}…`);
        const text = item.summary ? { summary: item.summary, transcript: item.transcript ?? null }
          : videoTexts[item.video.videoId] ?? await summarize({ data: {
            videoId: item.video.videoId, title: item.video.title,
            romeLabel: item.romeLabel, description: item.video.description,
          } });
        complete.push({ ...item, ...text });
      }
      setCollection(complete);
      const { error: dbError } = await supabase.from("collections_videos").insert(collectionPayload(collectionName, complete, meta));
      if (dbError) throw new Error("La collection n'a pas pu être enregistrée. Réessayez.");
      setCollectionMessage(`Collection « ${collectionName.trim()} » enregistrée (${complete.length} vidéos).`);
    } catch (e) {
      setCollectionMessage(null);
      setCollectionError(e instanceof Error ? e.message : "Enregistrement impossible. Réessayez.");
    } finally {
      setCollectionSaving(false);
    }
  }

  // Libellé du métier : depuis le code ROME ou, à défaut, depuis le code OGR.
  const label = useMemo(
    () => lookupRomeLabel(romeCode) ?? (ogrCode ? lookupRomeLabel(ogrCode) ?? "" : ""),
    [romeCode, ogrCode],
  );
  const [template, setTemplate] = useState<string>(SEARCH_TEMPLATES[0]);
  // Libellé utilisé pour la recherche YouTube : le métier saisi librement est prioritaire
  // sur le libellé généré à partir du code ROME.
  const searchLabel = useMemo(
    () => (metierLibre.trim() ? metierLibre.trim() : label),
    [metierLibre, label],
  );

  function handleResetForm() {
    setRomeCode("");
    setOgrCode("");
    setMetierLibre("");
    setTemplate(SEARCH_TEMPLATES[0]);
    setResults(null);
    setSelected(null);
    setSummary("");
    setTranscript(null);
    setSaved(false);
    setError(null);
    setCollection([]);
    setCollectionName("");
    setCollectionCode("");
    setCollectionMetier("");
    setCollectionMessage(null);
    setCollectionError(null);
  }

  async function handleSearch() {
    setError(null);
    setResults(null);
    setSelected(null);
    setSummary("");
    setTranscript(null);
    setSaved(false);
    if (!searchLabel) {
      setError(
        "Saisissez un code ROME reconnu (exemple : M1805), un code OGR (exemple : 38949) ou un nom de métier libre.",
      );
      return;
    }
    setLoading(true);
    try {
      const items = await search({
        data: {
          romeCode: displayRomeCodePair(romeCode, ogrCode) || "LIBRE",
          romeLabel: searchLabel,
          query: template.replace("[métier]", searchLabel),
        },
      });
      setResults(items);
      document.getElementById("resultats")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (items.length === 0) {
        setError("Aucune vidéo de moins de 4 minutes trouvée pour ce métier.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "La recherche a échoué.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(video: VideoResult) {
    setSelected(video);
    setSummary("");
    setTranscript(null);
    setSaved(false);
    setSummarizing(true);
    setError(null);
    try {
      const res = await summarize({
        data: {
          videoId: video.videoId,
          title: video.title,
          romeLabel: searchLabel,
          description: video.description,
        },
      });
      setSummary(res.summary);
      setTranscript(res.transcript);
      setVideoTexts((prev) => ({ ...prev, [video.videoId]: res }));
      setCollection((prev) => prev.map((item) => item.video.videoId === video.videoId ? { ...item, ...res } : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Le résumé a échoué.");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSave() {
    if (!selected) return;
    setError(null);
    const { error: dbError } = await supabase.from("videos_metiers").insert({
      rome_code: displayRomeCodePair(romeCode, ogrCode),
      rome_label: searchLabel,
      video_id: selected.videoId,
      title: selected.title,
      channel_title: selected.channelTitle,
      duration_seconds: selected.durationSeconds,
      long_link: selected.longLink,
      watch_link: selected.watchLink,
      thumbnail_url: selected.thumbnailUrl,
      transcript,
      summary,
    });
    if (dbError) setError("Enregistrement impossible : " + dbError.message);
    else setSaved(true);
  }

  async function handleBatch() {
    setBatchError(null);
    const codes = Array.from(
      new Set(
        batchInput
          .split(/[\s,;\n]+/)
          .map((c) => normalizeRomeCode(c))
          .filter(Boolean),
      ),
    );
    if (codes.length === 0) {
      setBatchError("Saisissez au moins un code ROME (séparés par des virgules ou des retours à la ligne).");
      return;
    }
    const unknown = codes.filter((c) => !lookupRomeLabel(c));
    if (unknown.length === codes.length) {
      setBatchError("Aucun code ROME reconnu dans la liste.");
      return;
    }

    const initial: BatchRow[] = codes.map((c) => ({
      romeCode: c,
      romeLabel: lookupRomeLabel(c) ?? "",
      status: lookupRomeLabel(c) ? "en attente" : "erreur",
      video: null,
      summary: "",
      message: lookupRomeLabel(c) ? undefined : "Code ROME inconnu",
    }));
    setBatchRows(initial);
    setBatchRunning(true);

    for (let i = 0; i < initial.length; i++) {
      const row = initial[i]!;
      if (row.status === "erreur") continue;
      setBatchRows((prev) =>
        prev.map((r, idx) => (idx === i ? { ...r, status: "en cours" } : r)),
      );
      try {
        const items = await search({
          data: { romeCode: row.romeCode, romeLabel: row.romeLabel },
        });
        const video = items[0];
        if (!video) {
          setBatchRows((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "erreur", message: "Aucune vidéo de moins de 4 minutes" }
                : r,
            ),
          );
          continue;
        }
        const res = await summarize({
          data: {
            videoId: video.videoId,
            title: video.title,
            romeLabel: row.romeLabel,
            description: video.description,
          },
        });
        await supabase.from("videos_metiers").insert({
          rome_code: row.romeCode,
          rome_label: row.romeLabel,
          video_id: video.videoId,
          title: video.title,
          channel_title: video.channelTitle,
          duration_seconds: video.durationSeconds,
          long_link: video.longLink,
          watch_link: video.watchLink,
          thumbnail_url: video.thumbnailUrl,
          transcript: res.transcript,
          summary: res.summary,
        });
        setBatchRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "terminé", video, summary: res.summary } : r,
          ),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Échec du traitement";
        setBatchRows((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "erreur", message: msg } : r)),
        );
      }
    }

    setBatchRunning(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl">
          Trouvez la vidéo d'un métier à partir de son code ROME
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Saisissez le code ROME : l'outil retrouve le libellé du métier, propose des vidéos
          YouTube de 4 minutes maximum, récupère leurs liens de partage et rédige un résumé de la
          transcription.
        </p>

        <Link
          to="/collections"
          className="mt-8 flex w-full items-center justify-center gap-4 rounded-2xl bg-primary px-8 py-8 font-display text-2xl font-extrabold text-primary-foreground shadow-lg transition-transform hover:scale-[1.01] sm:text-3xl"
        >
          <Library className="h-10 w-10" />
          Accéder aux collections
        </Link>


        <section className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label
                htmlFor="rome"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Code ROME
              </label>
              <input
                id="rome"
                value={romeCode}
                onChange={(e) => setRomeCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                placeholder="Ex. M1805"
                list="rome-list"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <datalist id="rome-list">
                {Object.entries(ROME_CODES).map(([c, l]) => (
                  <option key={c} value={c}>
                    {l}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="ogr"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Code OGR
              </label>
              <input
                id="ogr"
                value={ogrCode}
                onChange={(e) => setOgrCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                inputMode="numeric"
                placeholder="Ex. 38949"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="rome-label"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Nom du métier ROME
              </label>
              <input
                id="rome-label"
                readOnly
                value={label}
                placeholder="Renseigné automatiquement"
                className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <label
                htmlFor="metier-libre"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Métier (saisie libre) — prioritaire sur le libellé ROME
              </label>
              <input
                id="metier-libre"
                value={metierLibre}
                onChange={(e) => setMetierLibre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSearch();
                }}
                placeholder="Saisissez librement un métier (ex. développeur web, aide-soignant…)"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <p className="text-xs text-muted-foreground">
                Si ce champ est rempli, il est utilisé pour la recherche YouTube à la place du libellé
                ROME. Laissez-le vide pour utiliser le libellé généré.
              </p>
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <label
                htmlFor="search-template"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Formulation de la recherche
              </label>
              <select
                id="search-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {SEARCH_TEMPLATES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("[métier]", searchLabel || "[métier]")}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={loading}
              className="h-12 rounded-md bg-destructive px-8 text-sm font-bold uppercase tracking-wide text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Recherche en cours…" : "Rechercher"}
            </button>
            <button
              type="button"
              onClick={handleResetForm}
              disabled={loading}
              className="h-12 rounded-md border border-border bg-secondary px-6 text-sm font-bold uppercase tracking-wide text-secondary-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              Vider le formulaire
            </button>
          </div>

          {error && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        <section id="resultats" className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-foreground">
            Vidéos trouvées (4 minutes maximum)
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Voici le déroulé complet : les vidéos trouvées par la recherche viennent s'afficher
            dans cet espace, juste sous le formulaire.
          </p>
          <ol className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <li className="rounded-lg border border-border bg-background p-3">
              <span className="font-bold text-foreground">1. Rechercher</span>
              <p className="mt-1">Saisissez un code ROME ou un métier libre, puis cliquez sur « Rechercher ».</p>
            </li>
            <li className="rounded-lg border border-border bg-background p-3">
              <span className="font-bold text-foreground">2. Lire et résumer</span>
              <p className="mt-1">Cliquez sur une vidéo ci-dessous pour la lire ici et obtenir son résumé.</p>
            </li>
            <li className="rounded-lg border border-border bg-background p-3">
              <span className="font-bold text-foreground">3. Copier les liens</span>
              <p className="mt-1">Récupérez le « Lien long » et le « Lien watch » de la vidéo retenue.</p>
            </li>
            <li className="rounded-lg border border-border bg-background p-3">
              <span className="font-bold text-foreground">4. Constituer la collection</span>
              <p className="mt-1">Cochez les vidéos à garder, nommez la collection et enregistrez-la.</p>
            </li>
          </ol>

          {results && results.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((v) => {
                const checked = collection.some((i) => i.video.videoId === v.videoId);
                return (
                  <div
                    key={v.videoId}
                    className={`overflow-hidden rounded-lg border text-left transition-colors ${
                      selected?.videoId === v.videoId
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:border-primary/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void handleSelect(v)}
                      className="block w-full text-left"
                    >
                      {v.thumbnailUrl && (
                        <img
                          src={v.thumbnailUrl}
                          alt={`Miniature de la vidéo ${v.title}`}
                          loading="lazy"
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="space-y-1 p-3 pb-1">
                        <p className="line-clamp-2 text-sm font-semibold text-foreground">
                          {v.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.channelTitle} · {formatDuration(v.durationSeconds)}
                        </p>
                      </div>
                    </button>
                    <label className="flex cursor-pointer items-center gap-2 px-3 pb-3 pt-1 text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={collectionSaving}
                        onChange={() => toggleCollection(v, displayRomeCodePair(romeCode, ogrCode) || "LIBRE", searchLabel)}
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                      />
                      Ajouter à ma collection
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              {loading
                ? "Recherche en cours : les vidéos vont s'afficher ici."
                : "Aucune vidéo affichée pour l'instant : lancez une recherche et les vidéos trouvées apparaîtront dans cet espace."}
            </p>
          )}
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl font-bold text-foreground">
                Ma collection ({collection.length})
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={collection.length === 0}
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      collection.map((i) => `${i.romeCode} — ${i.video.title}\n${i.video.watchLink}`).join("\n\n"),
                    )
                  }
                  className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
                >
                  Copier la liste
                </button>
                <button
                  type="button"
                  disabled={collectionSaving || collection.length === 0}
                  onClick={() => { setCollection([]); setCollectionCode(""); setCollectionMetier(""); setCollectionMessage(null); setCollectionError(null); }}
                  className="h-10 rounded-md border border-border bg-secondary px-4 text-sm font-medium text-secondary-foreground hover:bg-accent"
                >
                  Vider
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-full space-y-1.5 sm:w-80">
                <label htmlFor="collection-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom de la collection</label>
                <input id="collection-name" value={collectionName} disabled={collectionSaving}
                  onChange={(e) => { setCollectionName(e.target.value); setCollectionMessage(null); }}
                  placeholder="Nom de votre collection"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring" />
              </div>
              <div className="w-32 space-y-1.5">
                <label htmlFor="collection-rome" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code ROME</label>
                <input id="collection-rome" value={collectionCode} disabled={collectionSaving}
                  onChange={(e) => { setCollectionCode(e.target.value.toUpperCase()); setCollectionMessage(null); }}
                  placeholder="Ex. M1805"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-ring" />
              </div>
              <div className="w-full space-y-1.5 sm:w-64">
                <label htmlFor="collection-metier" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom du métier ROME</label>
                <input id="collection-metier" value={collectionMetier} disabled={collectionSaving}
                  onChange={(e) => { setCollectionMetier(e.target.value); setCollectionMessage(null); }}
                  placeholder="Nom du métier de la recherche"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring" />
              </div>
              <Button size="lg" className="h-11" disabled={collectionSaving || summarizing || collection.length === 0}
                onClick={() => void handleSaveCollection()}>
                <Save aria-hidden="true" />{collectionSaving ? "Enregistrement en cours…" : "Enregistrer la collection"}
              </Button>
            </div>
            {collectionMessage && <p role="status" className="mt-3 text-sm text-primary">{collectionMessage}</p>}
            {collectionError && <p role="alert" className="mt-3 text-sm text-destructive">{collectionError}</p>}
            {collection.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune vidéo dans la collection pour l'instant : cochez « Ajouter à ma collection » sous une vidéo trouvée.
              </p>
            ) : (
            <ul className="mt-4 divide-y divide-border">
              {collection.map((i) => (
                <li key={i.video.videoId} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{i.video.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.romeCode} {i.romeLabel ? `· ${i.romeLabel}` : ""} · {i.video.watchLink}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(i.video.watchLink)}
                    className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-accent"
                  >
                    Copier
                  </button>
                  <button
                    type="button"
                    disabled={collectionSaving}
                    onClick={() =>
                      { setCollection((prev) => prev.filter((x) => x.video.videoId !== i.video.videoId)); setCollectionMessage(null); }
                    }
                    className="rounded-md border border-border px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
            )}
          </section>

        {selected && (
          <section className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-foreground">Lecteur vidéo</h2>
              <div className="aspect-video overflow-hidden rounded-lg border border-border bg-primary">
                <iframe
                  title={selected.title}
                  src={`https://www.youtube.com/embed/${selected.videoId}?rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              <p className="text-sm font-semibold text-foreground">{selected.title}</p>
              <p className="-mt-3 text-xs text-muted-foreground">
                {selected.channelTitle} · {formatDuration(selected.durationSeconds)}
              </p>
              <Field label="Lien long" value={selected.longLink} placeholder="" />
              <Field label="Lien watch" value={selected.watchLink} placeholder="" />
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-xl font-bold text-foreground">
                Résumé de la transcription
              </h2>
              <div className="min-h-56 whitespace-pre-wrap rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
                {summarizing ? "Lecture de la transcription et rédaction du résumé…" : summary}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!summary || summarizing}
                  className="h-11 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Enregistrer la fiche
                </button>
                {saved && <span className="text-sm font-medium text-primary">Fiche enregistrée</span>}
              </div>
            </div>
          </section>
        )}

        <section className="mt-16 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Recherche multiple par lot
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Saisissez plusieurs codes ROME (séparés par des virgules, espaces ou retours à la
            ligne). Pour chaque métier, l'outil retient la vidéo la plus courte, rédige le résumé et
            enregistre la fiche.
          </p>
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value.toUpperCase())}
            rows={3}
            placeholder="Ex. M1805, K1801, N1103"
            className="mt-4 w-full rounded-md border border-input bg-background p-3 text-sm font-semibold text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="button"
            onClick={() => void handleBatch()}
            disabled={batchRunning}
            className="mt-4 h-12 rounded-md bg-destructive px-8 text-sm font-bold uppercase tracking-wide text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {batchRunning ? "Traitement en cours…" : "Lancer la recherche multiple"}
          </button>

          {batchError && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {batchError}
            </p>
          )}

          {batchRows.length > 0 && (
            <div className="mt-6 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-secondary/60">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Métier</th>
                    <th className="px-4 py-3 font-semibold">Vidéo</th>
                    <th className="px-4 py-3 font-semibold">Lien watch</th>
                    <th className="px-4 py-3 font-semibold">Résumé</th>
                    <th className="px-4 py-3 font-semibold">État</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map((r) => (
                    <tr key={r.romeCode} className="border-b border-border align-top last:border-0">
                      <td className="px-4 py-3 font-semibold text-foreground">{r.romeCode}</td>
                      <td className="px-4 py-3 text-foreground">{r.romeLabel || "—"}</td>
                      <td className="px-4 py-3">
                        {r.video ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(r.video);
                              setSummary(r.summary);
                              if (isRomeCodeFormat(r.romeCode)) {
                                setRomeCode(r.romeCode);
                                setOgrCode("");
                              } else {
                                setOgrCode(r.romeCode);
                                setRomeCode("");
                              }
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                            className="text-left font-medium text-foreground underline-offset-2 hover:underline"
                          >
                            {r.video.title}
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.video ? (
                          <div className="flex items-center gap-2">
                            <span className="max-w-[180px] truncate text-xs text-muted-foreground">
                              {r.video.watchLink}
                            </span>
                            <button
                              type="button"
                              onClick={() => void navigator.clipboard.writeText(r.video!.watchLink)}
                              className="rounded-md border border-border bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground hover:bg-accent"
                            >
                              Copier
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-muted-foreground">
                        <p className="line-clamp-3">{r.summary || "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={
                            r.status === "erreur"
                              ? "text-destructive"
                              : r.status === "terminé"
                                ? "text-primary"
                                : "text-muted-foreground"
                          }
                        >
                          {r.status}
                          {r.message ? ` — ${r.message}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="mt-16 border-t border-border py-8 text-center text-xs text-muted-foreground">
        Outil interne France Travail · Recherche de vidéos métiers par code ROME
      </footer>
    </div>
  );
}
