# Changelog

## v0.5.24 Smoothness + Alignment

- 删除 Globe 飞线与 `theme_options.connections` 的前端绘制路径，地球只保留节点标记、地区标签和手动旋转。
- 删除桌面地球后台自动旋转计时器；拖动期间隐藏标签并暂停标签布局，松手后再一次性对齐。
- 桌面最高 DPR 从 1.8 降到 1.5，点采样从 16000 降到 12000；手机 / Save-Data / 低性能环境继续使用更保守配置。
- 首屏继续只加载核心 CSS / JS；手机端不再加载 `motion.js` / `motion.css`，减少 MutationObserver 与动画开销。
- 桌面 motion 的动态 indicator 观察范围从整个 `document.body` 收窄到网络网格，并停止对实时上下行 KPI 做数值动画。
- 修正桌面表头“名称 / 配置”和“三网延迟”的视觉居中；三网延迟数据块自身居中但内部仍左对齐，方便扫读。
- 正式把 package、theme-version、页脚、运行时缓存键和 README 升级到 v0.5.24；此前 Globe v2 / First Paint 的未发布内容并入本版本。
- 保留浏览器标题 `Atlas · site_title`、首屏延迟加载和全 CSS 结构检查。
- 增加无飞线 / 无后台旋转、拖动标签降载、标题对齐、同源运行时与站点标题 text-safe 回归测试。

## v0.5.23 Architecture + Network Render Cleanup

- 移除概览网络质量面板删除后遗留的 aggregateHistory 运行时代码与过时测试。
- network.js 只保留 windowSamples 运行时依赖，网络纯数据 helper 继续由 network-core.js 管理。
- 所有测试中的 windowSamples / historyFromArrays / aggregateHistory 统一从 network-core.js 导入，避免测试依赖 network.js 的兼容 re-export。
- 网络页取消每条线路各自 JSON.stringify 整段历史的签名；改为每个节点每个时间片只计算一次历史窗口变化，再统一驱动三条线路重绘。
- 删除 node-trends.js 中与 resource-recorder.js 重复的 recordResources 实现及未使用 observations import。
- 删除 app / enhancements 中未使用的 6 个内联 SVG，减少首屏 JS 解析体积。
- 删除 #resources / #settings 两个不存在页面的 CSS selector 分支。
- README 修正为当前真实布局：桌面紧凑长条列表、手机自适应节点卡片。
- 保持现有视觉、交互、网络历史和节点趋势功能不变。

## v0.5.22 Runtime + Dead UI Cleanup

- 删除已经永久隐藏的概览“网络质量”面板，并停止为它创建 4 个 Plot、聚合三网历史和维护 32 段在线率 DOM。
- 网络图表只在网络页执行；概览页继续保留地图延迟与实时上下行趋势。
- 删除隐藏且只有“全部事件”一个选项的活动类型下拉框及对应筛选分支。
- 清理 connection 类型活动的无效调用；活动日志仍只记录服务器上线/离线。
- 清理当前 HTML/JS 已不再使用的旧 settings/resource/network CSS selector。
- enhancements 的 DOM 标记改为稳定布尔标记，避免每次发布产生版本漂移。
- Router 在注册事件前初始化 sequence；tools/check.mjs 删除未使用 import。
- 测试不再允许硬编码 Atlas 发布版本；布局测试从 package.json 动态读取版本，避免升级时重复失败。
- 保持现有 PC / 手机视觉布局与节点/网络功能不变。

## v0.5.21 CSS Cleanup

- 先修复 v0.5.20 中 #network-grid .network-server 规则后多出的一个右花括号，这是 PostCSS 报 Unexpected } 的根因。
- 使用临时打包的 PostCSS 解析器清理 atlas.css，避免字符串级删除破坏花括号结构。
- 仅清理相同 selector + 相同条件上下文中，被后续简单声明明确覆盖的旧声明；不重排 selector。
- 删除清理后为空的 selector block 与历史 Atlas 版本注释。
- 节点布局、流量与性能测试改为验证最终行为，不再依赖旧版本注释。
- 修正页脚、package、theme-version 与缓存版本的一致性。
- 本轮不主动改变 PC / 手机视觉布局。

## v0.5.20 Code Cleanup

