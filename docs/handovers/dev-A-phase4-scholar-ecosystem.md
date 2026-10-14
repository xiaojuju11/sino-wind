# 刘霞 · Phase 4 知音生态与藏牒阁

日期：2026-10-14。基线：origin/main `566c5f0`。分支：`feat/phase4-scholar-ecosystem`。

## 子任务一：藏牒阁与文阶

- GET `/api/deepseek/feihua/records?page=1&pageSize=8`：必须登录，仅查询本人已完成对局，按结算时间倒序；每页最多30条。
- GET `/api/deepseek/feihua/records/:id`：必须登录且本人已完成；不受开局十五分钟操作有效期影响。未完局和其他用户文牒返回404。
- 复用已有对局JSON，不新建重复档案、不重复发积分、不改原始唱和。文阶统一由后端 `scholarRank` 计算并返回 `scholar_rank` / `rank`；按任务书明确列出的七档区间实现，名称“九品”不额外虚构两档。
- 书斋新增藏牒阁折页，支持分页、Canvas 2x预览、下载。浏览器支持文件分享时调用系统分享，不支持时降级下载；取消分享不报失败。
- 历史数据已经在feihua_games，无需迁移。新增界面使用主题令牌与既有图标。

验证：`node backend/scripts/test-scholar-ecosystem.js`；前端相关 ESLint。测试使用独立临时账户，结束后清理本人测试数据。

## 交付约束

不改端口、公共前端路由、凭证、依赖或旧stash。工具无法写入Git元数据，分步commit/push需要在用户CMD执行；未得到实际Git输出前不宣称已推送。
