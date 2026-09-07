# WXT Atlas

## v0.2.3

修复机器详情展开：移除外层重复隐藏状态；脚本兼容旧版详情容器。样式、入口脚本及模块依赖统一附带版本号，避免升级后浏览器复用旧脚本。概览与节点视图均已验证展开、收起和手机布局。

**Cloudflare Server Monitor** — 原生 JavaScript / CSS 监控主题。

WXT Atlas v0.2.2 将概览、节点、网络、资源、活动和显示设置组织为独立视图。无需修改 CFSM 后端，无需构建，无 Vue / React / ECharts 或外部 CDN。

## v0.2.2

修正地球重复像素放大、离屏渲染、标签布局测量及表格无障碍结构，提升浅色文字对比度。详见 [性能修复与验证](PERFORMANCE.md)。

## v0.2.1

- 固定浏览器标题为 `WXT Atlas · Cloudflare Server Monitor`，站点名称在页面内单独显示。
- 原生视图路由阻止锚点滚动，支持深链接、前进 / 后退、按历史记录恢复滚动位置；已有节点与详情 DOM 保留。内容切换仅用 130ms 原生淡入，遵循减少动态效果设置。
- 初次读取使用固定布局的加载骨架，刷新已有数据时不闪回骨架；失败、空数据和无搜索结果各自呈现，空结果支持清除筛选。
- 月费按各原币种分别汇总，标明已配置节点数，多币种金额自动换行。

