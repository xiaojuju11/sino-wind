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

## 子任务三：五席与题库

- 李白/苏轼/李清照/王阳明/杜甫全部可行令；后端规则接口返回姓名、偏好令字和风格，前端按偏好排序选项。11个令字含新增愁、心、明、秋、江。
- 483条去重古典分句，190+条含令字；各句保留作者、篇名及公有领域作品参考目录。宋词按逗句分段，短于4字的片段不入库，仍执行本项目统一的平水韵游戏规则，不声称等同词牌格律。
- 应答优先本人作品；易安其次宋词、阳明其次理趣诗。引用其他朝代作品明确显示真实作者；Canvas历史文牒同步支持五人姓名。
- 新增 feihuaCorpus.js。王阳明《泛海》《杂诗三首·其二》核对《王阳明集》卷19：https://zh.wikisource.org/wiki/王陽明集/卷19 。题库部分作品只摘选，非全集。
- 八齐原字表缺啼、蹄、溪常用字形，依据《钦定叶韵汇辑》卷05的嗁/啼、蹏/蹄、谿/溪说明补充，并在pingshui.json记录来源：https://zh.wikisource.org/wiki/欽定叶韻彚輯_(四庫全書本)/卷05 。每个题库末字均有韵部，保留多音字显式选韵机制。
- 验证：五席本人作品优先、483句规范去重、可应令150+句、30句常见名篇回归、原SSE/并发积分测试、ESLint、生产构建通过。
- **验收待确认**：“人教版85%覆盖率”缺教材学段/版本/分母清单，尚不能核验。刘霞已确认队长没有清单，要求先完成其余闭环，最后列为待办。30句样本通过不等同于教材全集85%。

## 子任务四：识物入藏与携物入席

- 本次主线此前只有appraise_count而没有藏品明细，新增scholar_artifacts；再次运行 `node backend/scripts/init-scholar-ecosystem.js` 即可幂等建表。
- `/api/deepseek/scholar/artifacts`：GET分页查询本人宝鉴、POST保存识物研习资料；DELETE `/:id` 仅移除本人记录。保存按钮在识物结果卡片，pending期间禁止入藏，兜底记录保留待考标识且不保存虚构分数。同一UUID重试不重复入藏。
- 书斋宝鉴可回看考释与确认移除；ScholarChat“引物溯古今”打开同一藏品抽屉，选中后生成与先贤姓名/藏品名称/暂考年代关联的发语。服务端按artifactId再次读取本人真实保存记录，其他账户返回404，不信任前端传来的器物档案。
- 器物资料作为用户研究资料进入既有SSE管道，不作为系统指令；提示先贤区分自身时代、后世器物与跨时推论。断流、取消、降级标识仍沿用既有行为。
- 验证：真实HTTP测试覆盖未登录、非法参数、重复保存、跨账户编号冲突/查询/删除、携物上下文进入模型参数、完整流归档和回柬。
- **真实DeepSeek实测**：2026-10-14以临时账户保存公开常识测试资料“宋代建盏”，调用实际deepseekChatStream；source=deepseek、done=true、archiveSaved=true，首段1268ms、总耗时2654ms、186字。这是单次本机样本，不是性能保证；测试数据已清理。此次未重新验收Coze视觉工作流的识别准确性。
- **浏览器实测**：真实React组件+真实临时数据库账号；上游模型/识物响应使用确定性测试替身并有醒目标识。已验证：动态未读回柬与旧对话恢复、携物发语及流式回显、6分文阶、过期文牒2x重绘/实际下载、李清照飞花令入口及偏好、识物保存后书斋可见、320px深色宝鉴。浏览器无error日志；修正抽屉3px横向溢出；补齐焦点限制、Escape关闭、关闭后焦点恢复和底页滚动锁定。
- **审查修正**：浏览器行令暴露底本将“花”误列四纸，依《钦定叶韵汇辑》卷11六麻校正，新增断言“花仅下平六麻”，补充来源在pingshui.json。避免React开发严格模式的预清理误触发离席回柬。识物音频play失败加入Promise捕获，不产生未处理异常。

## 本次最终验证与交付

```text
node backend/scripts/test-scholar-engines.js
node backend/scripts/test-scholar-ecosystem.js
node backend/scripts/test-scholar-ecosystem-http.js
cd frontend
npx eslint src/pages/ScholarChat.jsx src/pages/LetterList.jsx src/pages/MinePage.jsx src/components/FeihuaPanel.jsx src/components/ScholarArchive.jsx src/components/ScholarArtifactDrawer.jsx src/components/recognitionResult/Index.jsx src/utils/scholarLetters.js src/utils/useScholarSheet.js src/utils/scholarCertificate.js
npm run build
```

前三项已分别提交推送：ab08afd（藏牒阁）、d50da10（信札）、ffe51c6（五席题库）。第四项以随后Git提交记录为准。开发记录和AI使用表随每次提交更新。

余项：队长提供教材版本与篇目分母后，再验证并补齐“85%覆盖率”。部署环境需运行本次幂等迁移；已有对局无需重复导入。系统分享取决于浏览器支持，未支持时转为下载，不保证每个系统均能弹出原生分享面板。
