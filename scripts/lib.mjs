/**
 * lib.mjs —— proto 仓 CI/脚本共享层：flavor 词表、shell 映射、meta 读取、静态服务、贡献者聚合、store-only zip。
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { execSync } from "node:child_process";
import zlib from "node:zlib";

export const FLAVOR_RE = /^(mobile|tablet|desktop|web)(-(android|ios|ipad|mac|win|linux))?(-(cn|global))?$/;
export const APP_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const SHELL_BY_FORM = { mobile: "c_mobile", tablet: "c_tablet", desktop: "c_desktop", web: "c_browser" };
export const SHELLS = ["c_mobile", "c_tablet", "c_desktop", "c_browser"];
export const VIEWPORT = { c_mobile: [390, 844], c_tablet: [834, 1194], c_desktop: [1280, 800], c_browser: [1280, 800] };
export const LICENSES_OK = /^(CC-BY-4\.0|CC-BY-SA-4\.0|CC-BY-NC-4\.0|CC0-1\.0|MIT|Apache-2\.0)$/;
export const ATTEST = ["original", "licensed", "public-material"];
export const FORBIDDEN = [
  /(^|\/)node_modules\//, /(^|\/)export\//, /(^|\/)qa\//, /(^|\/)capture\//, /(^|\/)\.cache\//,
  /\.(mp4|webm|mov|avi)$/i, /\.map$/i, /\.(ttf|otf|woff2?)$/i,
];
export const MAX_BYTES = 80 * 1024 * 1024;

export function listFlavors(root) {
  const out = [];
  for (const app of fs.readdirSync(root, { withFileTypes: true })) {
    if (!app.isDirectory() || app.name.startsWith(".") || app.name === "scripts" || app.name === "node_modules") continue;
    const ad = path.join(root, app.name);
    for (const fl of fs.readdirSync(ad, { withFileTypes: true })) {
      if (!fl.isDirectory()) continue;
      const fd = path.join(ad, fl.name);
      if (fs.existsSync(path.join(fd, "meta.json")) && fs.existsSync(path.join(fd, "prototype", "index.html"))) {
        out.push({ app: app.name, flavor: fl.name, dir: fd });
      }
    }
  }
  return out;
}

export const readMeta = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8"));
export const readAppMeta = (root, app) => {
  try { return JSON.parse(fs.readFileSync(path.join(root, app, "meta.json"), "utf8")); } catch { return {}; }
};

export function dirBytes(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? dirBytes(p) : fs.statSync(p).size;
  }
  return n;
}

export function walkRel(dir, base = dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkRel(p, base)); else out.push(path.relative(base, p));
  }
  return out;
}

/** 零依赖静态文件服务（CI 冒烟/缩略图用） */
export function serve(dir) {
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".ico": "image/x-icon" };
  const srv = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || "/").split("?")[0]);
    let p = path.join(dir, rel);
    if (rel.endsWith("/")) p = path.join(p, "index.html");
    if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) { res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((resolve) => srv.listen(0, "127.0.0.1", () => resolve({ srv, base: `http://127.0.0.1:${srv.address().port}` })));
}

export function contributors(root, rel) {
  let log = "";
  try { log = execSync(`git -C "${root}" log --format=%an%x09%ae -- "${rel}"`, { encoding: "utf8" }); } catch { return []; }
  const map = new Map();
  for (const line of log.split("\n")) {
    if (!line.trim()) continue;
    const [name, email] = line.split("\t");
    const m = /@users\.noreply\.github\.com$/.test(email || "") ? (email || "").split("@")[0].replace(/^\d+\+/, "") : null;
    const k = name || email;
    const e = map.get(k) || { name, login: m, commits: 0 };
    e.commits++; e.login = e.login || m;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.commits - a.commits);
}

export const lastCommitInfo = (root, rel) => {
  try {
    const out = execSync(`git -C "${root}" log -1 --format=%aI -- "${rel}"`, { encoding: "utf8" }).trim();
    return out || null;
  } catch { return null; }
};

/* ---------- store-only zip（与 skill zipstore 同思路：不压缩、稳、零依赖） ---------- */
export function zipDir(dir, outFile) {
  const files = walkRel(dir).sort();
  const chunks = [];
  const central = [];
  let offset = 0;
  const dos = (d) => {
    const t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
    const dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
    return [dd, t];
  };
  const crcTable = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
  const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  for (const rel of files) {
    const buf = fs.readFileSync(path.join(dir, rel));
    const name = Buffer.from(rel.split(path.sep).join("/"), "utf8");
    const [dd, tt] = dos(new Date());
    const crc = crc32(buf);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(0, 8);
    lh.writeUInt16LE(tt, 10); lh.writeUInt16LE(dd, 12); lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(buf.length, 18); lh.writeUInt32LE(buf.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, name, buf);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(0, 10);
    ch.writeUInt16LE(tt, 12); ch.writeUInt16LE(dd, 14); ch.writeUInt32LE(crc, 16);
    ch.writeUInt32LE(buf.length, 20); ch.writeUInt32LE(buf.length, 24); ch.writeUInt16LE(name.length, 28);
    ch.writeUInt32LE(0, 34); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([ch, name]));
    offset += 30 + name.length + buf.length;
  }
  const cd = Buffer.concat(central);
  const eo = Buffer.alloc(22);
  eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(files.length, 8); eo.writeUInt16LE(files.length, 10);
  eo.writeUInt32LE(cd.length, 12); eo.writeUInt32LE(offset, 16);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.concat([...chunks, cd, eo]));
  return outFile;
}

export const semver = (v) => /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(v || ""));
