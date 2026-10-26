<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Store named collections as atomic JSON snapshots in `collections_videos`; fixed schema avoids creating dynamic tables from user-entered names and preserves all attached video information together.
- Build collection snapshots with the shared `collections` helper; one mapping keeps saving and readback consistent.
- Store per-video review decisions separately, keyed by collection and video; immutable snapshots remain intact and review access stays public, while saving a collection requires a verified contributor account.
- Derive the general validated collection from approved decisions and snapshots, deduplicating by video and métier references; this keeps membership current without copying or losing attached information.
- Use the shared collection gallery for saved and validated videos; playback and reference display stay consistent.
- Clear the validated collection through a single database RPC that snapshots complete approved videos and resets their decisions atomically; archives are cumulative, read-only snapshots rendered through the shared gallery.
- Store contributor names privately in own-readable profiles, generate immutable identifiers with a database sequence, and enforce collection attribution through RLS; selecting a public identifier must never authorize another account to use it.
- Keep contributor validation groups derived from attributed snapshots and preserve contributor identifiers in atomic archive batches; legacy unassigned data stays unassigned rather than guessing authorship.
- Use one root authentication provider and identity-transition listener for session-aware controls and cache invalidation; defer auth callback queries to avoid session-lock deadlocks.
- Remember only the successfully submitted email locally through the shared email helper; never persist passwords, and always retain verified sign-in for collection saving.
- Validate new passwords through the shared password-policy helper on signup and reset; one policy prevents inconsistent checks without blocking existing sign-ins.
- Collections, reviews and archives are readable only by their owner or an admin (user_roles + has_role); collection pages are client-rendered (ssr: false) so reads carry the session.
