# 本地字体

Atlas 当前运行时只主动加载 **JetBrains Mono**，中文与缺失字形直接回退到系统字体，不再使用 Geist Sans、Atlas UI 或远程字体 CDN。

## 当前文件

- `assets/vendor/fonts/JetBrainsMono-Regular.woff2`
- `assets/vendor/fonts/JetBrainsMono-Medium.woff2`
- `assets/vendor/fonts/JetBrainsMono-Bold.woff2`
- `assets/vendor/fonts/JETBRAINS-OFL.txt`

`index.html` 只 preload Regular 字重；Medium / Bold 按 CSS 实际需要加载。所有字体均为同源请求。

中文字体栈继续使用系统字体，例如苹方、微软雅黑 UI、Noto Sans CJK SC 等，因此服务器名称和地区名称不会因为自带 CJK 字库而增加首屏体积。

## 来源与许可

JetBrains Mono:
https://github.com/JetBrains/JetBrainsMono

字体按 SIL Open Font License 1.1 分发，完整许可保存在：
`assets/vendor/fonts/JETBRAINS-OFL.txt`

## 维护约束

- 不引入 Google Fonts、jsDelivr 等字体 CDN。
- 不重新加入 Geist / Atlas UI，除非确实有明确收益并同步更新测试。
- 新增字体文件时必须同步保留对应许可证。
- 运行 `npm.cmd test` 会检查 CSS 引用的本地字体文件是否真实存在。
