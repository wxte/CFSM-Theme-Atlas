# CFSM Line Grid

轻量 CF-Server-Monitor 第三方主题原型。

## v0.1
- 原生 JS + CSS，无 Vue/React/Pinia/ECharts
- 直接读取 `/api/config`、`/api/servers`
- 原生接入 `/api/ws` 的 `batchUpdate`
- COBE 2.0.1 地球
- 真正的纯白日间主题 + 克制的深色主题
- 节点动态发现：CFSM 后台添加/删除节点后，主题代码不用改
- 手机响应式布局

## 目录

- `index.html`
- `assets/style.css`
- `assets/app.js`

CFSM 第三方主题代理只需要 `index.html` 与 `assets/*`，所以把这三个文件直接放到 GitHub 仓库即可。

## 主题 URL

仓库推送到 GitHub 后，在 CFSM 后台填写：

`https://github.com/<你的用户名>/cfsm-line-grid/tree/main`

## CSP

v0.1 为了先快速验证效果，COBE 从 `https://esm.sh` 加载。
请在 CFSM 的 CSP 静态资源白名单中加入：

`https://esm.sh`

确认设计后，下一版会把 COBE 打包进 `assets/`，彻底取消外部 CDN 依赖。
