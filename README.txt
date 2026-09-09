WXT Atlas v0.4.1 — Audit Cleanup

v0.4.1：按原顺序合并 CSS 为 assets/atlas.css；图表改用观察器缓存可见性与尺寸；新增 robots.txt；提升辅助文字对比度。完整验证说明见 docs/RELEASE-v0.4.1.md。

以下为 v0.4.0 的历史说明（v0.4.1 覆盖完整目录，详见上述发布说明）：

覆盖/新增文件：
  index.html
  assets/app.js
  assets/polish.css
  assets/network-core.js      (新增)
  assets/resource-recorder.js (新增)
  assets/lazy-map.js          (新增)

性能调整：
- 首屏只 modulepreload app.js，不再抢跑 network/globe 等非关键模块。
- enhancements.js 改为空闲时动态加载。
- 完整 NetworkCharts 仅进入“网络”分页时动态加载；概览只加载轻量 network-core。
- 节点详情趋势模块仅第一次展开详情时动态加载；常驻记录器拆成约 1KB 小模块。
- WebGL 地球在首屏文本/节点完成后延迟到 idle，再初始化；等待时保留轻量球体占位。
- 桌面折叠节点使用 content-visibility:auto，减少首屏布局/绘制。
- /api/servers 使用 no-cache 重新验证而不是 no-store；仍不会直接使用过期缓存。
- 字体采用现有自托管 Geist Sans（Vercel/Parallel 风格）+ 系统 CJK；移除 Atlas CJK 字体 preload。

未删除任何旧资产；旧 network.js / node-trends.js / globe.js / enhancements.js 仍由动态 import 使用。
如需回退，恢复 v0.3.21 的 index.html、assets/app.js、assets/polish.css 即可；新增 3 个文件留着也不会被旧版引用。
