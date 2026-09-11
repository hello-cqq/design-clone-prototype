#!/usr/bin/env node
/**
 * thumb.mjs —— 为缺缩略图的 flavor 生成 cover.png（playwright 截 #dc-stage 首屏）。
 * 用法: node scripts/thumb.mjs [app/flavor ...]（无参=全部缺失者）
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { listFlavors, readMeta, VIEWPORT, serve } from "./lib.mjs";

const require = createRequire(import.meta.url);
const root = path.resolve(".");
const args = process.argv.slice(2).filter((a) => a.includes("/"));
let targets = listFlavors(root);
if (args.length) targets = targets.filter((t) => args.includes(t.app + "/" + t.flavor));
else targets = targets.filter((t) => !fs.existsSync(path.join(t.dir, "cover.png")));
if (!targets.length) { console.log("cover: 无缺失"); process.exit(0); }

const { chromium } = require("playwright");
const browser = await chromium.launch();
for (const t of targets) {
  const meta = readMeta(t.dir);
  const [w, h] = VIEWPORT[meta.shell] || VIEWPORT.c_mobile;
  const { srv, base } = await serve(path.join(t.dir, "prototype"));
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  try {
    await page.goto(base + "/index.html", { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(1500);
    const el = page.locator("#dc-stage");
    await (await el.count() ? el : page.locator("body")).screenshot({ path: path.join(t.dir, "cover.png") });
    console.log("cover:", t.app + "/" + t.flavor);
  } catch (e) {
    console.log("thumb FAIL:", t.app + "/" + t.flavor, String(e.message).slice(0, 80));
  }
  await page.close();
  srv.close();
}
await browser.close();
