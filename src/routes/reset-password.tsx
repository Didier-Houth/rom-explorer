import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { isValidNewPassword, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Vidéothèque métiers" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte contributeur." },
      { property: "og:title", content: "Nouveau mot de passe — Vidéothèque métiers" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe pour votre compte contributeur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (window.location.hash.includes("type=recovery")) setRecovery(true);
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === "PASSWORD_RECOVERY") setRecovery(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit() {
    if (!isValidNewPassword(password)) { setError(PASSWORD_REQUIREMENTS); return; }
    setBusy(true); setError("");
    const result = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (result.error) { setError("Le mot de passe n’a pas pu être changé. Redemandez un lien depuis « Mot de passe oublié »."); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-md px-6 py-12">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Nouveau mot de passe</h1>
        {!recovery && !done && <p className="mt-2 text-sm text-muted-foreground">Ouvrez cette page avec le lien reçu par e-mail.</p>}
        {done ? <p role="status" className="mt-4 text-primary">Mot de passe changé. Vous êtes connecté.</p> :
          <form className="mt-6 space-y-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
            <div className="relative">
              <input type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" aria-label="Nouveau mot de passe" placeholder="Nouveau mot de passe (8 caractères min.)" className="h-11 w-full rounded-md border border-input bg-background px-3 pr-12 text-sm text-foreground" value={password} onChange={e => setPassword(e.target.value)} />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-9 w-9" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShow(v => !v)}>{show ? <EyeOff /> : <Eye />}</Button>
            </div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer le nouveau mot de passe"}</Button>
            <p className="text-sm text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </form>}
      </main>
    </div>
  );
}
