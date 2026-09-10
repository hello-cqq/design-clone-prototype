# design-clone-prototype

Community-hosted **interactive prototypes** generated with the
[design-clone](https://github.com/hello-cqq/design-clone) skill.
Every directory here is a playable app prototype, served for free on GitHub Pages —
open one and it behaves like the real app (tap through pages, play journeys, export design assets).

- Browse the gallery: <https://hello-cqq.github.io/design-clone/#gallery>
- Submission spec: [SPEC.md](SPEC.md) (中文版 [SPEC.zh.md](SPEC.zh.md))
- One-command publish from the skill: `node <skill>/scripts/publish.mjs --app <app> --flavor <flavor> --run <runDir>`

## Layout

```
<app_name>/meta.json              app-level: title, description, tags, category, brand_disclaimer?
<app_name>/<flavor>/meta.json     flavor-level: shell, platform, source, license, ip_attestation, version
<app_name>/<flavor>/thumb.png     CI-generated gallery thumbnail
<app_name>/<flavor>/prototype/    the standard design-clone prototype output (playable on Pages)
<app_name>/<flavor>/PROVENANCE.md source & change log
```

`flavor` is a controlled vocabulary, e.g. `mobile-android`, `mobile-ios`, `desktop-mac`,
`tablet-ipad`, `web`, with optional region suffix `-cn` / `-global` (see SPEC.md §1).

## Versions

Each flavor keeps a SemVer `version` in its `meta.json` (mirrored into
`prototype/version.json`). Merging a version bump auto-creates a GitHub Release
tagged `<app>-<flavor>-<version>` with an offline zip of the prototype.
The directory always holds the current version only — history lives in git + Releases.

## License

Repository infrastructure (workflows, scripts, docs): MIT.
Each prototype: per its `<flavor>/meta.json` `license` field (default CC-BY-4.0).
Brand clones are unofficial study replicas; all trademarks belong to their owners.
