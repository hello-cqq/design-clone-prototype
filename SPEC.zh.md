# 提交规范（v2 中文摘要，权威英文版见 SPEC.md）

v2 变化：**取消 flavor 子目录**。每个应用一个平铺目录；微信平板/桌面等变体=独立应用；热度=Release 下载量。

1. **目录与命名**：`<app>/{meta.json,icon,cover.png,prototype/,PROVENANCE.md}`；app kebab-case；
   变体独立应用（wechat / wechat-pad / wechat-desktop / wechat-ios）；每 app 只存当前版，历史=git+Release。
1b. **画廊资源（CI 硬验）**：`cover.png` 1200×800 严格 3:2、≤300KB、场景匹配合成封面（category 色板+设备框+首视图真截图+图标+中英名+tags，skill `gen/cover.mjs` 生成）；`icon.png` ≥256px（真图标优先：输入/web favicon+manifest/mac icns，否则 `gen/appicon.mjs` 生成）；`meta.json` 双语 name/description + tags 3-6。pr-gate 不过即拒。
2. **prototype 白名单**：index.html/views/assets/inspector.*/runtime.*/zipstore.*/utilities.css/paths.json/
   products.json/annotations.json/variants/design/pages/version.json/appicon；
   禁 node_modules/export/qa/capture/视频/.cache/字体二进制/第三方运行时 CDN（必须全离线可玩）。
3. **meta.json v2**：必填 `name{en,zh}`、`description{en,zh}`、`tags[]`（≥1，供画廊搜索/筛选）、
   `shell`∈{c_mobile,c_tablet,c_desktop,c_browser}、`source{kind,ref}`、`license`（默认 CC-BY-4.0）、
   `ip_attestation`∈{original,licensed,public-material}+说明、`version`（SemVer）、`created_at`；
   非原创必填 `brand_disclaimer`。双语供官网按访客语言展示，请认真写两版。
4. **门前置**：源 run interact dead=0 / inspect 0 fail / ui-smoke 0 fail / privacy 绿；publish.mjs 强验写进 PR body；
   CI 另跑静态冒烟（启动、pages>0、无 page error、一个非导航控件有反应）。
5. **隐私红线**：真名/电话/证件/车牌/真人脸零容忍；聊天与示例文本虚构；上传者昵称匿名。
6. **IP**：三选一自律；非原创必须 brand_disclaimer（publish 自动插免责声明）；禁整包官方素材。
7. **体积**：单 app ≤80MB；图片仅 jpg/png/webp/svg；系统字体栈。
8. **许可**：原型代码 MIT；资产按 license；仓基础设施 MIT。
9. **PR 与发版**：分支 publish/<app>-<ts>；标题 publish(<app>): <name.en>；CI 绿后 maintainer 人工合并（禁 automerge）；
   合并后 index.yml 重建索引（贡献者 git 聚合+补 cover+**Release 下载量**），release.yml 打 tag `<app>-<version>` 发离线 zip Release。
10. **热度/更新/下架**：热度=该 app 各 Release zip 的 download_count 之和（静态平台唯一真实信号）；画廊卡片展示、
    首页 Top4 排序、详情下载按钮带数量；改 prototype/** 必须 bump version（CI 红防静默覆盖）；下架 issue 模板 48h 响应。
