# design-clone-prototype

Community-hosted **interactive prototypes** generated with the
[design-clone](https://github.com/hello-cqq/design-clone) skill.
Every directory here is a playable app prototype, served for free on GitHub Pages —
open one and it behaves like the real app (tap through pages, play journeys, export design assets).

- Browse the gallery: <https://hello-cqq.github.io/design-clone/#gallery>
- Submission spec: [SPEC.md](SPEC.md) (中文版 [SPEC.zh.md](SPEC.zh.md))
- One-command publish from the skill: `node <skill>/scripts/publish.mjs --app <app> --run <runDir>`

## Layout

```
<app_name>/meta.json        app meta (bilingual name/description, tags, shell, license, version…)
<app_name>/icon.png|svg     app icon (REQUIRED, 256px+ square)
<app_name>/cover.png        gallery cover (REQUIRED before merge, cover.mjs composite)
<app_name>/prototype/       the standard design-clone prototype output (playable on Pages)
<app_name>/PROVENANCE.md    source & change log
```

v2 is flat: flavor sub-directories are gone — variants (WeChat pad / desktop / …) are
separate apps, e.g. `wechat`, `wechat-pad`, `wechat-desktop` (see SPEC.md §1).

## Versions

Each app keeps a SemVer `version` in its `meta.json` (mirrored into
`prototype/version.json`). Merging a version bump auto-creates a GitHub Release
tagged `<app>-<version>` with an offline zip of the prototype.
The directory always holds the current version only — history lives in git + Releases.

## License

Repository infrastructure (workflows, scripts, docs): MIT.
Each prototype: per its `<app>/meta.json` `license` field (default CC-BY-4.0).
Brand clones are unofficial study replicas; all trademarks belong to their owners.