- 首要视觉参考 [Parallel Routes Demo](https://parallel-routes-demo.vercel.app/leerob)：双层导航、下划线选中态、细边框连续列表。节点状态使用小实心圆与浅色圆环，配有文字或无障碍标签。
- 概览包含六项 KPI：节点、地区、实时下行、实时上行、本月流量、已配置月费。桌面地区 / 地球 / 网络三栏按 1:2:1 排布，下方为全宽节点表。
- 地区使用本地 SVG 国旗、节点数量 / 占比以及在线节点三网最低 / 平均延迟。点击地区联动地球和节点列表；未知地区保留节点，不虚构坐标。
- COBE 点阵地球默认缓慢旋转，最高约 12.5 帧/秒。手机减少采样和分辨率；隐藏页面、切换视图、悬停、拖动或减少动态效果时暂停自动旋转。数据相同的标记复用，只有位置 / 状态变化时更新地球标记配置。
- 节点表显示状态、配置 / 分组、地区、上下行、CPU / 内存 / 磁盘、本月流量、三网延迟 / 非零丢包、运行时间。点击名称或省略号原位展开详情；切换视图和实时更新保留筛选及展开状态。中等屏幕折叠部分列，手机以卡片展示字段。
- 网络页按节点显示 CFSM 三网真实历史采样，含时间轴、延迟刻度和丢包红标，支持鼠标、触摸与方向键查看；后台关闭三网详情时不画历史。
- 资源页汇总在线节点当前 CPU、内存、磁盘和连接数。活动页仅记录当前页面会话中实际观察到的上下线与连接变化，最多 100 条。
- 本地显示设置：跟随系统 / 日间 / 夜间、地球自动 / 静止 / 关闭、减少动态效果。日间纯白，夜间深灰。无 Flat Map 或 Lite 按钮。
- 手机采用紧凑卡片、小地球和默认折叠的地区 / 网络面板；窄屏 KPI 为两列。设置留在 Atlas 页面内，管理入口单独标明。

## 安装

CFSM 后台「主题商店 → 自定义主题 URL」填写：

`https://github.com/wxte/cfsm-line-grid/tree/main`

公开名称已独立为 WXT Atlas，包名为 `cfsm-atlas`。现有 GitHub 仓库路径暂时保留，避免影响已经配置的主题地址；仓库尚未重命名。

更新时建议使用固定提交地址 `https://github.com/wxte/cfsm-line-grid/tree/<完整提交 SHA>`，避免分支缓存继续显示旧版。页脚及 HTML 的 `theme-version` 应显示 **WXT Atlas v0.2.1**。

所有运行文件均在 `index.html` 与 `assets/`，无需 CSP 加入第三方 CDN。管理入口为 `/admin#admin`，其管理界面由 CFSM 提供；主题内的「显示设置」不进入管理后台。

## 数据与范围

- `/api/config`：站点标题、可选位置 / 连接配置。
- `/api/servers`：公开节点列表、显示设置、历史采样；每 30 秒刷新发现新增 / 删除节点，每 15 秒检查节点状态。
- `/api/ws?subscribe=all`：原生订阅、心跳、重连；兼容 `batchUpdate` 中 `data` / `payload` 样本。增量更新对应节点 DOM 与相关汇总，在线 / 离线筛选跟随状态变化。
- 在线依据公开 `is_online` 与最后上报时间，超过 5 分钟视为离线。离线节点保留最后数据，实时流量与资源汇总排除离线节点。
- KPI 和资源页为全站范围。地区 / 搜索 / 状态筛选影响概览地球、概览网络均值和节点表；网络历史页单独选择节点。概览微型趋势是当前筛选下本次页面会话实际采集的均值，切换筛选后重新记录。
- 三网历史使用 30 秒窗口，保留最近两小时、每台最多 241 个真实采样；中断超过 15 分钟断开连线。CPU 等无延迟数据的更新不会补出虚假延迟点。
- 缺失值显示 `—`，流量不做模拟；内存 / 磁盘按 CFSM MB 单位转换。成本按原币种折算月费，不做隐式汇率换算。尊重 `show_price`、`show_expire`、`show_tf`；不展示真实 IP。
- 当前版本不提供跨会话事件存储、告警规则编辑或资源长期历史；这些管理能力继续使用原生后台。

## 可选坐标与连接

默认标记是地区中心示意。可通过已有的 `theme_options` 提供：

```json
{
  "locations": {"server-id-a": [34.05, -118.24], "server-id-b": [50.11, 8.68]},
  "connections": [{"from": "server-id-a", "to": "server-id-b"}]
}
```

配置过的连接直接显示，无单独开关；仅代表配置的节点关系，不代表实测路由。最多 80 条连接。实时订阅最多 500 个节点，其余使用定时刷新。

## 验证与开发

Node.js 22+：`npm test`、`npm run check`。本地预览时需将 CFSM 接口及 WebSocket 同源代理到自己的站点。真实节点测试夹具和预览代理不随主题发布。

本版实测记录见 [验证记录](docs/VALIDATION.md)。桌面浏览器的窄屏检查不能替代 iPhone Safari 实机检查。

## 参考与归属

- [Parallel Routes Demo](https://parallel-routes-demo.vercel.app/leerob)：首要参考，导航、连续列表、状态圆点和边框层级。
- [COBE / shuding](https://github.com/shuding/cobe)：本地 COBE 2.0.1；MIT 许可见 `assets/vendor/COBE-LICENSE.txt`。本地版本补充同源纹理及纹理加载重绘 / 错误回调。
- [Crucix](https://www.crucix.live/)：地球标记、节点信息浮层的交互参考。
- [LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus)、[buycoffee](https://buycoffee.top/work)：监控信息组织与清爽层级参考。
- [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)：原生公开接口。

Atlas 布局与交互为独立实现，未引入这些参考项目的应用框架。

## 本轮采用的轻量参考

- [Geist Skeleton](https://vercel.com/geist/skeleton)：按最终组件尺寸保留布局；用本地 CSS 实现，不引入 React 组件。
- [Geist Tabs](https://vercel.com/geist/tabs)：同级视图即时切换并保留可分享 URL。
- [Geist Empty State](https://vercel.com/geist/empty-state)：区分无数据、无搜索结果和请求失败，提供明确恢复操作。
- [next-view-transitions](https://github.com/shuding/next-view-transitions)：借鉴简短的内容过渡；Atlas 使用浏览器原生动画，不安装该 Next.js 包。
