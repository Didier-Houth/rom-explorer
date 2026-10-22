import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { readRememberedEmail, rememberEmail } from "@/lib/remembered-email";

export function HeaderSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { setEmail(readRememberedEmail(window.localStorage)); }, []);

  async function submit() {
    setBusy(true); setError("");
    const result = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) { setError("Connexion impossible."); return; }
    rememberEmail(window.localStorage, email);
    setPassword("");
  }

  async function forgot() {
    if (!email.trim()) { setError("Saisissez d’abord votre e-mail."); return; }
    setBusy(true); setError("");
    const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    setError(result.error ? "L’envoi a échoué, réessayez plus tard." : "Un lien pour changer le mot de passe a été envoyé par e-mail.");
  }

  const input = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={e => { e.preventDefault(); void submit(); }} aria-label="Se connecter">
      <input type="email" required autoComplete="email" placeholder="E-mail" aria-label="E-mail" className={`${input} w-44`} value={email} onChange={e => setEmail(e.target.value)} />
      <div className="relative">
        <input type={show ? "text" : "password"} required autoComplete="current-password" placeholder="Mot de passe" aria-label="Mot de passe" className={`${input} w-36 pr-9`} value={password} onChange={e => setPassword(e.target.value)} />
        <button type="button" className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center text-muted-foreground" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShow(v => !v)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</Button>
      <button type="button" className="text-xs text-primary-foreground underline" onClick={forgot}>Mot de passe oublié</button>
      {error && <span role="alert" className="w-full text-xs text-primary-foreground">{error}</span>}
    </form>
  );
}
