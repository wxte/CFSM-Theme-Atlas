# CFSM Line Grid · v0.2.3

面向 CF-Server-Monitor 的原生 JS / CSS 主题。延续 line-grid 的紧凑布局：顶部标题与导航、五项 KPI、Regions / Globe / Network 三栏、全宽节点清单、网络状况、资源概况。日间纯白，夜间黑灰绿。

## v0.2.3

只保留地球，移除平面地图与 Lite 开关；地球维持按需绘制，加载失败时提示原因，节点清单继续可用。

## v0.2.2

管理入口修正为 CFSM 官方要求的 `/admin#admin`。手机实时速率独占一行，数值与单位保持完整；节点资源条与三网指标纵向排列；地图标签按实际尺寸避让。

## v0.2.1

修复静止地球在纹理加载后未重新绘制的问题。COBE 纹理改为同源 PNG，兼容不允许 data: 图片的 CSP；加载失败时降级平面地图。压缩顶部与三栏间距，采用青色下行、绿色上行、紫色内存与三网曲线分色，后台标签页暂停实时 DOM 绘制。

## 安装

在 CFSM 后台「主题商店 → 自定义主题 URL」填写发布后的分支地址：

`https://github.com/wxte/cfsm-line-grid/tree/main`

也可将 `main` 替换为实际提交的完整 commit SHA，固定版本。CFSM 对分支资源缓存约 1 小时，对 commit 资源缓存约 1 天；固定到新的 commit 可避免旧分支缓存。

主题只使用根目录 `index.html` 与 `assets/*`，不需要构建或修改后端。COBE 2.0.1 和地球纹理已放入 `assets/`，无需为本主题添加外部 CDN 的 CSP 白名单。

## 数据与交互

- 同源 `/api/servers` 获取可见节点；`/api/ws?subscribe=all` 发送原生 `subscribe` IDs，按 `batchUpdate` 样本增量更新对应节点，同时兼容样本的 `data` 与 `payload` 字段。
- `/api/config` 仅读取站点标题和主题选项，配置请求失败不阻断节点列表。
- 30 秒刷新节点发现与离线兜底；15 秒重新检查 5 分钟过期状态。后台标签页暂停定时数据刷新，返回时重新同步。
- WebSocket 心跳、指数退避重连、过期样本丢弃；离线保留最后指标但不计入当前网速与在线资源汇总。
- 地区过滤、搜索、排序、系统与账单展开；实时更新保留展开状态和现有节点 DOM。
- 三网历史使用 REST `ping` 的真实时间戳，以及此页面收到的 WebSocket 样本；各节点独立绘线，不补点、不模拟流量。最多保留每台 240 点、最近 2 小时。不额外请求历史 API。
- 内存与磁盘按 CFSM 的 MB 单位转换；缺失值显示 `—`；成本按计费周期折算，不同币种分别列出。尊重 `show_price`、`show_expire`、`show_tf`。
- 地球默认静止，拖动或方向键旋转；尺寸、主题、节点位置/状态变化时按需绘制。无持续地球动画循环。无 WebGL 时显示地球不可用提示。

## 位置与连接配置（可选）

CFSM 原生 API 提供国家/地区，默认点位仅表示地区中心，不代表机房精确位置。未知地区保留在清单，地图不虚构坐标。可在 CFSM `theme_options` 中提供真实位置与已知连接（将示例 ID 替换为 `/api/servers` 的节点 ID）：

```json
{
  "locations": {
    "server-id-a": [34.05, -118.24],
    "server-id-b": [50.11, 8.68]
  },
  "connections": [
    {"from": "server-id-a", "to": "server-id-b"}
  ]
}
```

坐标格式为 `[纬度, 经度]`。连接只表示手动配置关系，不代表实际探测链路或吞吐量。默认不画虚构飞线；单节点也可正常显示。最多显示 80 条配置连接；WebSocket 原生订阅上限 500 个 ID，超出节点通过定时 REST 刷新。

## 开发与验证

Node.js 22+：`npm test` 检查数据逻辑；`npm run check` 检查 JavaScript 语法。无运行时框架依赖。

本地静态预览需要将 `/api/config`、`/api/servers`、`/api/ws` 代理到自己的 CFSM，或提供独立测试数据；直接用 `file://` 无法读取同源 API。测试数据不包含在生产主题中。

## 参考与归属

- [line-grid](https://github.com/selkk-lab/mmwx-theme-line-grid)：布局和信息密度参考；本版本前端为独立实现。
- [COBE](https://cobe.vercel.app/) / [shuding/cobe](https://github.com/shuding/cobe)：本地使用 COBE 2.0.1（修改纹理加载、加载后重绘及失败回调），MIT 许可见 `assets/vendor/COBE-LICENSE.txt`。
- [Crucix](https://www.crucix.live/)：地图切换、局部状态层与轻量模式的交互参考，未复用其实现。
- [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)：平面地图基于公开领域 1:110m land 数据。
- [CFSM API 文档](https://github.com/huilang-me/CF-Server-Monitor/blob/main/API.md)：原生数据协议。
