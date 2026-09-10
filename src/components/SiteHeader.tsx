import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-primary">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
        <span className="rounded-sm bg-destructive px-2 py-1 text-sm font-black uppercase tracking-tight text-destructive-foreground">
          FT
        </span>
        <div>
          <p className="font-display text-lg font-extrabold leading-none text-primary-foreground">
            France Travail
          </p>
          <p className="text-xs text-primary-foreground/70">Vidéothèque métiers</p>
        </div>
        <nav className="ml-auto flex items-center gap-2 text-sm">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-2 font-semibold text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
            activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}
          >
            Recherche
          </Link>
          <Link
            to="/historique"
            className="rounded-md px-3 py-2 font-semibold text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10"
            activeProps={{ className: "bg-primary-foreground/15 text-primary-foreground" }}
          >
            Historique
          </Link>
        </nav>
      </div>
    </header>
  );
}
