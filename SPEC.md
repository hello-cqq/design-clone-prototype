# Submission SPEC (v2)

v2 changes: **flavor sub-directories are gone**. Every app is a flat directory; variants
(WeChat pad / WeChat desktop / …) are separate apps. Heat = release download counts.
Machine-checkable rules are enforced by CI (`pr-gate.yml`); the rest by maintainer review.
**No auto-merge: a maintainer approves every PR.** 中文版：[SPEC.zh.md](SPEC.zh.md)

## 1. Directory & naming

```
<app_name>/meta.json        app meta (bilingual name/description, tags, shell, license, version…)
<app_name>/icon.png|svg     app icon (REQUIRED, 256px+ square; pr-gate fails when missing)
<app_name>/cover.png        gallery cover (REQUIRED before merge: 1200×800 strict 3:2, ≤300KB, scene-matched composite via skill cover.mjs; CI never auto-generates)
<app_name>/prototype/       the standard design-clone prototype output (playable on Pages)
<app_name>/PROVENANCE.md    source & change log
```

- `files.json` / `knowledge/` are generated runtime companions (registered here, M98).
- `app_name`: kebab-case `^[a-z0-9][a-z0-9-]{1,39}$`. Variants are separate apps:
  `wechat` (phone), `wechat-pad`, `wechat-desktop`, `wechat-ios`, …
- One current version per app. No multi-version directories — history = git + Releases.

## 1b. Gallery assets (hard-enforced by CI)

Every app MUST carry, at app root:
- `cover.png` — 1200×800 (strict 3:2), ≤300KB, scene-matched composite (category palette + device frame + real first-view screenshot + icon + bilingual name + tags). Generate with the skill: `node <skill>/scripts/gen/cover.mjs --run <run> --base <url>`.
- `icon.png` — ≥256px square; real app icon when obtainable (input / web favicon+manifest / mac icns), else generated (`gen/appicon.mjs`).
- `meta.json` — bilingual `name`/`description`, 3–6 `tags` (CI `pr-gate` fails otherwise).

## 2. `prototype/` content whitelist

Allowed: `index.html`, `views/`, `assets/`, `inspector.*`, `runtime.*`, `zipstore.*`,
`utilities.css`, `paths.json`, `journeys.json`, `products.json`, `annotations.json`,
`variants/`, `design/`, `pages/`, `version.json`, `appicon/`.
Forbidden (CI fails): `node_modules/`, `export/`, `qa/`, `capture/`, videos, `.cache/`,
`*.map`, font binaries, any third-party runtime CDN reference (must work fully offline).

## 3. `meta.json` schema (v2)

Required: `name {en, zh}`, `description {en, zh}`, `tags[]` (3–6, lowercase kebab; used by
gallery search & filters), `shell` ∈ {c_mobile, c_tablet, c_desktop, c_browser},
`source {kind: app|web|video|link|original, ref}`, `license` (default CC-BY-4.0),
`ip_attestation` ∈ {original, licensed, public-material} (+ `attestation_note`),
`version` (SemVer), `created_at`.
Optional: `category`, `icon`, `cover`, `brand_disclaimer` (required when any
`ip_attestation != original`).
Bilingual text is displayed by the official site per visitor language — write both, well.

## 4. Quality gates BEFORE submitting (publish.mjs enforces; PR body embeds the summary)

`interact` dead=0 · `inspect` fail=0 · `ui-smoke` fail=0 · `privacy` green on the source run.
CI adds a static smoke (boot, pages>0, no page errors, one non-nav control reacts).

## 5. Privacy red lines

No real personal names, phones, IDs, plates, or real human faces. Chat/sample text fictional;
uploader/creator nicknames anonymized. Enforced by skill `privacy.mjs` + CI PII grep.

## 6. IP rules

Three-way attestation (§3). Non-original apps MUST carry `brand_disclaimer` (auto-inserted by
publish.mjs): unofficial study replica, trademarks belong to owners. No official asset packs;
icons self-drawn SVG or small sourced crops noted in PROVENANCE.md.

## 7. Size & assets

≤ 80 MB per app. Images jpg/png/webp/svg only. System font stacks only.

## 8. Licensing

Prototype code MIT; assets & design per `license` (default CC-BY-4.0); repo infrastructure MIT.

## 9. PR flow & releases

Branch `publish/<app>-<timestamp>`; title `publish(<app>): <name.en>`. CI gates green →
maintainer merges (never auto-merge). On merge: `index.yml` rebuilds `index.json`
(contributors via `git log -- <app>`, cover if missing, **download counts from Release
assets**) and `release.yml` tags `<app>-<version>` publishing a Release with the offline zip.

## 10. Heat, updates & takedown

Heat = sum of GitHub Release zip `download_count` for the app's tags (the only honest signal
available on a static platform); gallery cards show it, Home Top-4 sorts by it, the detail
download button carries it. Updating an app = PR overwriting the directory + PROVENANCE line;
changing `prototype/**` without bumping `version` fails CI. Takedown: issue template, 48 h.
