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

- Servicing is a reusable dashboard section mounted on the existing On-boarding Process page; retain the former URL only as a redirect to avoid duplicate workflow surfaces.
- Servicing stage events are append-only and created by gated in-app actions; historical demo data remains separate from live action timestamps.
- Servicing role flags are workflow simulation only, not authentication or authorization; do not treat them as production security.
