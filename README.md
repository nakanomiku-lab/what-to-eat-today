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
npm run dev           仅启动 Vite 网页开发
npm run dev:desktop   启动 Electron + Vite 桌面开发
npm run build         构建网页产物到 dist/
npm run package       打包当前平台桌面应用
npm run package:win   打包 Windows 安装程序
npm run package:dir   生成未压缩桌面产物
npm run start:desktop 使用现有 dist/ 启动 Electron
```

## 打包说明

- Windows 打包产物默认输出到 `release/`
- 当前项目可以继续按 React/Vite 方式开发，Electron 只负责桌面壳和打包
- 如果想自定义应用图标，可以后续补充 Windows `.ico` 文件并接入 Electron Builder 配置

## 遗留文件说明

- `src/legacy/RestaurantDisplay.tsx` 当前没有任何引用，属于旧的餐厅展示方向遗留代码，先保留未删除
- `docs/legacy/metadata.json` 当前不参与 Vite 或 Electron 运行链路，属于早期导出残留，先保留未删除
