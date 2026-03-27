# 项目记忆文档

最后更新：2026-03-27

这份文档用于保存当前项目的重要背景信息，避免聊天上下文轮换后丢失决策、约束和已知问题。

## 当前定位

- 项目已经整理为一个可继续开发的 `Vite + React + TypeScript + Tailwind CSS + Electron` 桌面应用。
- 前端源码集中在 `src/`。
- Electron 桌面壳集中在 `electron/`。
- 历史说明文档集中在 `docs/`。
- 遗留但暂不删除的旧文件放在 `src/legacy/` 和 `docs/legacy/`。

## 当前目录约定

```text
docs/           历史说明与项目记忆文档
electron/       Electron 主进程、预加载与启动脚本
src/            React 前端源码
src/components/ 界面组件
src/data/       静态菜谱数据
src/services/   推荐与搜索逻辑
src/utils/      工具函数
src/legacy/     暂时保留的旧文件
```

## 已完成的关键整理

### 1. 项目已清成标准 Vite 结构

- 入口页面使用 `index.html` + `src/index.tsx`。
- 样式入口使用 `src/index.css`。
- `tailwind.config.cjs` 已改为扫描 `src/**/*`。
- `tsconfig.json` 已改为以 `src/` 为主。

### 2. 已接入 Electron，可继续开发和打包

- 桌面入口：`electron/main.cjs`
- 预加载脚本：`electron/preload.cjs`
- 启动封装：`electron/launch.cjs`
- Windows 打包命令：`npm run package:win`
- 产物输出目录：`release/`

常用命令：

```bash
npm run dev
npm run dev:desktop
npm run build
npm run package:win
```

### 3. 已修复桌面开发环境空白页与端口占用问题

原因和处理：

- Vite 开发服务固定为 `127.0.0.1:5173`，避免 IPv4/IPv6 地址不一致。
- Electron 在开发模式下等待 `http://127.0.0.1:5173` 可访问后再启动。
- 新增 `electron/cleanup-dev.cjs`，在 `npm run dev:desktop` 前先清理当前项目残留的旧 Vite、Electron、nodemon、concurrently 进程。

相关文件：

- `vite.config.ts`
- `package.json`
- `electron/cleanup-dev.cjs`

### 4. 已处理部分本机环境变量干扰

某些环境下如果存在以下变量，Electron 可能被当作纯 Node 启动：

- `ELECTRON_RUN_AS_NODE=1`
- `ELECTRON_FORCE_IS_PACKAGED=true`

`electron/launch.cjs` 会在启动桌面应用前清理这些变量，避免 Electron 无法正常拉起窗口。

## 当前保留但尚未删除的遗留文件

这些文件目前没有删，因为用户要求先说明原因，再决定是否删除。

### 建议可删

- `src/legacy/RestaurantDisplay.tsx`
  - 当前没有任何引用，文件本身也标注为废弃。
- `docs/legacy/metadata.json`
  - 当前 Vite、Electron 和构建脚本都不会读取它。

### 可按需再决定是否删除

- `docs/structure.md`
  - 历史结构说明文档，不参与运行。
- `docs/v1.5.md`
  - 历史版本说明文档，不参与运行。
- `vercel.json`
  - 仅用于网页部署；如果项目以后只保留桌面版，可以删除。
- `package.json` 中的 `predeploy`、`deploy` 脚本和 `gh-pages`
  - 仅用于网页发布；如果不再做网页部署，可以删除。

## 当前技术判断

### 是否需要“减少一种语言”

当前代码里真正额外的一层主要是 Electron 相关的 `.cjs`。

结论：

- 目前不建议为了统一而强行改掉 `.cjs`。
- 现阶段更重要的是保持桌面开发和打包稳定。
- 如果以后要做统一，优先级也应低于功能开发和结构精简。

### 是否适合做成本地软件

结论：适合，而且已经完成 Electron 化。

- 日常开发仍然围绕 React/Vite 源码进行。
- `.exe` 只是发布产物，不影响继续开发。
- 每次改完代码后重新打包即可生成新的安装包。

## 已讨论过但尚未实施的方向

### 地图页面 + 附近商家

技术上可行，适合给当前项目新增一个地图页。

推荐方向：

- 地图展示优先接高德地图 Web API。
- 若要拿官方外卖平台商家数据，优先研究饿了么开放平台。
- 美团更像需要合作接入，不建议碰消费者 App 私有接口。

