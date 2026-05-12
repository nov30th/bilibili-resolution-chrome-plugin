# B站 / 抖音 自动最高清晰度 Chrome 插件

## 功能介绍

这是一个 Chrome 扩展插件，自动为视频与直播页面切换到最高清晰度。当前支持：

- **哔哩哔哩**（`www.bilibili.com/video/*`）：视频自动选最高画质，可选是否启用大会员专属档位
- **抖音视频**（`www.douyin.com/*`）：精选页 / 视频详情页 / 推荐流自动按播放器档位顺序选最高画质
- **抖音直播**（`live.douyin.com/<roomId>`）：直播间自动切换到最高画质（原画 / 蓝光等）

### 主要特性

- 🎬 **自动选择最高清晰度**：页面加载后自动切到最高可用画质
- 🎮 **平台级开关**：在弹窗里独立开关 B站 / 抖音视频 / 抖音直播三个适配器
- 👑 **B站会员/非会员模式**：可选是否使用大会员专属清晰度（4K、HDR、杜比视界等）
- 🔄 **智能重试机制**：首次未就绪时自动重试，最多 10 次
- 🎯 **手动触发**：弹窗按钮可手动触发当前页的清晰度选择
- 🔁 **SPA 导航感知**：在同一站内切视频 / 切直播间时自动重新选择

## 安装方法

### 步骤 1：生成图标文件

1. 在浏览器中打开 `generate-icons.html`
2. 点击每个 canvas 下载图标：
   - icon16.png
   - icon48.png
   - icon128.png
3. 将下载的图标保存到插件根目录

### 步骤 2：加载插件

1. 打开 Chrome 浏览器
2. 地址栏访问 `chrome://extensions/`
3. 打开右上角「开发者模式」开关
4. 点击「加载已解压的扩展程序」
5. 选择本插件所在文件夹
6. 安装成功后会在扩展程序列表中显示

## 使用方法

### 自动模式

安装后，访问任意支持的页面即可自动切换：

- B站视频：`https://www.bilibili.com/video/BVxxxxx`
- 抖音视频：`https://www.douyin.com/...`（首页推荐流、视频详情、精选页等）
- 抖音直播：`https://live.douyin.com/<roomId>`

打开 F12 控制台可看到适配器的运行日志。

### 配置选项

点击浏览器工具栏上的插件图标，打开设置面板：

**B站组**
- **启用 B站适配器**：总开关
- **选择会员最高清晰度**（嵌套子选项）：
  - ✅ 开启：包含大会员专属画质（4K、HDR、杜比视界等）
  - ❌ 关闭：仅在非会员画质中选最高

**抖音组**
- **启用抖音视频**：总开关
- **启用抖音直播**：总开关

平台开关在下次页面加载时生效。B站的会员开关会即时应用到当前页。

### 手动触发

点击插件图标 → 「立即选择最高清晰度」按钮，可手动触发当前页的清晰度选择（受平台开关约束）。

## 文件结构

```
bilibili-resolution-chrome-plugin/
├── manifest.json            # MV3 配置：host_permissions / content_scripts 路由
├── content.js               # 通用入口：读取存储、调度 adapter、监听 popup 消息
├── common/
│   └── retry.js             # 共享重试、alive/defer/guard/t 辅助工具
├── adapters/
│   ├── bilibili.js          # B站视频页适配器
│   ├── douyin-video.js      # 抖音视频页适配器
│   └── douyin-live.js       # 抖音直播间适配器
├── popup.html               # 弹窗页面
├── popup.css                # 弹窗样式
├── popup.js                 # 弹窗逻辑（平台开关、状态、手动触发）
├── _locales/
│   ├── zh_CN/messages.json  # 中文文案
│   └── en/messages.json     # 英文文案
├── generate-icons.html      # 图标生成器
├── icon16.png / 48 / 128.png
└── README.md
```

## 工作原理

