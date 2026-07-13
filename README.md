# documentations

Central public hub that hosts generated HTML docs for many (private) projects
on GitHub Pages. GitHub plan limits allow only one public Pages repo, so all
project docs live here under per-project subfolders.

**Live site:** https://deccara-tech.github.io/documentations/

## Layout

```
/                       root landing index (auto-generated, lists projects)
/<project>/index.html   each project's docs
DOCS_TEMPLATE_PROMPT.md  the shared docs format standard
```

Each `<project>/` folder holds that project's `*.html`, `docs-engine.js`, and
`docs-styles.css`. The doc format is defined by `DOCS_TEMPLATE_PROMPT.md`.

## How docs get here (do not push by hand)

Docs are published automatically. Source repos tag a release, which triggers a
reusable workflow that copies their `docs/` into this repo and regenerates the
root `index.html`.

- Reusable workflow: `caesariodito/.standardization` →
  `.github/workflows/reusable-publish-docs.yml`
- Each source repo has a thin caller (`.github/workflows/docs.yml`) that runs
  on tag push (`v*`) and authenticates with a fine-grained PAT (repo secret
  `GH_DOCUMENTATIONS`, write access to this repo).

`index.html` is regenerated on every publish — manual edits to it will be
overwritten.

## Pages setup

Settings → Pages → Source: `main` / root.