实施优先级建议：

1. 先做地图页与附近餐饮 POI 标点。
2. 再决定是否接平台商家详情或跳转能力。

## 最新进展

### 2026-03-22：已加入地图原型页

- 主界面新增了一个“看看附近吃什么”的入口按钮。
- 新增 `MAP` 视图状态，不影响原本的选餐、搜索、结果流。
- 新增 `src/components/MapView.tsx`，当前能力包括：
  - 显示可交互地图
  - 尝试获取用户定位
  - 在地图上显示当前位置或默认城市中心
  - 展示一组“附近觅食灵感点”演示标记
- 当前地图页是原型版，点位不是外卖平台真实商家数据。
- 当前原型使用 OpenStreetMap 底图和 Leaflet 渲染，后续如要接中国本地真实 POI，更适合切到高德地图或接官方平台接口。

### 2026-03-22：地图页已切到 Windows 原生定位

- Electron 主进程通过 IPC 调用 Windows 原生定位接口，不再依赖 `GOOGLE_API_KEY`。
- 地图页在桌面端优先走 `windows-native` 定位，在浏览器调试时才退回浏览器定位。
- 地图页现在会区分以下几类情况：
  - Windows 定位服务未能启动
  - Windows 暂未返回可用位置
  - 浏览器权限被拒绝
  - 浏览器定位超时或位置不可用
- 地图页提供了“打开 Windows 定位设置”的按钮，便于用户直接去系统里开启位置服务。

### 2026-03-22：地图页已加入定位兜底

- 新增内置城市兜底点数据：`src/data/fallbackLocations.ts`
- 地图页支持手动选择城市作为兜底位置
- 地图页支持手动输入地址并搜索候选结果
- 选中的城市可以保存为“默认地点”
- 选中的地址也可以保存为“默认地点”
- 以后如果系统实时定位失败，会优先自动回退到保存过的默认地点

### 2026-03-27：桌面版地址搜索已切到高德

- Electron 地址搜索由 `Nominatim` 改为高德 Web 服务，优先覆盖国内详细地址、商场、小区和地标
- 主进程会同时请求高德地理编码和地点检索，再合并候选结果
- 地图页输入框新增了高德输入提示联想，点联想后可直接定位，或继续触发更精确搜索
- 由于当前底图仍是 OpenStreetMap，主进程里新增了 `GCJ-02 -> WGS84` 转换，避免中国区标点明显偏移
- `electron/launch.cjs` 重新补上了 `.env` / `.env.local` 读取，便于本地放置 `AMAP_WEB_SERVICE_KEY`
- 浏览器单独调试时暂时仍保留原有轻量地址搜索兜底；桌面版是当前优先支持的精确搜索形态

### 2026-03-27：网页端已切到本地高德代理

- 新增 `server/amap-proxy.cjs`，网页端不再直接请求第三方服务，而是走本地 `/api/amap/*` 代理
- `npm run dev` 现在会同时启动 `Vite + 本地高德代理`
- Vite 开发服务器新增 `/api` 代理到 `127.0.0.1:5174`
- 网页端地址搜索与输入提示已改为通过代理请求高德，不再把 Key 暴露到前端

### 2026-03-27：地图页布局已重排

- 去掉了手动城市筛选和推荐城市列表，保留地址搜索与默认地点能力
- 地图改成页面顶部的大幅主视觉，进入地图页后先看到地图
- 地址搜索框改到地图左上角，输入提示和搜索结果都跟随显示在地图上方
- 默认地点操作与附近点位列表被下移到地图下方，结构更聚焦

## 用户协作偏好

- 在删除“看起来没用”的文件前，先说明删除原因，再动手。
- 优先把项目整理清楚，再做下一步功能扩展。

## 后续可选动作

按优先级从高到低：

1. 清理桌面版不再需要的网页部署配置。
2. 给 Electron 配置自定义应用图标和安装包图标。
3. 确认是否删除 `src/legacy/` 与 `docs/legacy/` 内的历史残留。
4. 评估是否新增地图页。

## 建议查看顺序

新一轮接手时，优先看这些文件：

1. `README.md`
2. `docs/project-memory.md`
3. `package.json`
4. `vite.config.ts`
5. `electron/main.cjs`
6. `src/App.tsx`
