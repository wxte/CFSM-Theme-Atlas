# v0.4.1 — Audit Cleanup

基于 wxte/cfsm-line-grid main 提交 540b1c9556e3508ba4072288e52c6cd78520e5cd（v0.4.0）。

## 修改内容

- assets/atlas.css 按 style.css → enhancements.css → polish.css 原始顺序逐字拼接，末尾仅追加文字对比度修正。原始三个文件保留，方便维护与覆盖安装；index.html 只加载 atlas.css?v=0.4.1。
- assets/plot.js 用 IntersectionObserver 缓存视口可见性，用 ResizeObserver 的 contentRect 缓存尺寸。update、paint 与动画帧不再调用 getBoundingClientRect。端点继续按 SVG viewBox 与显示尺寸补偿为约 6 px 圆点，保留 320 ms 插值、单点线段、缺失数据断点和减少动态效果设置。离开视口、隐藏或尺寸归零时完成当前动画；destroy 断开两个观察器并清理最后一个动画帧。首次观察器回调前直接绘制，后续可见更新正常动画。
- 根目录 robots.txt：User-agent: * 与 Allow: /，各占一行。
- brand-subtitle、filter-explainer、node-columns、剩余额度、更新时间、节点辅助信息、详情标签与网络说明恢复不透明的 muted 颜色，图表坐标文字取消额外透明度。字号、间距、布局、配色变量不变。
- theme-version、页脚、运行模块缓存 query、package.json 与 README 当前版本统一为 v0.4.1。app.js 及其他功能模块仅替换版本 query，业务代码保持不变。

## 验证结果

- 31 个 JS/MJS 文件全部通过 node --check（包含运行代码、工具及测试）。
- 48 个本地 HTML/CSS/JS 资源引用存在；首页仅一个 stylesheet；模块缓存 query 一致。
- atlas.css 的前缀与三份原始 CSS 顺序拼接结果逐字相同。
- 除 plot.js 外，assets 下所有 JS 去除缓存版本差异后均与原始 main 完全相同。
- 新增观察器回归测试通过：禁止同步布局读取、尺寸变化后端点圆度、320 ms 插值、离屏/隐藏/零尺寸、减少动态效果、destroy 清理。
- 相关 plot、observer、contrast 测试共 5 项全部通过。
- muted 文字在 bg/panel/soft/tint 四种基础表面上的静态计算对比度：浅色最低 5.14:1，暗色最低 5.01:1。
- 原仓库完整测试有 3 项既有失败，原始 main 与本包一致：fonts.test.js 的旧 atlas-ui-core 预加载断言；network.test.js 的范围坐标断言及两小时采样数量断言。本次未修改这些功能或删除失败测试。

## 安装与验证边界

完整目录包含 index.html、robots.txt、全部 assets 以及仓库原有辅助文件。将目录内容覆盖到仓库根目录，保留 assets 层级。

本次完成本地语法、引用、静态对比度及自动化逻辑检查，未部署到线上，未运行浏览器截图比对或线上 Lighthouse，不承诺具体评分。部署后需确认 /robots.txt 实际返回本文件的纯文本；主题文件无法决定 CFSM 或 Cloudflare 的路由与缓存配置。
