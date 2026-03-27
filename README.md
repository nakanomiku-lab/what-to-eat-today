# 今天吃什么

一个基于 Vite、React、TypeScript、Tailwind CSS 和 Electron 的餐食推荐应用。

## 技术栈

- Vite 5
- React 18
- TypeScript
- Tailwind CSS
- Lucide React
- Electron

## 本地开发

1. 安装依赖

```bash
npm install
```

2. 启动网页开发环境

```bash
npm run dev
```

这条命令现在会同时启动：
- Vite 前端开发服务器
- 本地高德代理服务

3. 启动桌面开发环境

```bash
npm run dev:desktop
```

4. 构建网页版本

```bash
npm run build
```

5. 打包 Windows 安装程序

```bash
npm run package:win
```

6. 预览网页构建产物

```bash
npm run preview
```

## 桌面定位说明

地图页在 Electron 桌面版里会优先使用 Windows 原生定位，不需要用户手动填写定位密钥。

- 如果定位没有成功，通常是 Windows 的“位置服务”没有开启
- 地图页里已经提供了“打开 Windows 定位设置”的按钮
- 如果实时定位还是拿不到结果，可以手动选择一个城市并保存成默认地点
- 也可以手动输入地址并搜索候选结果，再把选中的地址保存成默认地点
- 之后再次定位失败时，地图会自动回退到你保存的默认地点
- 如果在浏览器里单独调试网页版本，则仍然走浏览器自己的定位权限流程

## 国内地址精确搜索

桌面版和网页端地图搜索都已经切到高德链路，适合搜索国内地址、小区、商场和地标。

1. 在项目根目录创建 `.env.local`
2. 填入下面这一项

```bash
AMAP_WEB_SERVICE_KEY=你的高德Web服务Key
```

- Electron 启动器和网页端本地代理都会自动读取 `.env` 和 `.env.local`
- 这个 Key 只需要项目开发者配置一次，不需要应用用户手动输入
- 当前地图搜索会同时用到高德 `地理编码`、`关键字搜索` 和 `输入提示`
- 网页端不再把高德 Key 暴露到前端，而是通过本地代理 `/api/amap/*` 转发
- 当前地图底图仍然是 OpenStreetMap，所以程序内部会把高德返回的 GCJ-02 坐标转换后再落到地图上

## 项目结构

```text
docs/         历史说明文档与保留资料
electron/     Electron 主进程与预加载脚本
src/          前端源码
src/components/  UI 组件
src/data/        静态菜谱数据
src/services/    推荐与搜索逻辑
src/utils/       工具函数
src/legacy/      暂时保留但未接入的旧文件
src/App.tsx      应用主流程
src/electron-env.d.ts  Electron 全局类型声明
src/index.tsx    应用入口
src/index.css    全局样式与 Tailwind 入口
```

## 常用脚本

```text
npm run dev           启动 Vite + 本地高德代理
npm run dev:desktop   启动 Electron + Vite 桌面开发
npm run dev:proxy     单独启动网页端高德代理
npm run build         构建网页产物到 dist/
npm run package       打包当前平台桌面应用
npm run package:win   打包 Windows 安装程序
npm run package:dir   生成未压缩桌面产物
npm run start:proxy   启动本地高德代理
npm run start:desktop 使用现有 dist/ 启动 Electron
```

## 打包说明

- Windows 打包产物默认输出到 `release/`
- 当前项目可以继续按 React/Vite 方式开发，Electron 只负责桌面壳和打包
- 如果想自定义应用图标，可以后续补充 Windows `.ico` 文件并接入 Electron Builder 配置

## 遗留文件说明

- `src/legacy/RestaurantDisplay.tsx` 当前没有任何引用，属于旧的餐厅展示方向遗留代码，先保留未删除
- `docs/legacy/metadata.json` 当前不参与 Vite 或 Electron 运行链路，属于早期导出残留，先保留未删除
