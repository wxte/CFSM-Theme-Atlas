WXT Atlas v0.3.20 — hierarchy / traffic cleanup

覆盖路径：
  index.html
  assets/app.js
  assets/polish.css

本包也保留 v0.3.17 已稳定的 network.js / node-trends.js / plot.js，整包覆盖不会回退前面功能。

本版：
- 本周期流量显示 已用 / 配额，例如 69.4 GB / 1000 GB
- 配额计算方式收进进度条辅助文字：双向 / 仅下行 / 仅上行 / 取高
- 详情删除重复的“流量配额”和低价值“数据状态”
- 详情新增“本周期下行 / 本周期上行”
- 网络页控制区、历史状态、服务器内部层级统一
- Activity 改为独立事件 surface
- notice / empty / loading skeleton 统一到 Catalyst/Vercel 风格
- 保持 v0.3.18+ 的独立服务器卡片与手机紧凑布局
