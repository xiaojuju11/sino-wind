# 数据库增量迁移与本地环境验证

维护人：刘霞 / 成员 A。实际验证日期：2026-10-13，代码基线 main 6e1256a，工作分支 feat/phase2-backend。

## 适用范围
依据 task_assignments.md 的任务 A。此处迁移是扩展现有库结构，不是搬迁服务器、清空数据库或重建 users。
项目已有 backend/.env.example；端口示例仍为 3000，以实际配置 PORT 为准，不采用任务示例中未经统一的 3001。
命令中的路径为刘霞当前工作区；其他成员替换为自己的路径。以下命令适用于 Windows CMD，每行单独执行。

## 本地配置与准备
1. 新成员在 backend 目录复制 .env.example 为 .env 后填写 DB_HOST、DB_PORT、DB_USER、DB_PASSWORD、DB_NAME、PORT。
2. 已有可用 .env 或 .env.local 时先核对配置，不覆盖真实密码或复制占位值。当前代码优先加载 .env，然后用 .env.local 覆盖；两份同时存在时避免写入互相冲突的值。
3. 本次本机沿用已验证的 .env.local；配置不写入本文档，不上传 GitHub。.env、.env.local、.env.*.local 已列入忽略规则。
4. 数据库默认 parent_kid_education，MySQL 8.0；如果不存在，先创建 utf8mb4 数据库并按项目基础初始化说明创建 users 表。init-day1.js 不负责创建数据库或 users 基础表。
5. 从 backend 目录运行迁移，以便历史脚本正确找到本地配置。安装依赖使用 npm.cmd ci；不改 package.json 或锁文件。

## 迁移前备份
按实际 DB_HOST/DB_PORT/DB_USER/DB_NAME 替换参数。示例假设默认本地 root 与 parent_kid_education：

~~~bat
mysqldump -h localhost -P 3306 -u root -p --single-transaction --default-character-set=utf8mb4 parent_kid_education > "%USERPROFILE%\sino-wind-before-day1.sql"
~~~

密码由终端提示输入，不把密码放进命令。每次备份使用独立文件名，确认命令成功且备份能恢复后再做生产迁移。备份可能包含个人数据，不放入仓库或公开展示。
此为未来新增结构或生产部署前的步骤；本次没有新建备份，不虚构备份完成记录。

## 执行与验证
~~~bat
cd /d C:\Users\Administrator\sino-wind\.task-worktrees\auth\backend
mysql -h localhost -P 3306 -u root -p -e "SELECT VERSION();"
node scripts/init-day1.js
~~~

检查期望输出：Day 1 数据库结构初始化完成。脚本先查 INFORMATION_SCHEMA，对不存在的列执行 ALTER；收藏表使用 CREATE TABLE IF NOT EXISTS。
MySQL 8.0 的兼容方式是“检查再添加”，不直接照抄文档的 ADD COLUMN IF NOT EXISTS 语法。已有列和表不会被清空或覆盖，但脚本也不会自动纠正已经存在的错误类型，需另行对照结构检查。
默认四列：appraise_count INT DEFAULT 12、debate_count INT DEFAULT 36、poem_count INT DEFAULT 48、rank_level VARCHAR(20) DEFAULT '玖阶'。
user_poems 包含 id、user_id、poem_id、title、author、dynasty、content、appreciation、created_at，及 user_id 索引；两表须为 InnoDB，确保收藏事务和行锁有效。
不自动插入任务书中可选的 user_id=1 假种子，避免把示例作品归入真实用户。

可在 MySQL 中运行：
~~~sql
SELECT VERSION();
SHOW COLUMNS FROM users;
SHOW COLUMNS FROM user_poems;
SHOW INDEX FROM user_poems;
SELECT TABLE_NAME, ENGINE FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'user_poems');
~~~

## 启动与基础验收
~~~bat
node src/index.js
~~~
保留服务终端，另开 CMD，按实际 PORT 请求健康接口，默认：
~~~bat
curl.exe http://127.0.0.1:3000/api/test
~~~
期望 HTTP 200 与 {"status":"ok","mesaage":"Koa backend is running"}。mesaage 拼写沿用既有接口，不在环境准备任务中私改。
如端口被占用先确认已有服务来源，不杀未知进程或随意改端口。

