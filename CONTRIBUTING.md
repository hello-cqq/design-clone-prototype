# Contributing a prototype

1. Generate it with the skill: clone your app/site, pass the gates
   (`interact`, `inspect`, `ui-smoke`, `privacy` all green).
2. Publish (creates the PR for you):
   `node <design-clone-skill>/scripts/publish.mjs --run <runDir> --app <app> --title "<title>"`
3. Fill the PR template (IP attestation is mandatory), wait for CI, then maintainer review.
   No auto-merge — a human approves every prototype.
4. After merge your prototype is live at
   `https://hello-cqq.github.io/design-clone-prototype/<app>/prototype/`
   and appears in the gallery with your avatar (from git authorship).

Rules in one breath: follow [SPEC.md](SPEC.md); no real personal data; no official asset packs;
≤80 MB; bump `version` whenever `prototype/**` changes.
