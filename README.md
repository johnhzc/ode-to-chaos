# 从 ODE 到混沌的动力学分析

一个交互式的非线性动力学可视化教学网站：从常微分方程（ODE）的驻点分析出发，经过分岔与 Lyapunov 指数，一路走进混沌。所有公式使用 KaTeX 按国标 / LaTeX 标准渲染，所有相图、分岔图均为浏览器端实时数值计算。

**在线访问**：<https://johnhzc.github.io/ode-to-chaos/>

**代码仓库**：[Gitee](https://gitee.com/kongjingnengbai/ode-to-chaos)（主仓库）· [GitHub](https://github.com/johnhzc/ode-to-chaos)（镜像 + Pages 托管）

## 功能概览

| 模块 | 内容 |
|------|------|
| 分析路线 | 完整推导流程：建立 ODE/映射 → 标准形式 → 驻点分析 → Jacobi 矩阵 / Lyapunov 直接法 → 稳定性判断 → 分岔分析 → 混沌判据；悬停查看案例方程，点击展开完整 KaTeX 推导 |
| 驻点分析 · 线性系统 | 特征值 / 特征向量求解的 5 步推导卡片，特征向量趋势线（蓝=稳定、红=不稳定），参数滑杆实时演化 |
| 驻点分析 · 非线性系统 | 范德波尔、Duffing、单摆、Lotka-Volterra 等参数化模型，驻点实时求解并按性质标注 |
| 混沌系统 | Lorenz 吸引子（3D 相图，可拖动旋转视角）、Duffing 振子（分岔图 + Melnikov 判据）、马蹄映射；周期 → 混沌预设 + 参数滑杆 |
| 离散映射 | Logistic 映射与 Tent 映射，可点击分岔图、Lyapunov 指数谱，经典周期/混沌参数预设 |

## 本地开发

```bash
npm install
npm run dev        # 开发服务器，默认 http://localhost:3000
npm run build      # 类型检查 + 生产构建到 dist/
npm run preview    # 本地预览构建产物
```

Windows 下也可以直接双击 `启动网页.bat`。

## 部署

仓库使用双分支结构（Gitee 与 GitHub 一致）：

- `main` — 源代码
- `gh-pages` — 构建产物（由脚本自动生成，请勿手动修改）

### GitHub Pages（当前线上站点）

GitHub Pages 免费对公开仓库开放，是本项目的线上托管方式。由于本机网络访问不了 github.com 的 git 端口，推送走 **REST API**（`api.github.com` 正常）：

```bash
git add -A && git commit -m "改动说明" && git push   # 1. 推送源码到 Gitee
npm run deploy:github                                # 2. 构建 + 同步 GitHub + 发布 Pages
```

`npm run deploy:github` 执行 `scripts/deploy-github.bat`：自动从本机 git 凭据库取 GitHub token（不落盘、不打印），由 `deploy-github.mjs` 通过 Git Data API 将 `main` 和 `gh-pages` 各打成单个提交推送，并自动启用 Pages（gh-pages 分支），无需任何网页操作。推送后约 1 分钟站点生效。

### Gitee Pages（备选，需 Pro）

Gitee 已对个人免费用户下线 Pages。若将来开通 Pro：

```bash
npm run deploy          # 构建并推送 gh-pages 到 Gitee
```

然后到 仓库 → 服务 → Gitee Pages 手动点"更新"；或 `set GITEE_TOKEN=你的token` 后执行 deploy，脚本会自动调 API 触发重建。

## 技术栈

React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui · KaTeX · Canvas 2D 数值积分（RK4 / 直接迭代）