## 常见错误
| 现象 | 检查与处理 |
| --- | --- |
| Access denied / ER_ACCESS_DENIED_ERROR | DB_USER、DB_PASSWORD 及账号连接权限；注意 .env.local 覆盖 .env |
| Unknown database | DB_NAME 和库是否已建立；不要删除原库 |
| 请先完成 users 基础表初始化 | 按项目初始化文档创建 users 基础表，增量脚本不会代建 |
| ECONNREFUSED / 连接超时 | MySQL 服务状态、DB_HOST、DB_PORT 和本机网络权限 |
| ALTER/CREATE 权限不足 | 联系数据库管理者为目标库授予所需权限，不改其他库 |
| 字段已存在但类型不符 | 脚本不会更改已有类型，先记录差异并经团队批准单独迁移 |
| EADDRINUSE | 同端口已有服务，确认并停止自己启动的旧实例 |

## 回滚与恢复方法
MySQL ALTER/CREATE 属于 DDL，不能依赖普通事务 ROLLBACK 撤销。迁移失败可能已添加部分列；先检查结构，再修复配置或权限并重新运行可重复脚本。
新增结构未影响已有数据时，优先回退应用代码并保留新增列/表；删除收藏表会丢失用户作品，不提供一键删除回滚。
如确需恢复迁移前状态：使用迁移前备份恢复到独立临时库，验证用户数、收藏数和表结构，再由负责人批准正式切换，禁止直接覆盖正在使用的库。
默认配置下，创建和导入独立恢复库的人工操作示例（仅供审核，不在本次执行）：
~~~bat
mysql -u root -p -e "CREATE DATABASE sino_wind_restore_check CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sino_wind_restore_check < "%USERPROFILE%\sino-wind-before-day1.sql"
~~~
正式切换前检查备份是否含指定数据库语句，避免误恢复到原库，并确认账号权限及应用配置；不要把演示用的临时库当作正式回滚已经完成。

## 本次实际验证记录
- 本机连接版本 MySQL 8.0.43；四项默认值、收藏九字段、user_id 索引和 InnoDB 引擎检查通过。
- 2026-10-13 重新执行现有 init-day1.js，退出码 0；由于结构齐备，本次为可重复执行验证，没有新的业务数据迁移。
- 最新真实 Koa 入口与 /api/test 验证通过；测试使用隔离临时端口，不占用正式 3000，不修改源代码端口，结束后关闭测试服务。
- backend/.env.example 已在远程 main 跟踪；本次未改密钥、数据库配置、端口、业务代码或依赖。
- 新部署机器必须各自执行本地迁移；本机验证不等于云端数据库已迁移。


## 本地配置交付补齐与验证（2026-10-13）
此前未创建任务指定的 .env，现已补齐 backend/.env 的全部模板字段。数据库真实配置沿用已验证的 .env.local；本次将用户提供的未注释 Coze Token 和 DeepSeek API Key 同步写入两份文件，防止 .env.local 将新 .env 覆盖为空值。没有将凭证写入模板、文档或 Git。
两份环境文件按 dotenv 解析后与所提供值一致，PORT 与数据库配置没有意外变化；全部模板字段已填写，独立数据库连接及当前入口验证成功。AI 凭证“已配置”不等于 API 权限、余额或真实工作流效果已验收；按任务书 AI 实际接入验证交成员 C。
.env 和 .env.local 被 backend/.gitignore 忽略，Git 索引中未跟踪；backend/.env.example 已在远程 main 及当前提交跟踪，无需重复提交。
已重新执行 init-day1.js，退出码 0，现有库结构齐备，不重建或搬迁数据。后端使用既有 PORT=3000，与代码和模板一致；task_assignments.md 的“默认3001”仍须队长统一，未私改服务端口。
本次仅更新本机配置和任务 A 文档；备份恢复与云端迁移没有执行。

## 成员 B 反馈中的端口与鉴权说明
当前 backend/src/index.js 使用 process.env.PORT || 3000，模板及本地 PORT=3000；文档示例3001不作为擅自变更端口的依据。已有鉴权工具支持 Bearer 和原始 Token，失效返回历史416（用户不存在的业务场景可返回401）；这些状态应由前端按现有协议处理。公共前端超时、主题兼容和队友 PR 合流交队长处理，不属于本轮任务 A 数据库配置改动。
