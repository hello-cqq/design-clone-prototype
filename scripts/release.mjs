#!/usr/bin/env node
/**
 * release.mjs —— main 推送后：检测 meta.version 变化的 flavor → 打 tag <app>-<version>
 * 并发布 GitHub Release（资产=该 flavor prototype 离线 zip，正文=PROVENANCE 变更段+贡献者）。
 * 用法: node scripts/release.mjs [--from <ref>]   （CI: --from ${{ github.event.before }}）
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { listFlavors, readMeta, contributors, zipDir } from "./lib.mjs";

const root = path.resolve(".");
const fromIdx = process.argv.indexOf("--from");
const from = fromIdx > 0 ? process.argv[fromIdx + 1] : null;
const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "dcp-rel-"));

const changed = [];
for (const t of listFlavors(root)) {
  if (!from) { changed.push(t); continue; }
  let diff = "";
  try { diff = execSync(`git -C "${root}" diff --name-only ${from} HEAD -- "${t.app}/meta.json"`, { encoding: "utf8" }); } catch { continue; }
  if (!diff.trim()) continue;
  let oldVer = null;
  try { oldVer = JSON.parse(execSync(`git -C "${root}" show ${from}:${t.app}/meta.json`, { encoding: "utf8" })).version; } catch {}
  const ver = readMeta(t.dir).version;
  if (oldVer !== ver) changed.push(t);
}

if (!changed.length) { console.log("release: 无版本变更"); process.exit(0); }

for (const t of changed) {
  const meta = readMeta(t.dir);
  const tag = `${t.app}-${meta.version}`;
  const exists = (() => { try { execSync(`git -C "${root}" rev-parse -q --verify refs/tags/${tag}`, { stdio: "ignore" }); return true; } catch { return false; } })();
  if (exists) { console.log("release: tag 已存在跳过", tag); continue; }
  const zip = path.join(tmp, `${tag}.zip`);
  zipDir(path.join(t.dir, "prototype"), zip);
  const prov = (() => { try { return fs.readFileSync(path.join(t.dir, "PROVENANCE.md"), "utf8"); } catch { return ""; } })();
  const contrib = contributors(root, t.app).map((c) => `- ${c.name}${c.login ? ` (@${c.login})` : ""} · ${c.commits} commits`).join("\n") || "- (unknown)";
  const notes = `## ${t.app} v${meta.version}\n\n${prov.split("\n").slice(0, 30).join("\n")}\n\n### Contributors\n${contrib}\n\nLicense: ${meta.license || "CC-BY-4.0"} · Play online: https://hello-cqq.github.io/design-clone-prototype/${t.app}/prototype/\n`;
  execSync(`git -C "${root}" tag -a "${tag}" -m "${tag}"`, { stdio: "inherit" });
  execSync(`git -C "${root}" push origin "${tag}"`, { stdio: "inherit" });
  const notesFile = path.join(tmp, `${tag}-notes.md`);
  fs.writeFileSync(notesFile, notes);
  execSync(`gh release create "${tag}" "${zip}" --repo hello-cqq/design-clone-prototype --title "${tag}" --notes-file "${notesFile}"`, { stdio: "inherit" });
  console.log("release:", tag);
}
fs.rmSync(tmp, { recursive: true, force: true });
