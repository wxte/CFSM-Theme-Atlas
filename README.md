# WXT Atlas

**Cloudflare Server Monitor 的原生 JavaScript / CSS 主题。**

当前版本：**v0.4.0**

WXT Atlas 以 [Parallel Routes Demo](https://parallel-routes-demo.vercel.app/leerob) 的页面骨架、[Catalyst](https://catalyst.tailwindui.com/docs) 的组件层级和 [HomeDash](https://buycoffee.top/blog/tech/homedash-refresh) 的监控信息密度为主要设计参考。主题保持原生 HTML / CSS / JavaScript，不引入 Vue、React、ECharts 等运行时框架。

- 概览、节点、网络三视图
- 原生 WebSocket 实时更新 + 轮询兜底
- CPU / RAM / DISK、实时上下行、本周期流量与三网延迟
- 节点详情原位展开，不使用弹窗 / Drawer
- 真实历史采样与实时网络曲线
- COBE 点阵地球与地区联动
- 手机端紧凑卡片与三网按钮切换
- 日间 / 夜间主题
- 本地 Geist Sans，中文优先使用系统字体
- 无第三方字体 CDN，无需额外 CSP 白名单

---

## 安装

CFSM 后台进入：

**主题商店 → 自定义主题 URL**

填写：

```text
https://github.com/wxte/cfsm-line-grid/tree/main
```

公开名称为 **WXT Atlas**，包名为 `cfsm-atlas`。

现有 GitHub 仓库仍保留 `cfsm-line-grid` 路径，避免影响已经配置的主题地址。

更新后如果浏览器仍显示旧样式，可优先确认：

1. `index.html` 中的 `theme-version`
2. 页脚显示的版本号
3. CSS / JS URL 后的版本参数
4. Cloudflare / 浏览器是否仍缓存旧文件

需要固定版本时，也可以使用完整提交 SHA：

```text
https://github.com/wxte/cfsm-line-grid/tree/<完整提交 SHA>
```

所有运行文件都位于 `index.html` 与 `assets/`，不需要加载第三方 CDN。管理入口仍由 CFSM 提供：

```text
/admin#admin
```

---

## 当前界面

### 概览

概览包含：

- 节点总数与在线状态
- 覆盖地区
- 实时下行 / 实时上行汇总曲线
- 本周期流量
- 月费折算
- 地区分布
- 全球节点地球
- 三网质量均值
- 节点列表

实时上下行汇总使用本地 SVG 微图，维护真实历史采样，不生成随机动画。

### 节点

桌面与手机都采用**独立服务器卡片**。

每台服务器显示：

- 在线 / 离线
- 名称、分组、架构、CPU 核数、内存
- 地区
- 实时上下行
- CPU / RAM / DISK
- 本周期流量 `已用 / 配额`
- 配额进度与剩余比例
- 联通 / 电信 / 移动延迟
- 运行时间

CPU / RAM / DISK 与流量配额使用不同的颜色压力曲线：

- 流量：接近 100% 才进入纯红
- 资源：危险颜色提前约 20 个百分点，约 80% 已达到流量 100% 的警示强度

点击节点名称或详情按钮后，在**当前卡片内部展开**：

- CPU / 下行 / 上行实时趋势
- CPU 型号
- 系统与内核
- 负载 / 进程
- TCP / UDP
- 价格
- 到期时间
- 本周期下行
- 本周期上行

### 网络

范围：

- 实时
- 1H
- 6H
- 24H
- 7D

实时模式使用**当前页面收到的约 5 分钟采样窗口**，约每 5 秒形成页面快照。

实时曲线使用局部动态纵轴，因此 1～2 ms 的延迟变化也能显示出来，不会因为固定从 0 开始而被压成直线。

历史模式读取服务端历史数据，保留真实尖峰、异常和缺失断点。

桌面端每台服务器并排显示联通 / 电信 / 移动；手机端使用明确的：

**联通 / 电信 / 移动**

三个按钮切换，一次只显示一个图，不依赖横向滑动。

---

## 数据与刷新逻辑

### `/api/config`

用于站点标题以及可选的地球位置 / 节点连接配置。

### `/api/servers`

用于初始节点列表、公开显示设置和历史采样。

当前前台以 WebSocket 为主要实时通道，HTTP 请求作为初始化与兜底：

- 首次进入页面立即读取
- 约 15 秒轮询兜底
- 请求使用重新验证策略，不直接使用过期监控数据
- 已有数据刷新时不重新显示整页骨架

### `/api/ws?subscribe=all`

原生 WebSocket 实时订阅：

- 支持 `batchUpdate`
- 兼容 `data` / `payload` / `metrics`
- 约 20 秒心跳
- 长时间无消息自动重连
- 页面从后台恢复时立即补刷新和重新订阅
- 多探针同时上报时合并到 animation frame 中渲染，避免连续重绘

实时订阅最多发送 500 个节点 ID；更大规模的剩余节点继续依赖定时刷新。

### 数据规则

- 在线状态依据 CFSM 公开状态与最近上报时间
- 离线节点保留最后一次数据
- 实时流量汇总只统计在线节点
- 缺失值显示 `—`
- 不模拟流量、延迟或资源数据
- 内存 / 磁盘按 CFSM 返回单位换算
- 月费按原币种分别汇总，不做隐式汇率换算
- 尊重 `show_price`、`show_expire`、`show_tf`、三网详情等后台公开设置
- 前台不显示节点真实 IP

当前版本不提供跨会话事件数据库、告警规则编辑或长期资源历史，这些管理功能仍由 CFSM 后台负责。

---

## 可选地球坐标与节点连接

默认地球标记使用地区中心作为示意。

可通过已有 `theme_options` 提供精确位置或节点连接：

```json
{
  "locations": {
    "server-id-a": [34.05, -118.24],
    "server-id-b": [50.11, 8.68]
  },
  "connections": [
    {
      "from": "server-id-a",
      "to": "server-id-b"
    }
  ]
}
```

连接仅表示配置关系，不代表真实网络路由。当前最多显示 80 条连接。

---

# 更新记录

## v0.4.0 — Performance Cleanup

在不改变 v0.3.21 视觉结构的前提下整理首屏性能路径。

- 网络完整图表模块不再进入概览首屏，进入网络分页后动态加载
- 新增轻量 `network-core.js`，首屏仅保留必要的历史采样处理
- 节点趋势模块在第一次展开详情时才加载
- 新增轻量 `resource-recorder.js`，常驻逻辑仅负责保存资源采样
- 地球改为延迟加载，KPI 与节点数据优先完成首屏渲染
- 新增 `lazy-map.js`，首屏不立即执行完整 COBE / WebGL 地球模块
- 桌面屏幕外节点卡片使用浏览器内容可见性优化，降低初始 layout / paint 成本
- 字体继续沿用 Vercel Geist Sans，但仅 Latin / 数字使用自托管 Geist
- 中文优先使用 PingFang SC、Microsoft YaHei UI 等系统字体
- 移除 Atlas CJK 字体对首屏关键路径的强制 preload
- 精简首屏 module preload，非关键增强功能延后
- `/api/servers` 改为重新验证缓存策略，实时准确性保持不变

新增文件：

```text
assets/network-core.js
assets/resource-recorder.js
assets/lazy-map.js
```

---

## v0.3.21 — Navigation & Final Polish

- 桌面顶部恢复真正的双层导航
- 第一层保留品牌、LIVE、刷新、主题、活动和管理后台
- 第二层独立显示概览 / 节点 / 网络
- 主导航恢复轻量文字 Tab 与下划线选中态
- 统一页面标题、节点列标题和详情文字层级
- 降低网络图网格线存在感
- 统一暗色模式下的边框、hover 与阴影
- 补齐空状态和提示状态

---

## v0.3.20 — Traffic & Hierarchy

- 本周期流量直接显示 `已用 / 配额`
- 例如：`69.4 GB / 1000 GB`
- 配额进度下显示双向 / 仅上行 / 仅下行 / 取高、剩余量与百分比
- 删除详情中重复的“流量配额”
- 删除价值较低的“数据状态”
- 详情新增本周期下行与本周期上行
- 收紧网络页时间范围、图例和说明层级
- 统一 Activity、错误、空数据、Loading / Empty State

---

## v0.3.19 — Stacked Controls

- 顶部骨架向 Vercel / Catalyst Stacked Layout 收紧
- 统一 Navbar、LIVE Badge、在线 / 离线 Badge
- 统一实时 / 1H / 6H / 24H / 7D 分段控件
- 统一全部 / 在线 / 离线筛选
- 统一搜索、排序、筛选 chip 与 focus 状态
- 手机三网按钮沿用相同的控件语言

---

## v0.3.18 — Independent Server Surfaces

桌面节点布局重新找回独立卡片设计语言。

- 移除包住所有服务器的大型连续表格外框
- 每台服务器成为独立圆角 surface
- 概览页和节点页同时生效
- 手机端现有紧凑卡片保持不变
- 展开详情继续位于当前服务器卡片内部
- CPU / 下行 / 上行趋势改为轻量 inset 小卡
- 系统、负载、连接、价格、到期等采用 Catalyst Description List 风格层级
- 不恢复 Drawer / Dialog

设计方向：

**Parallel Routes Demo 的页面骨架 + Catalyst 的组件细节 + HomeDash 的监控密度。**

---

## v0.3.17 — Unified Curves

- 首页、节点详情、网络分页的曲线尾点统一
- 修复非等比 SVG 导致圆点被拉成小椭圆的问题
- 尾点按实际屏幕像素保持圆形
- CPU 详情趋势使用动态局部纵轴
- 下行、上行分别独立缩放
- 保留真实尖峰与缺失断点

---

## v0.3.16 — Resource Pressure & Mobile Carrier Tabs

- CPU / RAM / DISK 与流量配额分离颜色逻辑
- 资源危险颜色比流量提前约 20 个百分点
- 手机网络页取消横向滑动
- 每台服务器改为联通 / 电信 / 移动三个明确按钮
- 当前运营商选择同步应用到所有服务器，便于纵向比较

---

## v0.3.15 — Live Network Scale

- 网络实时窗口缩短到约 5 分钟
- 新页面采样从实际第一条数据开始铺满，不再预留大段空白
- 实时纵轴改为局部动态范围
- 1～2 ms 小幅延迟变化也可见
- 1H / 6H / 24H / 7D 历史仍使用正常历史尺度
- 调整资源与流量连续颜色渐变

---

## v0.3.14 — Live Refresh Fix

- 修复汇总上下行曲线采样时间被不断重置，导致长期只有一个点的问题
- 汇总曲线约每 2 秒保存一个真实采样
- 加强 WebSocket 停滞检测和重连
- 页面从后台恢复时主动补刷新
- 轮询兜底缩短
- CPU / RAM / DISK 和流量进度改为按使用率连续变色

---

## v0.3.13 — Mobile Density & Sparkline Motion

- 缩短实时曲线过渡时间
- 新采样点从上一尾点平滑进入
- 手机 KPI、资源卡与服务器卡片整体压缩
- 手机网络页最初尝试三网横向单行布局
- 为后续手机三网显式按钮切换奠定布局基础

---

## v0.3.12 — Unified Local SVG Charts

- 统一节点、网络、实时上下行的本地 SVG 绘制
- 汇总曲线只有一个采样时也立即显示
- 后续采样使用平滑过渡
- 保留真实尖峰和缺失断点
- 联通、电信、移动保持各自颜色
- 网络范围统一为实时、1H、6H、24H、7D

---

<details>
<summary><strong>更早版本</strong></summary>

### v0.3.7

细化微图与卡片，新增短暂更新过渡，移除站内动态效果开关。详见 `docs/RELEASE-v0.3.7.md`。

### v0.3.6

压缩概览卡片，网络状态条最多 24 段并保留异常高亮，优化实时渲染、手机布局和文案。详见 `docs/RELEASE-v0.3.6.md`。

### v0.3.5

恢复行内折叠详情，节点图表移入详情并按需显示，恢复手机管理后台入口。

### v0.3.4

修复短范围状态格的人工空桶，减少重复 DOM 写入与历史处理。

### v0.3.3

移除右上角搜索入口，保留节点列表搜索。

### v0.3.2

修复采样选中被实时更新清空的问题，新增服务端 24H / 7D 历史与时间格高亮。

### v0.3.1

新增节点趋势、真实网络观测与历史范围；修复早期详情布局问题。

### v0.3.0

曾加入命令面板与 Drawer 详情。后续版本根据监控场景重新恢复为卡片内详情，因此 README 不再把 Drawer 作为当前功能描述。

### v0.2.9

字体改为本地加载，移除第三方字体 CDN。

### v0.2.5

建立三网真实历史采样、缺失断点处理、节点内容可见性优化和 Geist Sans 基础。

### v0.2.4

加入高负载 / 即将到期快捷筛选、活动页和网络状态条。

### v0.2.2

修正地球重复像素放大、离屏渲染、标签布局测量与无障碍结构。

### v0.2.1

建立 WXT Atlas 当前的概览 / 节点 / 网络基本信息架构。

</details>

---

## 验证与开发

推荐 Node.js 22+。

```bash
npm test
npm run check
```

本地预览时需要将 CFSM HTTP API 与 WebSocket 同源代理到自己的站点。

真实节点测试夹具和本地预览代理不随主题发布。

项目已有验证记录可查看：

```text
docs/VALIDATION.md
```

桌面浏览器模拟窄屏不能完全替代 iPhone Safari 实机检查。

---

## 设计参考与归属

- [Parallel Routes Demo](https://parallel-routes-demo.vercel.app/leerob)  
  页面骨架、双层导航、轻量 Tab、独立 surface 与信息层级的主要参考。

- [Catalyst](https://catalyst.tailwindui.com/docs)  
  Description List、Navbar、Badge、Segmented Control 等组件细节参考。Atlas 未引入 React / Tailwind / Headless UI 运行时。

- [HomeDash](https://buycoffee.top/blog/tech/homedash-refresh)  
  监控信息密度、资源状态和网络数据排布参考。

- [Geist](https://github.com/vercel/geist-font)  
  本地 Geist Sans，SIL Open Font License 1.1。

- [COBE / shuding](https://github.com/shuding/cobe)  
  本地点阵地球。MIT 许可见 `assets/vendor/COBE-LICENSE.txt`。

- [Crucix](https://www.crucix.live/)  
  地球标记与节点信息浮层交互参考。

- [LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus)  
  CFSM 主题信息组织参考。

- [CF-Server-Monitor](https://github.com/huilang-me/CF-Server-Monitor)  
  原生后端与公开接口。

Atlas 的布局、交互与运行逻辑均为独立实现，没有引入上述参考项目的应用框架。

---

## License

字体与第三方组件遵循各自许可证；相关许可证文件随仓库保留。

WXT Atlas 自身代码的许可请以仓库中的许可证文件为准。