1. **平台路由**：`manifest.json` 的 `content_scripts` 按 URL 分发，每个平台只加载对应适配器 + `content.js` + `common/retry.js`
2. **适配器自注册**：各平台脚本把自己挂到 `window.__resolutionAdapter`，由 `content.js` 统一调度生命周期
3. **就绪检测**：通过 `runWithRetry` 反复探测播放器 / 清晰度容器是否渲染好，最多 10 次（每秒 1 次）
4. **清晰度识别与选择**：
   - **B站**：扫描 `.bpx-player-ctrl-quality-menu-item`，按 `data-value` 选最大值；可选过滤 VIP 项
   - **抖音视频**：扫描 `.xgplayer-playclarity-setting .item`，跳过「智能/自动」，取 DOM 顺序第一个（最高档）
   - **抖音直播**：定位 `.QualitySwitchNewPlugin > [data-e2e="quality-selector"]`，取其子节点 DOM 顺序第一个（原画 > 蓝光 > 超清 > 高清 > 标清）
5. **模拟交互**：通过 hover 展开菜单 → 模拟点击对应档位
6. **SPA 切换感知**：观察 `<title>` 变化 / DOM mutation，路由切换后自动重新选择

## 注意事项

1. **会员清晰度**：B站若选会员档位但账号非大会员，可能无法播放
2. **抖音直播**：未开播 / 加载中的直播间没有清晰度菜单，适配器会重试至超时
3. **页面刷新**：偶现需要刷新页面才能生效
4. **兼容性**：依赖三家站点当前的播放器结构，对方更新 UI 可能需要插件跟进
5. **权限说明**：
   - `storage`：保存用户的平台开关与 VIP 设置
   - `activeTab`：弹窗手动触发时识别当前页
   - `host_permissions`：仅在 `www.bilibili.com`、`www.douyin.com`、`live.douyin.com` 域下注入

## 故障排除

### 插件不工作？

1. 确认 URL 匹配（B站需在 `/video/` 路径下，抖音直播需在 `live.douyin.com/<roomId>` 而非根路径）
2. 弹窗里检查对应平台开关是否开启
3. F12 控制台查看是否有报错
4. 尝试刷新页面

### 清晰度选择失败？

1. 确认视频 / 直播已开始加载
2. B站若启用会员档位，确认账号是否为大会员
3. 抖音直播未开播时菜单不渲染，开播后会自动重试
4. 点击插件图标里的「立即选择最高清晰度」手动触发

### 重新加载扩展后报 "Extension context invalidated"？

旧标签页里残留的孤儿 content script 会触发这个错误。**完全关闭** 相关标签页（不是刷新）再重开即可。新版本已加 orphan 守卫，新加载的脚本会静默退出。

### 如何查看运行日志？

1. 视频 / 直播页面按 F12
2. 切到 Console 标签
3. 找带 `[bilibili]` / `[douyinVideo]` / `[douyinLive]` 标记的日志

## 更新日志

### v1.2.0 (2026-05)

- ✨ 新增抖音视频适配器（`www.douyin.com`），支持精选页、视频详情页、推荐流，支持 4K/2K 等高档位且不会向下切换
- ✨ 新增抖音直播适配器（`live.douyin.com`），自动切换到原画
- ✨ 弹窗改为三平台独立开关：B站、抖音视频、抖音直播
- 🌐 完整双语支持（中文、英文）
- 🛡️ 扩展 reload 后的 orphan content script 静默退出，不再刷屏报错

### v1.0.0 (2024-01)

- 🎉 首次发布，支持 B站自动选最高清晰度
- ✨ 会员/非会员模式切换
- ✨ 手动触发与视频切换检测

## 开发者信息

本插件使用原生 JavaScript 开发，不依赖任何第三方库。

### 技术栈

- Chrome Extension Manifest V3
- Vanilla JavaScript
- CSS3
- HTML5

### 架构要点

- **单一职责适配器**：每个站点一个 `adapters/<site>.js`，通过 `window.__resolutionAdapter` 自注册
- **平台路由由 manifest 完成**：每个页面只匹配一个 content_scripts 入口，运行时不需要 if-else 判定平台
- **共享重试 / 守卫**：`common/retry.js` 提供 `runWithRetry`、`alive`、`defer`、`guard`、`t` 等工具

### 贡献

欢迎提交 Issue 和 Pull Request！

## 免责声明

1. 本插件仅用于学习交流，请勿用于商业用途
2. 本插件不会收集任何用户数据
3. 使用本插件产生的任何问题由用户自行承担
4. 如有侵权请联系删除

## License

MIT License

---

Made with ❤️ for B站 & 抖音用户
