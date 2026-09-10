import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { lookupRomeLabel, normalizeRomeCode, ROME_CODES } from "@/lib/rome-codes";
import { searchRomeVideos, summarizeVideo, type VideoResult } from "@/lib/youtube.functions";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

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
  message?: string;
};

function Index() {
  const search = useServerFn(searchRomeVideos);
  const summarize = useServerFn(summarizeVideo);

  const [code, setCode] = useState("");
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

  const label = useMemo(() => lookupRomeLabel(code) ?? "", [code]);

  async function handleSearch() {
    setError(null);
    setResults(null);
    setSelected(null);
    setSummary("");
    setTranscript(null);
    setSaved(false);
    if (!label) {
      setError("Ce code ROME n'est pas reconnu. Vérifiez la saisie (exemple : M1805).");
      return;
    }
    setLoading(true);
    try {
      const items = await search({ data: { romeCode: normalizeRomeCode(code), romeLabel: label } });
      setResults(items);
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
          romeLabel: label,
          description: video.description,
        },
      });
      setSummary(res.summary);
      setTranscript(res.transcript);
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
      rome_code: normalizeRomeCode(code),
      rome_label: label,
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

        <section className="mt-10 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="rome"
                className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                Code ROME
              </label>
              <input
                id="rome"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
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
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nom du métier ROME
              </label>
              <input
                readOnly
                value={label}
                placeholder="Renseigné automatiquement"
                className="h-11 w-full rounded-md border border-border bg-secondary px-3 text-sm text-foreground outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={loading}
            className="mt-5 h-12 rounded-md bg-destructive px-8 text-sm font-bold uppercase tracking-wide text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Recherche en cours…" : "Rechercher"}
          </button>

          {error && (
            <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        {results && results.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display text-xl font-bold text-foreground">
              Vidéos de moins de 4 minutes
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((v) => (
                <button
                  key={v.videoId}
                  type="button"
                  onClick={() => void handleSelect(v)}
                  className={`overflow-hidden rounded-lg border text-left transition-colors ${
                    selected?.videoId === v.videoId
                      ? "border-primary bg-secondary"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  {v.thumbnailUrl && (
                    <img
                      src={v.thumbnailUrl}
                      alt={`Miniature de la vidéo ${v.title}`}
                      loading="lazy"
                      className="h-32 w-full object-cover"
                    />
                  )}
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{v.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.channelTitle} · {formatDuration(v.durationSeconds)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

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
                              setCode(r.romeCode);
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
