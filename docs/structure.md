# 今天吃什么 v1.5 开发结构基线

> 归档说明：本文件保留的是整理前的结构分析快照。当前项目源码已统一迁移到 `src/`，请结合根目录 `README.md` 一起看。

## 使用约定

- 本文件用于后续改动前快速复盘项目结构。
- 每次接到更改计划，先读本文件的“目录结构”“模块职责”“调用链”“注意事项”。
- `v1.5.md` 负责讲“项目是什么”，本文件负责讲“代码怎么组织”。

## 1. 目录总览

```text
今天吃什么-(what-to-eat)1.5/
├── App.tsx
├── index.tsx
├── index.html
├── index.css
├── types.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── metadata.json
├── 项目企划分析书.md
├── 2025_SHU_AI_Contest_Report.md
├── tables.md
├── project_structure_optimized
├── structure_viz.png
├── generate_visualizations.py
├── components/
├── services/
├── data/
└── visualize/
```

## 2. 运行结构

### 启动入口

1. `index.html`
   - 提供 `#root`
   - 引入 Tailwind CDN
   - 引入字体
   - 加载 `index.tsx`
2. `index.tsx`
   - 创建 React 根节点
   - 渲染 `<App />`
3. `App.tsx`
   - 作为整个应用状态中心
   - 分发到选择页、加载页、搜索页、结果页

## 3. 状态结构

### `App.tsx` 中的核心状态

- `appState`
  - `'SELECTION'`
  - `'LOADING'`
  - `'RESULT'`
  - `'SEARCH'`
  - `'PREFERENCES'` 仅在类型中保留，当前未实际使用
- `selectedMeal`
  - `早餐 / 午餐 / 晚餐`
- `currentDishes`
  - 当前展示的菜品数组
- `loadingMessage`
  - 加载态文案
- `searchResults`
  - 搜索结果列表
- `searchQuery`
  - 当前搜索词
- `preferences`
  - `{ likes: [], dislikes: [] }`

### 页面切换逻辑

- 首页：`SELECTION`
- 加载：`LOADING`
- 结果：`RESULT`
- 搜索页：`SEARCH`

## 4. 目录与文件职责

## 根目录文件

### `App.tsx`

- 职责：
  - 统一管理页面状态和交互流程
  - 调用推荐与搜索服务
  - 处理历史记录保存
  - 把菜谱包装成带图片 URL 的展示对象
- 主要方法：
  - `handleMealSelect`
  - `fetchDish`
  - `prepareDishes`
  - `handleReplaceSingleDish`
  - `handleSearch`
  - `handleSelectFromResult`
  - `handleBack`
  - `handleRestart`
  - `handleBackToSearch`
  - `handleRegenerate`
- 依赖：
  - `./types`
  - `./components/*`
  - `./services/geminiService`
  - `./services/historyService`
  - `lucide-react`

### `index.tsx`

- 职责：
  - React 应用挂载入口
- 风险点：
  - 若 `#root` 不存在会直接抛错

### `index.html`

- 职责：
  - 定义 HTML 壳
  - 注入字体与 Tailwind CDN
  - 提供 importmap
- 结构意义：
  - 这是页面视觉风格的底层入口之一
- 注意：
  - importmap 与 Vite npm 构建共存，属于混合式配置

### `index.css`

- 职责：
  - 提供 Tailwind 指令
  - 保留 Vite 默认全局样式
- 当前问题：
  - `:root` 和 `body` 仍是模板默认值
  - 与项目实际 UI 体系不完全一致

### `types.ts`

- 职责：
  - 定义全局枚举与接口
- 内容：
  - `MealType`
  - `Recipe`
  - `GeneratedDish`
  - `Restaurant`
  - `UserPreferences`
  - `AppState`
- 注意：
  - `Restaurant` 当前未被业务主流程使用
  - `AppState` 中 `PREFERENCES` 未使用

### `package.json`

- 职责：
  - 定义项目脚本和依赖
- scripts：
  - `dev`
  - `build`
  - `preview`
- dependencies：
  - `react`
  - `react-dom`
  - `lucide-react`
  - `@google/genai`
- devDependencies：
  - `typescript`
  - `vite`
  - `@vitejs/plugin-react`
  - `@types/node`
  - `@mermaid-js/mermaid-cli`

### `package-lock.json`

- 职责：
  - 锁定 npm 安装依赖树
- 备注：
  - 自动生成，不是业务逻辑文件

### `tsconfig.json`

