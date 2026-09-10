#!/usr/bin/env node
/**
 * validate.mjs —— pr-gate：对 PR 变更涉及的 <app>/<flavor> 跑结构/规范/隐私/静态冒烟。
 * 用法: node scripts/validate.mjs [--base <git-ref>]   （无 --base 时校验仓内全部 flavor）
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  FLAVOR_RE, APP_RE, SHELL_BY_FORM, SHELLS, LICENSES_OK, ATTEST, FORBIDDEN, MAX_BYTES,
  listFlavors, readMeta, readAppMeta, dirBytes, walkRel, serve, semver,
} from "./lib.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : ".");
const baseIdx = process.argv.indexOf("--base");
const base = baseIdx > 0 ? process.argv[baseIdx + 1] : null;

const fails = [];
const warns = [];
const fail = (m) => fails.push(m);

let targets = listFlavors(root);
if (base) {
  let changed = [];
  try { changed = execSync(`git diff --name-only ${base} HEAD`, { encoding: "utf8" }).split("\n").filter(Boolean); } catch { changed = []; }
  const touched = new Set();
  for (const c of changed) {
    const m = c.match(/^([^/]+)\/([^/]+)\//);
    if (m) touched.add(m[1] + "/" + m[2]);
  }
  targets = targets.filter((t) => touched.has(t.app + "/" + t.flavor));
  console.log(`validate: ${touched.size} 个变更 flavor，命中 ${targets.length} 个完整 flavor 目录`);
}

const PII = [/1[3-9]\d{9}/, /\b\d{6}(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/];

for (const t of targets) {
  const tag = `${t.app}/${t.flavor}`;
  if (!APP_RE.test(t.app)) fail(`${tag}: app 名不合 ^[a-z0-9][a-z0-9-]{1,39}$`);
  const fm = t.flavor.match(FLAVOR_RE);
  if (!fm) { fail(`${tag}: flavor 不在受控词表（见 SPEC §1）`); continue; }
  const meta = readMeta(t.dir);
  const appMeta = readAppMeta(root, t.app);
  if (!appMeta.title) fail(`${t.app}: 缺 app 级 meta.title`);
  const form = fm[1];
  if (!SHELLS.includes(meta.shell)) fail(`${tag}: meta.shell 缺失或非法（${SHELLS.join("|")}）`);
  else if (meta.shell !== SHELL_BY_FORM[form]) fail(`${tag}: shell ${meta.shell} 与 flavor 形态 ${form} 不匹配（应 ${SHELL_BY_FORM[form]}）`);
  if (!semver(meta.version)) fail(`${tag}: meta.version 非 SemVer`);
  if (!meta.license) warns.push(`${tag}: 缺 license，按 CC-BY-4.0 处理`);
  else if (!LICENSES_OK.test(meta.license)) fail(`${tag}: license 不在白名单`);
  if (!ATTEST.includes(meta.ip_attestation)) fail(`${tag}: ip_attestation 必须为 ${ATTEST.join("|")}`);
  if (meta.ip_attestation !== "original" && !appMeta.brand_disclaimer) fail(`${t.app}: 非原创 flavor 必须带 app 级 brand_disclaimer`);
  if (!meta.source || !meta.source.kind) fail(`${tag}: 缺 source{kind}`);
  // 体积与禁名单
  const bytes = dirBytes(t.dir);
  if (bytes > MAX_BYTES) fail(`${tag}: ${Math.round(bytes / 1e6)}MB 超 80MB 上限`);
  for (const rel of walkRel(t.dir)) {
    const norm = rel.split(path.sep).join("/");
    if (FORBIDDEN.some((r) => r.test("/" + norm))) fail(`${tag}: 禁名单文件 ${norm}`);
  }
  // 版本同步：prototype/version.json 与 meta.version 一致
  try {
    const vj = JSON.parse(fs.readFileSync(path.join(t.dir, "prototype", "version.json"), "utf8"));
    if (vj.version !== meta.version) fail(`${tag}: prototype/version.json (${vj.version}) ≠ meta.version (${meta.version})`);
    if (vj.app !== t.app || vj.flavor !== t.flavor) fail(`${tag}: version.json app/flavor 不符`);
  } catch { fail(`${tag}: 缺 prototype/version.json（publish.mjs 生成）`); }
  // 隐私 grep（视图文本）
  const viewsDir = path.join(t.dir, "prototype", "views");
  if (fs.existsSync(viewsDir)) {
    for (const f of fs.readdirSync(viewsDir)) {
      const s = fs.readFileSync(path.join(viewsDir, f), "utf8");
      for (const re of PII) { const m = s.match(re); if (m) fail(`${tag}: 视图 ${f} 含疑似 PII ${m[0].slice(0, 6)}…`); }
    }
  }
  // 版本 bump 纪律：相对 base，prototype/** 变了但 meta.version 没变 = 红
  if (base) {
    let changedProto = false, changedMeta = false;
    try {
      const diff = execSync(`git diff --name-only ${base} HEAD -- "${t.app}/${t.flavor}"`, { encoding: "utf8" }).split("\n").filter(Boolean);
      changedProto = diff.some((d) => d.includes("/prototype/"));
      changedMeta = diff.some((d) => d.endsWith("meta.json"));
    } catch {}
    if (changedProto && !changedMeta) fail(`${tag}: 改了 prototype/** 但未 bump meta.version（SPEC §10）`);
  }
}

// 静态冒烟：boot + pages>0 + 无 page error + 一个控件有反应
if (targets.length) {
  const { chromium } = require("playwright");
  const browser = await chromium.launch();
  for (const t of targets) {
    const tag = `${t.app}/${t.flavor}`;
    const { srv, base: url } = await serve(path.join(t.dir, "prototype"));
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 80)));
    try {
      await page.goto(url + "/index.html", { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1200);
      const pages = await page.evaluate(() => ((window.DC && window.DC.pages) || []).length);
      if (!pages) fail(`${tag}: 冒烟失败 window.DC.pages 为空`);
      const reacted = await page.evaluate(async () => {
        const el = document.querySelector("#dc-stage [data-act],#dc-stage [data-goto]");
        if (!el) return false;
        const before = document.body.innerHTML.length;
        el.click();
        await new Promise((r) => setTimeout(r, 600));
        return document.body.innerHTML.length !== before || !!document.querySelector("#dc-rt-toast,[role=dialog],.dc-rt-sheet");
      });
      if (!reacted) fail(`${tag}: 冒烟失败 首个控件点击无反应`);
      if (errs.length) fail(`${tag}: 冒烟 pageerror: ${errs[0]}`);
    } catch (e) {
      fail(`${tag}: 冒烟异常 ${String(e.message).slice(0, 100)}`);
    }
    await page.close();
    srv.close();
  }
  await browser.close();
}

for (const w of warns) console.log("WARN", w);
if (fails.length) { console.log("VALIDATE FAIL:\n- " + fails.join("\n- ")); process.exit(1); }
console.log(`VALIDATE OK (${targets.length} flavors)`);
