#!/usr/bin/env node
/**
 * thumb.mjs —— v2（M98）：由策展 cover.png 派生 thumb.png（640×400 jpg q78）。
 * v1 曾裸截视口当封面（既不合 3:2 也无场景合成），已废；cover 缺失时跳过并提示跑 skill cover.mjs。
 * 用法: node scripts/thumb.mjs [app ...]（无参=全部 app）
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { listApps } from "./lib.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const root = path.resolve(".");
const args = process.argv.slice(2);
let targets = listApps(root);
if (args.length) targets = targets.filter((t) => args.includes(t.app));
for (const t of targets) {
  const cover = path.join(t.dir, "cover.png");
  if (!fs.existsSync(cover)) { console.log(`thumb skip ${t.app}: 缺 cover.png（跑 skill gen/cover.mjs）`); continue; }
  await sharp(cover).resize(640, 400, { fit: "cover" }).jpeg({ quality: 78 }).toFile(path.join(t.dir, "thumb.png"));
  console.log("thumb:", t.app);
}