- 职责：
  - TypeScript 编译行为配置
- 特点：
  - `moduleResolution: bundler`
  - `jsx: react-jsx`
  - `allowJs: true`
  - `noEmit: true`
  - `@/*` 指向项目根目录

### `vite.config.ts`

- 职责：
  - 配置 Vite 开发服务器与别名
- 内容：
  - 端口 `3000`
  - host `0.0.0.0`
  - `@` 别名到项目根
  - 通过 `define` 注入 `process.env.API_KEY` 和 `process.env.GEMINI_API_KEY`
- 注意：
  - 这些环境变量当前代码中并未真正消费

### `metadata.json`

- 职责：
  - 记录项目名称和描述
- 描述和代码存在轻微偏差：
  - 写了 “generates real recipes and images”
  - 实际图片并非真实生成

## `components/`

### `components/MealSelector.tsx`

- 职责：
  - 展示早餐、午餐、晚餐三个入口卡片
- 输入：
  - `onSelect`
  - `disabled`
- 输出：
  - 回传 `MealType`
- 特征：
  - 完全表现层组件

### `components/SearchBar.tsx`

- 职责：
  - 处理搜索输入和提交
- 内部状态：
  - `query`
  - `isFocused`
- 输出：
  - 提交时调用 `onSearch(query)`

### `components/PreferenceSelector.tsx`

- 职责：
  - 展示用户喜欢/不喜欢食材
  - 随机抽取标签候选项
- 依赖：
  - `COMMON_INGREDIENTS`
- 逻辑：
  - 组件初始化时从公共食材池切出两组候选
  - `toggleLike` 与 `toggleDislike` 保证互斥
  - 可“换一批”
  - 可重置
- 注意：
  - 偏好只存在 App 状态，不持久化

### `components/RecipeList.tsx`

- 职责：
  - 呈现搜索结果列表
- 输入：
  - `results`
  - `onSelect`
  - `onBack`
  - `query`
- 特征：
  - 空结果态已实现

### `components/DishDisplay.tsx`

- 职责：
  - 结果页核心组件
  - 同时负责单菜模式和套餐模式
- 内部子结构：
  - `SingleDishCard`
  - `SingleDishContent`
- 功能：
  - 返回
  - 重新生成
  - 替换单道菜
  - 切换食材/步骤
  - 展开/收起
  - 分享
- 注意：
  - 分享生成的是文本摘要，不是图片海报

### `components/LoadingSpinner.tsx`

- 职责：
  - 加载中视觉反馈

### `components/RestaurantDisplay.tsx`

- 职责：
  - 餐厅推荐卡片 UI
- 当前状态：
  - 存在但未接入 `App.tsx`
  - 可以视为预留组件或残留组件

## `services/`

### `services/geminiService.ts`

- 实际定位：
  - 本地推荐引擎
  - 不是 Gemini SDK 调用层
- 导出：
  - `COMMON_INGREDIENTS` 复导出
  - `generateRecipe`
  - `generateSingleSideDish`
  - `searchRecipes`
- 内部核心：
  - `levenshteinDistance`
  - `getSimilarity`
  - `calculateScore`
  - `smartRecommend`
- 责任：
  - 搜索匹配
  - 偏好加权
  - 禁忌过滤
  - 套餐组装

### `services/historyService.ts`

- 导出：
  - `saveHistory`
  - `getHistory`
  - `exportHistoryToJSON`
- 存储：
  - `localStorage`
  - key 为 `what_to_eat_history`
- 行为：
  - 最新记录插到最前面
  - 最多保存 50 条

## `data/`

### `data/recipes.ts`

- 角色：
  - 唯一业务数据源
- 导出：
  - `COMMON_INGREDIENTS`
  - `BREAKFAST_RECIPES`
  - `MEAT_RECIPES`
  - `VEG_RECIPES`
  - `SOUP_RECIPES`
- 数据量：
  - 早餐 33
  - 荤菜 28
  - 素菜 22
  - 汤 10
  - 总计 93
- 数据特点：
  - 全部硬编码在单文件
  - 菜谱字段统一
  - 维护简单，但扩展性一般

## 文档与结构资产

### `项目企划分析书.md`

- 产品定位、痛点、解决方案、实施阶段说明

### `2025_SHU_AI_Contest_Report.md`

- 对外展示型研究报告

### `tables.md`

- 当前项目的无关残留文稿

### `project_structure_optimized`

- Graphviz 结构图源
- 与当前目录存在偏差

