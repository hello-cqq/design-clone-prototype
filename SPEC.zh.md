# 提交规范（v1 中文摘要，权威英文版见 SPEC.md）

1. **目录与命名**：`<app>/meta.json` + `<app>/<flavor>/{meta.json,thumb.png,prototype/,PROVENANCE.md}`；
   app 用 kebab-case；flavor 受控词表 `^(mobile|tablet|desktop|web)(-(android|ios|ipad|mac|win|linux))?(-(cn|global))?$`
   （如 wechat/mobile-android、wechat/desktop-mac、aliyun-console/web）；**每个 flavor 只存当前版**，历史走 git+Release。
2. **prototype 白名单**：index.html/views/assets/inspector.*/runtime.*/zipstore.*/utilities.css/paths.json/
   products.json/annotations.json/variants/design/pages/version.json/appicon；
   禁 node_modules/export/qa/capture/视频/.cache/字体二进制/第三方运行时 CDN（必须全离线可玩）。
3. **meta.json**：app 级 title 必填+brand_disclaimer（非原创时必填）；flavor 级 shell 必须与 flavor 形态映射
   （mobile*→c_mobile、tablet*→c_tablet、desktop*→c_desktop、web→c_browser）、source/license（默认 CC-BY-4.0）/
   ip_attestation∈{original,licensed,public-material}+说明/version（SemVer）。
4. **门前置**：源 run 的 interact dead=0、inspect 0 fail、ui-smoke 0 fail、privacy 绿；publish.mjs 强验并写入 PR body；
   CI 另跑静态冒烟（启动、pages>0、无 page error、一个控件有反应）。
5. **隐私红线**：真名/电话/证件/车牌/真人脸一律不得出现；聊天与示例文本虚构；上传者昵称匿名化。
6. **IP**：三选一自律声明；品牌克隆必须带免责声明（publish 自动插）：非官方学习复刻、商标归原主；
   禁整包官方素材（字体/图标包），图标自绘 SVG 或注明来源的小裁切。
7. **体积**：单 flavor ≤80MB；图片仅 jpg/png/webp/svg；系统字体栈。
8. **许可**：原型代码 MIT；资产按 flavor license；仓基础设施 MIT。
9. **PR 流程**：分支 publish/<app>-<flavor>-<ts>；标题 publish(<app>/<flavor>): <title>；同 app 多 flavor 可一 PR；
   CI 绿后由 maintainer 人工审批合并（禁 automerge）；合并后 index.yml 重建索引+缩略图，release.yml 打
   tag <app>-<flavor>-<version> 并发布离线 zip Release。
10. **更新与下架**：覆盖同目录 PR+PROVENANCE 记账；改 prototype/** 不 bump version = CI 红；下架走 issue 模板，48h 响应。
