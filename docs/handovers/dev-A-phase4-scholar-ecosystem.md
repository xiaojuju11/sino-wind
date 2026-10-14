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

## 子任务二：信札与回柬

- 新增 `node backend/scripts/init-scholar-ecosystem.js` 幂等建表：scholar_conversations、scholar_turns；现有账户、对局、积分不动。
- `/api/deepseek/scholar/letters`、`/:sageId`（GET）、`/:sageId/leave`、`/:sageId/read`（POST）均强制登录且按user_id隔离。
- SSE完整完成后服务端归档，前端保留按账户隔离的最多100席/每席20轮本机缓存；中断或取消的半句不入信札。相同requestId不会重复增加轮数。
- 累计4个完整来回后离席固定赠送一封规则回柬；每新增4轮才可再触发。事务行锁保证pagehide/卸载/并发离席不会重复寄信；读取按replyId精确清除未读，避免误读新信。
- 信札动态摘要、上海时区十二时辰、朱砂未读标记，进入后显示宣纸回柬。游客仅存本机，无法伪装云端记录。回柬标为规则回柬，不冒充实时模型输出。
- 已运行迁移两次验证幂等，独立临时用户验证重复归档、3轮不触发、4轮触发、5并发只寄一封、越权读取/标记被隔离；相关ESLint和生产构建通过。

不改端口、公共前端路由、凭证、依赖或旧stash。工具无法写入Git元数据，分步commit/push需要在用户CMD执行；未得到实际Git输出前不宣称已推送。
