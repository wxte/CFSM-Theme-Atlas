# CFSM Line Grid · v0.3.0

CF-Server-Monitor 的原生 JavaScript / CSS 主题。以 Parallel Routes Demo 的中性控制台为首要视觉参考：双层导航、下划线标签、统一细边框、纯白 / 中性黑背景。数据沿用 CFSM 原生接口，无需后端改造或构建。

## v0.3.0

- 节点、网络、资源为三个独立视图，支持 URL hash、浏览器前进后退；切换视图时保留筛选、卡片展开及图表节点选择。
- 节点页为概览 + 地球 + 地区筛选 + 紧凑卡片；桌面三列、中等宽度两列、手机单列。卡片区分上下行、CPU / 内存 / 磁盘、三网延迟及丢包。
- 地球默认缓慢旋转，按地区坐标聚合标记。悬停显示实时节点详情并高亮相应卡片；点击标记筛选地区。旋转最高 20 帧/秒，拖动、悬停、隐藏页面、切到其他视图或系统减少动态效果时暂停。
- 网络页按节点查看三网历史，显示时间轴、延迟刻度、丢包红标。支持鼠标、触摸、方向键及 Home / End 查看实际采样；后台未开启三网详情时不画历史。
- 历史点使用 30 秒窗口保留最新的真实样本与真实时间戳，最多每台 241 点、最近两小时。仅 CPU 等指标更新时不生成虚假延迟采样；中断超过 15 分钟时断开连线。
- 节点统计尊重当前筛选，网络与资源页使用全站范围。无平面地图及 Lite 开关。

## 安装

CFSM 后台「主题商店 → 自定义主题 URL」填写：

`https://github.com/wxte/cfsm-line-grid/tree/main`

为避免分支缓存，更新时建议使用 `https://github.com/wxte/cfsm-line-grid/tree/<本次完整提交 SHA>`。页脚和 HTML 的 `theme-version` 标记可确认加载版本。管理入口固定为 `/admin#admin`，管理后台仍由 CFSM 默认主题提供。

所有运行资源都在 `index.html` 与 `assets/`，COBE 和地球纹理均为本地资源，无外部 CDN 依赖。

## 数据

- `/api/config`：站点标题及可选主题位置 / 连接配置。
- `/api/servers`：可见节点、显示设置、三网历史。30 秒刷新节点发现；15 秒检查离线状态。内存和磁盘按 CFSM MB 单位转换。
- `/api/ws?subscribe=all`：原生订阅、心跳、重连；兼容 `batchUpdate` 样本的 `data` / `payload` 字段；只修改对应节点数据与相关汇总，保留已有 DOM 和展开状态。
- 在线依据公开 `is_online` 和最后上报时间，超过 5 分钟视为离线。离线保留上次数据，实时汇总排除离线节点。
- 缺失值显示 `—`；成本按周期折算月费、不同币种分开；尊重 `show_price`、`show_expire`、`show_tf`。图表不补点、不模拟流量，也不额外请求历史接口。

## 可选坐标与连接

地球默认使用地区中心，非机房精确坐标。未知地区仍保留节点卡，地图不虚构位置。可通过 CFSM `theme_options` 提供：

```json
{
  "locations": {"server-id-a": [34.05, -118.24], "server-id-b": [50.11, 8.68]},
  "connections": [{"from": "server-id-a", "to": "server-id-b"}]
}
```

配置过的连接直接显示；它们仅表示用户配置的关系。最多 80 条连接，原生 WebSocket 订阅最多 500 个节点，其余使用 REST 刷新。

## 验证

Node.js 22+，执行 `npm test` 和 `npm run check`。本地预览需要将原生接口代理到自己的 CFSM。真实数据测试夹具不随主题发布。

## 参考与归属

- [Parallel Routes Demo](https://parallel-routes-demo.vercel.app/leerob)：首要参考，双层导航、中性配色和克制的边框系统。
- [COBE / shuding](https://github.com/shuding/cobe)：本地 COBE 2.0.1，MIT 许可见 `assets/vendor/COBE-LICENSE.txt`；补充同源纹理、纹理加载后重绘与加载失败回调。
- [LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus)：节点指标层级、历史延迟 / 丢包的组织参考。
- [MikroDash](https://github.com/SecOps-7/MikroDash)：流量和资源指标的语义高亮参考。
- [buycoffee](https://buycoffee.top/work)：清爽文字与边框层级参考。
- [line-grid](https://github.com/selkk-lab/mmwx-theme-line-grid)：信息密度参考。
- [CFSM](https://github.com/huilang-me/CF-Server-Monitor)：原生公开 API。

布局与交互为独立实现，未引入上述项目的前端框架。