- 统一所有本地 ES module 的 `?v=` 缓存版本，避免新入口加载旧内部模块。
- `network.js` 不再维护第二份采样/聚合实现，统一复用 `network-core.js`。
- 测试文件改用功能命名，不再把旧版本号写进文件名。
- 新增版本一致性测试，后续发布若漏改缓存版本会直接报错。
- 字体文档改为当前真实的 JetBrains Mono 方案，并补齐对应 OFL。
- README 只保留使用说明，历史发布记录迁移到 CHANGELOG。
- 本轮不改 Atlas 当前 UI 与响应式布局；`assets/atlas.css` 保持视觉输出不变，避免在没有截图回归测试时做破坏性重排。

## v0.5.11 性能整理

- 桌面节点固定为长条列表，移除实验性的双列大卡片切换、相关 localStorage 与主要卡片样式。
- WebSocket 高频更新只即时刷新发生变化的节点；地区统计与 KPI 仅在概览页合并刷新，避免网络页/节点页做无用概览计算。
- 移除未使用的 Geist / Atlas Latin 字体请求，监控数字统一使用本地 JetBrains Mono。
- 手机端保持现有单列节点布局不变。


## v0.5.12 流量进度条

- 本周期流量继续保留为重要信息。
- 底轨改为浅灰圆角胶囊点，已用部分为中灰圆角胶囊点，不再出现突兀的实心黑块。
- 仅修改 quota/progress；展开详情里的网络采样点阵保持不变。


## v0.5.13 系统图标

- 参考 NezhaDash inline 列表的系统标识视觉比例，放大 Atlas 节点 OS 图标。
- Debian / Ubuntu 等因 SVG 留白不同分别做视觉缩放；文字字号不放大。
- 手机端图标额外增加 1px，保证小屏可辨识。


## v0.5.14 系统身份布局

- OS 图标从小 badge 中移出，放到节点名称左侧作为独立系统身份标志。
- 桌面约 22px，手机约 25px；系统名称改为轻量次级文字。
- 删除已失效的 v0.5.13 OS 图标尺寸测试。


## v0.5.15 节点行精修

- Debian / Ubuntu / CentOS 改用真实发行版 Logo 路径，不再使用过度简化的临时 SVG。
- 缩短实时下行、实时上行之间以及与 CPU / RAM / DISK 区域之间的空白。
- 给节点名称和资源监控列更多宽度，避免长节点名换行。
- CPU / RAM / DISK 进度条加宽并稍微加粗。


## v0.5.16 节点行对齐

- OS 图标改为真正跨名称与元数据两行居中，使其视觉中心与“在线”状态基本对齐。
- 三网延迟与运行时间两列靠近，把释放的宽度分配给本周期流量。
- CPU / RAM / DISK 进度条进一步加宽到更容易扫读的尺寸。
- 手机端仍维持原有单列结构，只修正图标的居中关系。


## v0.5.17 桌面与手机精修

- 桌面节点行继续压缩上下行、延迟与运行时间的空白，把空间留给本周期流量和资源条。
- 三网异常延迟保持单行，避免红色丢包信息把节点行撑高。
- CPU / RAM / DISK 进度条略加宽。
- 手机 KPI 卡片和地球区域略收紧，节点卡片垂直间距减少，但不改变信息层级。
- 手机页脚改为稳定的 2×2 信息布局。


## v0.5.18 流量栏与桌面/手机精修

- 桌面节点长条继续把本周期流量栏从资源百分比旁边拉开，避免视觉上挤在一起。
- 本周期流量数值、点状进度条、余量说明改成更居中的一组，进度条宽度收回一点，不再拖满整列。
- 三网延迟与运行时间略收紧，把宽度留给流量列。
- CPU / RAM / DISK 三条资源条微微加粗。
- 手机端保留当前信息结构，只做间距与密度精修。


## v0.5.19 流量列与小标题精修

- 桌面节点表头的小标题进一步收紧字距与对齐方式，整体更整洁。
- 节点行内的“本周期流量”小标题在桌面长条布局中去掉，避免与表头重复。
- 流量数值相对进度条保持居中，点状进度条继续缩短，和右侧三网延迟拉开距离。
- 手机端延续当前结构，只继承更稳妥的流量栏与密度修正。
