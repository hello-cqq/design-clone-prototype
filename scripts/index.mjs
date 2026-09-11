#!/usr/bin/env node
/**
 * index.mjs —— 重建 index.json（v3 平铺：apps[]），贡献者 git 聚合 + Release 下载量（热度）。
 * 用法: node scripts/index.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { listApps, readMeta, contributors, lastCommitInfo } from "./lib.mjs";

const root = path.resolve(".");
const PAGES = "https://hello-cqq.github.io/design-clone-prototype";
const REPO_API = "https://api.github.com/repos/hello-cqq/design-clone-prototype/releases?per_page=100";

async function downloadsByApp() {
  const map = new Map();
  try {
    const r = await fetch(REPO_API, { headers: { "user-agent": "dc-index", accept: "application/vnd.github+json" } });
    if (!r.ok) return map;
    const rels = await r.json();
    for (const rel of rels) {
      const tag = String(rel.tag_name || "");
      for (const { app } of listApps(root)) {
        if (tag === app || tag.startsWith(app + "-")) {
          const n = (rel.assets || []).reduce((a, b) => a + (b.download_count || 0), 0);
          map.set(app, (map.get(app) || 0) + n);
        }
      }
    }
  } catch {}
  return map;
}

const dl = await downloadsByApp();
const apps = [];
for (const t of listApps(root)) {
  const meta = readMeta(t.dir);
  const contrib = contributors(root, t.app);
  apps.push({
    app: t.app,
    name: meta.name || { en: meta.title || t.app, zh: meta.title || t.app },
    description: meta.description || { en: "", zh: "" },
    tags: meta.tags || [],
    category: meta.category || "",
    shell: meta.shell || "c_mobile",
    version: meta.version || "0.0.0",
    license: meta.license || "CC-BY-4.0",
    source: meta.source || {},
    ip_attestation: meta.ip_attestation || "original",
    brand_disclaimer: meta.brand_disclaimer || null,
    icon: fs.existsSync(path.join(t.dir, "icon.png")) ? `${t.app}/icon.png` : fs.existsSync(path.join(t.dir, "icon.svg")) ? `${t.app}/icon.svg` : null,
    cover: fs.existsSync(path.join(t.dir, "cover.png")) ? `${t.app}/cover.png` : null,
    url: `${PAGES}/${t.app}/prototype/`,
    repo_dir: `https://github.com/hello-cqq/design-clone-prototype/tree/main/${t.app}`,
    downloads: dl.get(t.app) || 0,
    contributors: contrib,
    commits: contrib.reduce((a, b) => a + b.commits, 0),
    updated: lastCommitInfo(root, t.app),
  });
}
apps.sort((a, b) => (b.downloads - a.downloads) || String(b.updated || "").localeCompare(String(a.updated || "")));
const out = { version: 3, updated_at: new Date().toISOString(), apps };
fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`index.json v3: ${apps.length} apps, downloads: ` + apps.map((a) => `${a.app}=${a.downloads}`).join(", "));
