# CLAUDE.md

Guidance for Claude Code (and other AI assistants) working in this repository.

## Current state of the repo

This repository is named "Laserstern Beschriftungen - Lasergravuren" (a German
laser-engraving/laser-marking business), but the codebase itself is still the
**unmodified Netlify Next.js starter template** (`next-netlify-starter`). None
of the pages, components, or copy have been customized for the business yet —
`pages/index.js` still says "Welcome to my app!" and `components/Footer.js`
still credits Netlify. Treat this as a blank-slate starter: there is no
business-specific content, no CMS integration, and no design system in place
yet. When asked to build out the site, expect to create new pages/components
from scratch rather than modify existing business logic.

## Tech stack

- **Framework**: Next.js 12 (`pages/` router, not the App Router)
- **UI**: React 17
- **Styling**: plain global CSS (`styles/globals.css`) plus CSS Modules
  (e.g. `components/Footer.module.css`)
- **Hosting**: Netlify, via `@netlify/plugin-nextjs`
- **Path aliases**: configured in `jsconfig.json` — `@components/*` →
  `components/*`, `@styles/*` → `styles/*`
- **No TypeScript, no test framework, no linter config, no CSS-in-JS
  library** are set up. Don't assume any of these exist — check before using
  them, and don't add them speculatively.

## Repository structure

```
pages/            Next.js pages-router routes
  _app.js         App wrapper; imports global CSS
  index.js        Home page
components/       Shared React components (PascalCase filenames)
  Header.js
  Footer.js
  Footer.module.css
styles/
  globals.css     Global stylesheet imported once in _app.js
public/           Static assets served from site root (favicon, images)
netlify.toml      Netlify build config (build command + publish dir + plugin)
jsconfig.json     Absolute import aliases for editor/tooling support
renovate.json     Automated dependency-update bot config (extends a shared
                  Netlify-templates config) — don't hand-edit dependency
                  bumps that Renovate should own
```

## Development workflow

```bash
npm install        # install dependencies
npm run dev        # start Next.js dev server at http://localhost:3000
npm run build       # production build
npm run export      # static export (relies on `next export`)
```

There is no test suite, linter, or type-checker configured — there is nothing
to run beyond the above scripts. If you add one, wire it into `package.json`
scripts so it's discoverable.

## Conventions to follow

- Use the `@components/*` and `@styles/*` aliases (from `jsconfig.json`)
  instead of relative `../../` imports when adding new files under
  `components/` or `styles/`.
- Component files are PascalCase function components (`Header.js`,
  `Footer.js`); one component per file.
- Co-locate a component's CSS Module next to it (`Footer.js` +
  `Footer.module.css`) when a component needs scoped styles; use
  `styles/globals.css` only for truly global rules.
- Static assets (images, favicon) go in `public/` and are referenced with a
  root-relative path (e.g. `/favicon.ico`).
- This project deploys to Netlify — avoid introducing features that require
  a persistent Node server (e.g. long-lived WebSocket servers) unless the
  Netlify deployment approach changes; prefer static generation / Netlify
  Functions patterns compatible with `@netlify/plugin-nextjs`.
- Dependency version bumps are normally handled by Renovate
  (`renovate.json`); only hand-edit `package.json` versions when doing more
  than a routine bump (e.g. a major upgrade requiring code changes).

## Notes for future work

Since the site content is still the generic starter, any task to "build the
site" should be treated as new development: define real pages (e.g. home,
services, gallery, contact) and components for the laser-engraving business
rather than assuming existing structure encodes business requirements.
