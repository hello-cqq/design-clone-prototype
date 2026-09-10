#!/usr/bin/env node
/**
 * index.mjs —— 重建 index.json（v2 两级索引：app → flavors），贡献者按 git log 聚合。
 * 用法: node scripts/index.mjs   （缩略图缺失请先跑 scripts/thumb.mjs）
 */
import fs from "node:fs";
import path from "node:path";
import { listFlavors, readMeta, readAppMeta, contributors, lastCommitInfo } from "./lib.mjs";

const root = path.resolve(".");
const PAGES = "https://hello-cqq.github.io/design-clone-prototype";
const apps = new Map();

for (const t of listFlavors(root)) {
  const meta = readMeta(t.dir);
  const appMeta = readAppMeta(root, t.app);
  const rel = `${t.app}/${t.flavor}`;
  if (!apps.has(t.app)) {
    apps.set(t.app, {
      app: t.app,
      title: appMeta.title || t.app,
      description: appMeta.description || "",
      tags: appMeta.tags || [],
      category: appMeta.category || "",
      brand_disclaimer: appMeta.brand_disclaimer || null,
      flavors: [],
    });
  }
  const flContrib = contributors(root, rel);
  apps.get(t.app).flavors.push({
    flavor: t.flavor,
    shell: meta.shell,
    platform: meta.platform || "",
    version: meta.version || "0.0.0",
    license: meta.license || "CC-BY-4.0",
    source: meta.source || {},
    ip_attestation: meta.ip_attestation || "original",
    thumb: fs.existsSync(path.join(t.dir, "thumb.png")) ? `${rel}/thumb.png` : null,
    url: `${PAGES}/${rel}/prototype/`,
    contributors: flContrib,
    commits: flContrib.reduce((a, b) => a + b.commits, 0),
    updated: lastCommitInfo(root, rel),
  });
}

const out = {
  version: 2,
  updated_at: new Date().toISOString(),
  apps: [...apps.values()].map((a) => {
    const seen = new Map();
    for (const f of a.flavors) for (const c of f.contributors) {
      const e = seen.get(c.name) || { ...c, commits: 0 };
      e.commits += c.commits; seen.set(c.name, e);
    }
    a.contributors = [...seen.values()].sort((x, y) => y.commits - x.commits);
    a.updated = a.flavors.map((f) => f.updated).filter(Boolean).sort().pop() || null;
    a.flavors.sort((x, y) => String(x.flavor).localeCompare(String(y.flavor)));
    return a;
  }).sort((a, b) => String(b.updated || "").localeCompare(String(a.updated || ""))),
};

fs.writeFileSync(path.join(root, "index.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`index.json: ${out.apps.length} apps / ${out.apps.reduce((a, b) => a + b.flavors.length, 0)} flavors`);
