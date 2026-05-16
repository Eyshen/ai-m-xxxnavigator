# Frontend

这个前端现在走的是“轻量演示站”路线：

- 容易部署
- 容易改 UI
- 不搞复杂框架设计
- 保留 React 只是为了状态切换更直接

底座依然是 `Vite + React + TypeScript`，但实际改动入口尽量收敛到少数文件，方便快速迭代展示。

## 你平时主要改哪几个文件

### 1. 改页面数据

优先改：

- `docs/frontend/display-data.json`

这里集中放：

- 项目列表
- 三个阶段定义
- 实验 loops
- 默认页面状态
- 交付选项

前端源码中的：

- `src/data/mockData.ts`

现在只负责读取和适配这份 JSON 数据，不再保存页面展示常量。

### 2. 改交互流程

优先改：

- `src/pages/WorkspacePage.tsx`

这里集中处理：

- 文件上传
- 提交需求
- 自动实验轮次控制
- 阶段切换
- 结果展开
- 进入交付

### 3. 改 UI 和科技感主题

优先改：

- `src/styles/global.css`

这一个文件基本控制了：

- 全局主题色
- 卡片样式
- 按钮样式
- 阶段进度视觉
- 表单控件
- 响应式布局

如果只是想快速改展示效果，通常只要动这 3 个文件就够了：

1. `docs/frontend/display-data.json`
2. `src/pages/WorkspacePage.tsx`
3. `src/styles/global.css`

## 为什么还保留 React

不是为了做复杂架构，而是为了这几个好处：

- 页面状态切换比纯静态 HTML 更顺手
- 后面接真实数据时不用重做页面
- 打包后仍然是标准静态站，部署很轻

## 本地运行

建议 Node 版本：

```bash
>= 20.19.0
```

在 `apps/frontend` 目录执行：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 部署方式

这是标准静态前端，适合直接部署到：

- Vercel
- Netlify
- 静态 Nginx
- 任意能托管 `dist/` 的平台

构建输出目录：

```bash
dist/
```

## 当前设计方向

这版主题已经往“科技感演示产品”方向收了：

- 冷色主基调
- 蓝青发光感
- 深色玻璃卡片
- 更突出阶段进度和数据状态

如果你后面还想继续压缩复杂度，可以再往前走一步，把组件继续合并，保留少量页面级组件即可。
