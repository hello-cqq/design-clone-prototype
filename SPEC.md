# Submission SPEC (v1)

Every prototype in this repository MUST follow this spec. CI (`pr-gate.yml`) enforces the
machine-checkable rules; maintainers enforce the rest during review. **No auto-merge: a
maintainer approves every PR.**

## 1. Directory & naming

```
<app_name>/meta.json
<app_name>/<flavor>/meta.json
<app_name>/<flavor>/thumb.png        (CI generates if missing)
<app_name>/<flavor>/prototype/       (standard design-clone output)
<app_name>/<flavor>/PROVENANCE.md
```

- `app_name`: kebab-case, `^[a-z0-9][a-z0-9-]{1,39}$`.
- `flavor`: controlled vocabulary, CI-validated:
  `^(mobile|tablet|desktop|web)(-(android|ios|ipad|mac|win|linux))?(-(cn|global))?$`
  Bare forms (`mobile`, `web`, …) only when the platform is irrelevant.
  Examples: `wechat/mobile-android`, `wechat/desktop-mac`, `wechat/mobile-android-global`,
  `aliyun-console/web`, `lark/desktop-mac`, `petpark/mobile`.
- One current version per flavor. **No multi-version directories** — history = git + Releases.

## 2. `prototype/` content whitelist

Allowed: `index.html`, `views/`, `assets/`, `inspector.*`, `runtime.*`, `zipstore.*`,
`utilities.css`, `paths.json`, `journeys.json`, `products.json`, `annotations.json`,
`variants/`, `design/`, `pages/`, `version.json`, `appicon/`.
Forbidden (CI fails): `node_modules/`, `export/`, `qa/`, `capture/`, videos (`*.mp4|webm|mov`),
`.cache/`, `*.map`, font binaries (`*.ttf|otf|woff2?`), any third-party runtime CDN reference
(the prototype must work fully offline).

## 3. `meta.json` schema

App level: `title` (required), `description`, `tags[]`, `category`, `brand_disclaimer`
(required when `ip_attestation != original` for any flavor).
Flavor level: `shell` ∈ {c_mobile, c_tablet, c_desktop, c_browser} — must match the flavor
form (mobile*→c_mobile, tablet*→c_tablet, desktop*→c_desktop, web→c_browser);
`platform`, `source {kind: app|web|video|link|original, ref}`, `license` (default CC-BY-4.0),
`ip_attestation` ∈ {original, licensed, public-material} + `attestation_note`,
`version` (SemVer), `created_at`.

## 4. Quality gates BEFORE submitting (publish.mjs enforces, PR body embeds the summary)

`interact` dead=0 · `inspect` fail=0 · `ui-smoke` fail=0 · `privacy` green, on the source run.
CI additionally runs a static smoke (boot, pages>0, no page errors, one control reacts).

## 5. Privacy red lines

No real personal names, phone numbers, IDs, licenses plates, or real human faces.
Chat/sample text must be fictional; uploader/creator nicknames anonymized.
Enforced by the skill's `privacy.mjs` + PII grep before publish; CI re-greps phone/ID patterns.

## 6. IP rules

Three-way attestation (§3). Brand clones MUST carry the app-level `brand_disclaimer`
(auto-inserted by publish.mjs): unofficial study replica, trademarks belong to owners,
no affiliation. No full official asset packs (font binaries, icon packs); icons must be
self-drawn SVG or small crops with source noted in PROVENANCE.md.

## 7. Size & assets

≤ 80 MB per flavor (CI fails). Images: jpg/png/webp/svg only. System font stacks only.

## 8. Licensing

Prototype code: MIT. Assets & design: per flavor `license` (default CC-BY-4.0).
Repository infrastructure: MIT.

## 9. PR flow

Branch `publish/<app>-<flavor>-<timestamp>`; title `publish(<app>/<flavor>): <title>`.
One PR may carry several flavors of the same app. CI gates must be green; a maintainer
approves and merges (never auto-merge). After merge: `index.yml` rebuilds `index.json`
(contributors via `git log -- <app>/<flavor>`) and generates missing thumbnails;
`release.yml` tags `<app>-<flavor>-<version>` and publishes a Release with an offline zip.

## 10. Updates, versions & takedown

Updating a flavor = PR overwriting the same directory; `PROVENANCE.md` gains a change line;
changing `prototype/**` without bumping `meta.version` fails CI (silent overwrite ban).
Takedown: file the issue template; maintainers respond within 48 h.
