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
- Store per-video review decisions separately, keyed by collection and video; immutable snapshots remain intact and public review access follows the existing account-free application model.
- Derive the general validated collection from approved decisions and snapshots, deduplicating by video and métier references; this keeps membership current without copying or losing attached information.
- Use the shared collection gallery for saved and validated videos; playback and reference display stay consistent.
