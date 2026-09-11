#!/usr/bin/env node
/**
 * validate.mjs —— pr-gate（SPEC v2）：对 PR 变更涉及的 <app> 跑结构/规范/隐私/静态冒烟。
 * 用法: node scripts/validate.mjs [--base <git-ref>]（无 --base 时校验全部 app）
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  APP_RE, SHELLS, LICENSES_OK, ATTEST, FORBIDDEN, MAX_BYTES,
  listApps, readMeta, dirBytes, walkRel, serve, semver,
} from "./lib.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".");
const baseIdx = process.argv.indexOf("--base");
const base = baseIdx > 0 ? process.argv[baseIdx + 1] : null;

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);

let targets = listApps(root);
if (base) {
  let changed = [];
  try { changed = execSync(`git diff --name-only ${base} HEAD`, { encoding: "utf8" }).split("\n").filter(Boolean); } catch { changed = []; }
  const touched = new Set(changed.map((c) => (c.split("/")[0] || "")).filter(Boolean));
  targets = targets.filter((t) => touched.has(t.app));
  console.log(`validate: 变更 app ${touched.size} 个，命中完整 app 目录 ${targets.length} 个`);
}

const PII = [/1[3-9]\d{9}/, /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/];
const bi = (v) => v && typeof v === "object" && String(v.en || "").trim() && String(v.zh || "").trim();

for (const t of targets) {
  const tag = t.app;
  if (!APP_RE.test(t.app)) fail(`${tag}: app 名不合 ^[a-z0-9][a-z0-9-]{1,39}$`);
  const meta = readMeta(t.dir);
  if (!bi(meta.name)) fail(`${tag}: meta.name 需 {en,zh} 双语非空`);
  if (!bi(meta.description)) fail(`${tag}: meta.description 需 {en,zh} 双语非空`);
  if (!Array.isArray(meta.tags) || !meta.tags.length) fail(`${tag}: meta.tags 至少 1 个（画廊筛选/搜索依赖）`);
  if (!SHELLS.includes(meta.shell)) fail(`${tag}: meta.shell 缺失或非法（${SHELLS.join("|")}）`);
  if (!semver(meta.version)) fail(`${tag}: meta.version 非 SemVer`);
  if (!meta.license) warns.push(`${tag}: 缺 license，按 CC-BY-4.0 处理`);
  else if (!LICENSES_OK.test(meta.license)) fail(`${tag}: license 不在白名单`);
  if (!ATTEST.includes(meta.ip_attestation)) fail(`${tag}: ip_attestation 必须为 ${ATTEST.join("|")}`);
  if (meta.ip_attestation !== "original" && !meta.brand_disclaimer) fail(`${tag}: 非原创必须带 brand_disclaimer`);
  if (!meta.source || !meta.source.kind) fail(`${tag}: 缺 source{kind}`);
  const bytes = dirBytes(t.dir);
  if (bytes > MAX_BYTES) fail(`${tag}: ${Math.round(bytes / 1e6)}MB 超 80MB 上限`);
  for (const rel of walkRel(t.dir)) {
    const norm = rel.split(path.sep).join("/");
    if (FORBIDDEN.some((r) => r.test("/" + norm))) fail(`${tag}: 禁名单文件 ${norm}`);
    if (/^prototype\/views\//.test(norm) === false && /(^|\/)(mobile|tablet|desktop|web)(-android|-ios|-ipad|-mac|-win|-linux)?(-cn|-global)?\/prototype\//.test("/" + norm)) fail(`${tag}: 检测到 flavor 子目录残留（v2 已废）`);
  }
  try {
    const vj = JSON.parse(fs.readFileSync(path.join(t.dir, "prototype", "version.json"), "utf8"));
    if (vj.version !== meta.version) fail(`${tag}: prototype/version.json (${vj.version}) ≠ meta.version (${meta.version})`);
    if (vj.app !== t.app) fail(`${tag}: version.json app 不符`);
  } catch { fail(`${tag}: 缺 prototype/version.json（publish.mjs 生成）`); }
  const viewsDir = path.join(t.dir, "prototype", "views");
  if (fs.existsSync(viewsDir)) {
    for (const f of fs.readdirSync(viewsDir)) {
      const s = fs.readFileSync(path.join(viewsDir, f), "utf8");
      for (const re of PII) { const m = s.match(re); if (m) fail(`${tag}: 视图 ${f} 含疑似 PII ${m[0].slice(0, 6)}…`); }
    }
  }
  if (base) {
    let changedProto = false, changedMeta = false;
    try {
      const diff = execSync(`git diff --name-only ${base} HEAD -- "${t.app}"`, { encoding: "utf8" }).split("\n").filter(Boolean);
      changedProto = diff.some((d) => d.includes("/prototype/"));
      changedMeta = diff.some((d) => d.endsWith("meta.json"));
    } catch {}
    if (changedProto && !changedMeta) fail(`${tag}: 改了 prototype/** 但未 bump meta.version（SPEC §10）`);
  }
}

if (targets.length) {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  for (const t of targets) {
    const { srv, base: url } = await serve(path.join(t.dir, "prototype"));
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 80)));
    try {
      await page.goto(url + "/index.html", { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200);
      const pages = await page.evaluate(() => ((window.DC && window.DC.pages) || []).length);
      if (!pages) fail(`${t.app}: 冒烟失败 window.DC.pages 为空`);
      const reacted = await page.evaluate(async () => {
        const el = document.querySelector('#dc-stage [data-act="toast"],#dc-stage [data-act="toggle"],#dc-stage [data-act="sheet"],#dc-stage [data-act="dialog"],#dc-stage [data-act="radio"],#dc-stage [data-act="checkbox"],#dc-stage [data-goto]');
        if (!el) return false;
        const before = document.body.innerHTML.length;
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 600));
        return document.body.innerHTML.length !== before || !!document.querySelector("#dc-rt-toast,[role=dialog],.dc-rt-sheet");
      });
      if (!reacted) fail(`${t.app}: 冒烟失败 首个控件点击无反应`);
      if (errs.length) fail(`${t.app}: 冒烟 pageerror: ${errs[0]}`);
    } catch (e) {
      fail(`${t.app}: 冒烟异常 ${String(e.message).slice(0, 100)}`);
    }
    await page.close();
    srv.close();
  }
  await browser.close();
}

for (const w of warns) console.log("WARN", w);
if (fails.length) { console.log("VALIDATE FAIL:\n- " + fails.join("\n- ")); process.exit(1); }
console.log(`VALIDATE OK (${targets.length} apps)`);