### `structure_viz.png`

- 项目结构图图片

## `visualize/`

### 公共配置

- `visualize/style_config.py`
  - 统一 Matplotlib / Seaborn 风格

### 报告图脚本

- `plot_recipe_dist.py`
  - 菜系分布图
- `plot_scoring.py`
  - 评分机制图
- `plot_performance.py`
  - 性能对比图
- `plot_radar.py`
  - 用户偏好雷达图
- `plot_efficiency.py`
  - 决策效率与食材利用率图
- `plot_dietary_situation.py`
  - 饮食现状图
- `plot_food_waste.py`
  - 食物浪费图
- `plot_knowledge_base.py`
  - 知识库结构图
- `plot_search_safety.py`
  - 模糊搜索与禁忌拦截图
- `plot_system_flow.py`
  - 系统流程图正式版
- `plot_system_flow_simple.py`
  - 流程图简版备份
- `plot_system_flow_vivid_rejected.py`
  - 更具视觉表现的流程图废案
- `plot_ui_concept.py`
  - 多设备 UI 概念图

### 图像资产

- `figure1_recipe_distribution.png`
- `figure2_scoring_algorithm.png`
- `figure3_performance.png`
- `figure4_user_radar.png`
- `figure5_efficiency.png`
- `figure6_dietary_status.png`
- `figure7_food_waste.png`
- `figure9_knowledge_base.png`
- `figure11_system_flow.png`

说明：

- 某些脚本输出文件并未出现在当前目录里，例如：
  - `figure8_ui_concept.png`
  - `figure10_search_safety.png`
- 这意味着脚本和已提交产物并不完全同步。

## 5. 模块调用链

### 首页推荐链路

```text
MealSelector / PreferenceSelector
  -> App.tsx handleMealSelect
  -> fetchDish
  -> services/geminiService.generateRecipe
  -> data/recipes.ts
  -> App.tsx prepareDishes
  -> services/historyService.saveHistory
  -> DishDisplay
```

### 搜索链路

```text
SearchBar
  -> App.tsx handleSearch
  -> services/geminiService.searchRecipes
  -> data/recipes.ts
  -> RecipeList
  -> handleSelectFromResult
  -> DishDisplay
  -> historyService.saveHistory
```

### 套餐换菜链路

```text
DishDisplay onReplaceDish
  -> App.tsx handleReplaceSingleDish
  -> services/geminiService.generateSingleSideDish
  -> App.tsx prepareDishes
  -> historyService.saveHistory
```

### 历史导出链路

```text
Header 导出按钮
  -> historyService.exportHistoryToJSON
  -> localStorage
  -> 下载 JSON 文件
```

## 6. 当前项目的结构现实

### 强项

- 单页应用结构简单直接
- 组件职责相对清楚
- 本地推荐服务与 UI 分层尚可
- 报告图脚本与主应用代码分开，互不干扰

### 结构问题

- `data/recipes.ts` 过于集中，后续扩容会很难维护
- `geminiService.ts` 命名错误，会误导理解
- 存在未接入组件和类型
- 视觉样式部分分散在：
  - `index.html`
  - `index.css`
  - `App.tsx`
  - 各组件类名
- 报告材料、结构图和源码之间有多处版本漂移

## 7. 后续修改前的检查清单

- 先看 `v1.5.md`，确认本次修改是在“真实已实现功能”上扩展，而不是被比赛文档带偏。
- 再看本文件，确认将要修改的模块处在哪条调用链上。
- 如果改动推荐逻辑，优先检查：
  - `services/geminiService.ts`
  - `data/recipes.ts`
  - `App.tsx`
- 如果改动结果页，优先检查：
  - `components/DishDisplay.tsx`
  - `App.tsx`
- 如果改动搜索与偏好，优先检查：
  - `components/SearchBar.tsx`
  - `components/PreferenceSelector.tsx`
  - `services/geminiService.ts`
- 如果改动报告材料或结构图，优先检查：
  - `项目企划分析书.md`
  - `2025_SHU_AI_Contest_Report.md`
  - `project_structure_optimized`
  - `visualize/*.py`

## 8. 必记事项

- 当前版本是 `v1.5` 项目根目录里的前端原型，不是一个完整后端系统。
- 开发结构最关键的三层是：
  - `App.tsx` 状态调度
  - `services/` 规则逻辑
  - `data/recipes.ts` 本地知识库
- 以后任何修改都要先回读本文件和 `v1.5.md`，避免出现重大结构偏差。
