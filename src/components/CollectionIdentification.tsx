import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { readRememberedEmail, rememberEmail } from "@/lib/remembered-email";
import { isValidNewPassword, PASSWORD_REQUIREMENTS } from "@/lib/password-policy";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { contributorLetters, contributorPrefix, canSelectContributor, type Contributor } from "@/lib/contributors";
import { useContributorAuth } from "./ContributorAuth";

export function CollectionIdentification({ open, onOpenChange, onIdentified }: { open: boolean; onOpenChange: (open: boolean) => void; onIdentified: (profile: Contributor) => void }) {
  const { user, profile, refresh } = useContributorAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [matches, setMatches] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const remembered = readRememberedEmail(window.localStorage);
    setSavedEmail(remembered);
    setEmail(remembered);
  }, []);
  useEffect(() => {
    if (!open) { setShowPassword(false); setPassword(""); return; }
    setError(""); setMessage("");
    if (profile) { setFirstName(profile.first_name); setLastName(profile.last_name); setPrefix(profile.identifier); setSelected(profile.identifier); }
  }, [open, profile]);
  useEffect(() => {
    if (!open || !user || prefix.length < 2) { setMatches([]); return; }
    let current = true;
    const timer = setTimeout(async () => {
      const result = await supabase.rpc("find_contributor_identifiers", { prefix });
      if (current) { setMatches((result.data ?? []).map(row => row.identifier)); if (result.error) setError("La recherche des identifiants a échoué."); }
    }, 250);
    return () => { current = false; clearTimeout(timer); };
  }, [prefix, open, user]);

  async function submit() {
    setBusy(true); setError(""); setMessage("");
    try {
      if (!user) {
        if (signup) {
          if (!isValidNewPassword(password)) throw new Error(PASSWORD_REQUIREMENTS);
          if (contributorLetters(firstName).length < 2 || contributorLetters(lastName).length < 4) throw new Error("Saisissez au moins deux lettres pour le prénom et quatre pour le nom.");
          const result = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { first_name: firstName, last_name: lastName } } });
          if (result.error) throw result.error;
          setSavedEmail(rememberEmail(window.localStorage, email)); setEditingEmail(false);
          if (!result.data.session) { setMessage("Consultez votre e-mail pour confirmer votre inscription, puis connectez-vous. Votre collection reste sur cette page."); setSignup(false); return; }
        } else {
          const result = await supabase.auth.signInWithPassword({ email, password });
          if (result.error) throw new Error("Connexion impossible. Vérifiez votre e-mail, votre mot de passe et la confirmation de votre inscription.");
          setSavedEmail(rememberEmail(window.localStorage, email)); setEditingEmail(false);
        }
      }
      const verified = await supabase.auth.getUser();
      if (!verified.data.user) throw new Error("Connectez-vous avant de poursuivre.");
      let result = await supabase.from("profiles").select("id,identifier,first_name,last_name").eq("id", verified.data.user.id).maybeSingle();
      if (!result.data) {
        const registration = await supabase.rpc("register_contributor", { first_name: firstName, last_name: lastName });
        if (registration.error) throw new Error(registration.error.message);
        result = await supabase.from("profiles").select("id,identifier,first_name,last_name").eq("id", verified.data.user.id).single();
      }
      if (!result.data) throw new Error("Votre identifiant n’a pas pu être retrouvé.");
      await refresh();
      if (selected && !canSelectContributor(selected, result.data.identifier)) throw new Error("Cet identifiant appartient à un autre compte. Choisissez votre propre identifiant.");
      setSelected(result.data.identifier);
      onIdentified(result.data);
    } catch (e) { setError(e instanceof Error ? e.message : "Identification impossible."); }
    finally { setBusy(false); }
  }
  const inputClass = "h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
    <DialogHeader><DialogTitle>Identifier l’auteur de la collection</DialogTitle><DialogDescription>{profile ? `Connecté : ${profile.identifier}` : "Une connexion est nécessaire pour enregistrer une collection sous votre identifiant."}</DialogDescription></DialogHeader>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">Prénom<input className={inputClass} value={firstName} maxLength={100} onChange={e => { setFirstName(e.target.value); setPrefix(contributorPrefix(e.target.value, lastName)); setSelected(""); }} /></label>
      <label className="space-y-1 text-sm font-medium">Nom<input className={inputClass} value={lastName} maxLength={100} onChange={e => { setLastName(e.target.value); setPrefix(contributorPrefix(firstName, e.target.value)); setSelected(""); }} /></label>
    </div>
    <label className="space-y-1 text-sm font-medium">Rechercher un identifiant<input className={inputClass} value={prefix} maxLength={12} onChange={e => { setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setSelected(""); }} /></label>
    <div className="space-y-2">
      {matches.map(identifier => <Button key={identifier} className="w-full justify-start" variant={selected === identifier ? "default" : "outline"} onClick={() => { setSelected(identifier); setSignup(false); if (profile && canSelectContributor(identifier, profile.identifier)) onIdentified(profile); }}>{identifier}</Button>)}
      {prefix.length >= 2 && matches.length === 0 && <p className="text-sm text-muted-foreground">Aucun identifiant trouvé.</p>}
      {!user && <Button variant="outline" onClick={() => { setSignup(true); setSelected(""); setError(""); setShowPassword(false); }}>S’inscrire</Button>}
    </div>
    {!user && <form className="space-y-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
      {signup || !savedEmail || editingEmail ? <label className="block space-y-1 text-sm font-medium">Adresse e-mail<input type="email" autoComplete="email" required className={inputClass} value={email} onChange={e => setEmail(e.target.value)} /></label> : <div className="flex min-w-0 items-center justify-between gap-2"><p className="min-w-0 break-all text-sm text-muted-foreground">{savedEmail}</p><Button type="button" variant="link" onClick={() => setEditingEmail(true)}>Modifier l’e-mail</Button></div>}
      <div className="space-y-1"><label htmlFor="contributor-password" className="text-sm font-medium">Mot de passe</label><div className="relative"><input id="contributor-password" type={showPassword ? "text" : "password"} autoComplete={signup ? "new-password" : "current-password"} required minLength={8} className={`${inputClass} pr-12`} value={password} onChange={e => setPassword(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 h-9 w-9" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</Button></div></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Identification en cours…" : signup ? "Créer mon compte" : "Se connecter et enregistrer"}</Button>
      {signup && <p className="text-sm text-muted-foreground">{PASSWORD_REQUIREMENTS}</p>}
      <div className="flex flex-wrap gap-2">{(["google", "lovable"] as const).map(provider => <Button key={provider} type="button" variant="outline" onClick={async () => { const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }); if (result.error) setError("La connexion n’a pas abouti."); }}>Connexion {provider === "google" ? "Google" : "Lovable"}</Button>)}</div>
    </form>}
    {user && <Button disabled={busy} onClick={() => void submit()}>{busy ? "Identification en cours…" : "Confirmer mon identifiant et enregistrer"}</Button>}
    {message && <p role="status" className="text-sm text-primary">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </DialogContent></Dialog>;
}