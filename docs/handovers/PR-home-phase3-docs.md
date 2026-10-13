# PR：第三阶段成员 B 交付文档补齐（PR #15 的后续）

> 分支 `feat/phase3-home-docs` @ `731d268` ｜ 基于 **最新** `team/main@98c7959` ｜ **纯文档改动，零代码改动**
>
> * PR 入口（团队仓库）：https://github.com/xiaojuju11/sino-wind/pull/new/feat/phase3-home-docs

## 一、为什么有第二个 PR

PR **#15 合并时（`98c7959`，parent2 = `532c9fb`）**，我的最后两个文档提交尚未推送，因此**没有进入 `team/main`**。
本 PR 用 cherry-pick 把这两个提交**干净地重放到最新主干上**，内容与 PR #15 合并前的分支一致，**不重复、不回退任何已合并内容**。

## 二、本 PR 交付内容

| 文件 | 说明 |
| :--- | :--- |
| `docs/handovers/ai-log-陈思卉-2026-10-13-phase3.md` | **AI 使用与人工贡献申报表**（按 `AI_USAGE_TEMPLATE.md` 填报，团队规定随代码提交，供队长汇总为竞赛申报材料） |
| `docs/handovers/PR-home-phase3.md` | 第三阶段 PR 说明（交付清单 / 验收自测表 / 待裁定事项），供 review 复用 |
| `docs/handovers/dev-B-home.md` | 记录八「需队长知悉」第 4 条的**口径更正** + 已知限制第 3 条更正 |
| `docs/handovers/CONTEXT-BRIEF.md` | 演示环境口径更正（原写「云端 404 影响答辩演示」，**已过时**） |
| `proof/demo-dryrun-yayan.js` | 真实 AI 演示彩排脚本（390px 走完整「输入 → 点按钮 → 真实 AI 回填 → 摘录入卷」链路） |
| `proof/phase3-home-real-ai-390.png` | 真实 AI 雅译结果实拍 |
| `proof/phase3-home-{light,dark,longtext,offline}-390.png` | 按最新代码重新生成的实拍证据（仅内部时间戳不同） |

## 三、⚠️ 重要口径更正（本 PR 的实际价值）

原文档写「云端后端 404 → 影响答辩演示」。**该结论已过时**，实测更正如下：

* `vite.config.js` 已有 `/api → http://127.0.0.1:3000` 代理，`http/index.js` 已改为 `VITE_API_BASE_URL || ''`（相对路径）；
* **本机答辩演示走本地真实 AI**，实测：`POST http://localhost:5174/api/deepseek/yayan` → **200 / 1.1~2.1s**，返回真实语句（非兜底）、**无「离线典范」徽标**；
* 云端 `120.26.186.48:3000` 实测 404 **仅影响「部署到公网」**，需队长 / A 重新部署后端。

若不合并本 PR，`team/main` 上的交接文档会一直是这个过时结论，后续接手者可能据此做无用功。

## 四、安全性说明（reviewer 可直接核对）

```
git diff --name-only team/main..feat/phase3-home-docs
→ 10 个文件全部位于 docs/ 与 proof/，无任何 src/ 代码文件

frontend/src/pages/Home.jsx   team/main 与 本分支 blob 完全一致（6709e6b）
frontend/src/styles/home.less team/main 与 本分支 blob 完全一致（68fa103）
```
**本 PR 不触碰任何生产代码**，`Home.jsx` / `home.less` 与主干逐字节相同。

## 五、合并方式

与 `team/main` **无冲突**，可 squash 或 merge 均可。合并后 `feat/phase3-home-polish` 会被完全包含（该分支已无独有内容）。
