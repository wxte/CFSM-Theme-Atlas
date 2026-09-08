# 本地字体

v0.2.8 的所有字体请求都来自主题自身的 `assets/vendor/fonts/`，不使用 CDN 样式表、远程字体服务或运行时字体脚本。

- **正文、导航、中文、节点名和小数据**：更纱黑体 UI SC（Sarasa UI SC）v1.0.41，裁剪后内部命名 Atlas UI。使用 Regular 与界面字集的 Semibold。像素字体不用于密集小字。
- **品牌、概览 KPI 和资源大数字**：Geist Pixel Square，裁剪后内部命名 Atlas Pixel Display。中文回退到同样随主题发布的 Atlas UI。
- **字体暂不可用**：立即显示本机苹方、微软雅黑 UI 或无衬线字体。`font-display: swap` 不要求用户等待字体才能读内容。

常用界面字集和大数字字体通过同源 preload 提前发现。主题只发布常用静态界面字，避免为每个动态服务器名加载一块 CJK 字库；不在子集中的服务器名称、地区名称会立即回退到系统中文字体。这样首屏字体包约 110 KiB，动态数据不会引发额外字体请求。新增固定界面文案后重新生成常用字集即可让它使用 Atlas UI。

保留字形轮廓、字距和字形布局信息；去掉体积较大的 TrueType hinting 指令，已在桌面及高像素密度手机预览中检查小字号。小标签最小字号提升到 12px；不使用 CSS 字体缩放或文字图片。

## 来源与许可

- [Sarasa UI SC v1.0.41](https://github.com/be5invis/Sarasa-Gothic/releases/tag/v1.0.41)：Inter 西文字形与思源黑体区域中文，UI 版采用比例字宽。许可证随主题保存为 `assets/vendor/fonts/SARASA-OFL.txt`。
- [Geist Pixel](https://github.com/vercel/geist-font/tree/main/fonts/GeistPixel)：Square 变体。许可证保存在 `assets/vendor/fonts/GEIST-PIXEL-OFL.txt`。
- 两者均按 SIL OFL 1.1 使用和分发。子集内部重新命名，保留版权声明和许可元数据。
- `assets/vendor/fonts/manifest.json` 记录输入字体 SHA-256、输出大小、字符范围与 SHA-256。

## 维护时重新生成

普通用户直接使用仓库内已生成的 WOFF2，无需安装工具。维护者使用 Python 和 `fonttools[woff]`，下载上述版本的 UI SC Regular、Semibold TTF 以及 Geist Pixel Square WOFF2，然后执行：

```text
python tools/subset-fonts.py --ui-source /path/SarasaUiSC-Regular.ttf --ui-bold-source /path/SarasaUiSC-SemiBold.ttf --geist-source /path/GeistPixel-Square.woff2
```

脚本扫描 `index.html` 和 `assets/*.js` 的界面用字并更新内联 `@font-face`。生成后应复查 manifest、手机布局和字体请求体积，再发布。动态名称保持平台字体回退，不应为了单个节点名把完整 CJK 字库放进首屏。

## 性能边界

移除外部 CSS 消除了这次新增的跨域阻塞请求，不代表保证某个 Lighthouse 分数。首次打开仍需下载用到的本地字体；不同网络、CFSM 主题静态资源缓存和数据响应会影响最终指标。字体改动不要求修改 CFSM 后端或新增 CSP 域名。上线后使用新的 PageSpeed 报告复测。
