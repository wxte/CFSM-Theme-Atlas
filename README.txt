WXT Atlas v0.3.18 desktop surface refresh

直接覆盖：
- index.html
- assets/polish.css

其余 assets/*.js 是 v0.3.17 当前曲线/实时逻辑的完整副本，方便整包覆盖时保持一致。

本版重点：
1. 桌面端概览/节点页服务器恢复为独立圆角卡片，不再全部粘成一张长表。
2. 手机端节点布局不改。
3. 详情继续卡片内展开，不恢复弹窗/抽屉。
4. 详情趋势图做成轻量 inset surfaces；系统/账单信息改成 Catalyst 风格 description list。
5. KPI、网络服务器卡片、控件圆角/边框/阴影统一到更克制的 Vercel/Catalyst 视觉语言。
