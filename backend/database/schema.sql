-- 《云山竹简 · 华风雅集》核心数据库结构 (兼容 MySQL 5.7 / 8.0 / MariaDB)
-- 数据库名：parent_kid_education
-- 编码：utf8mb4

CREATE DATABASE IF NOT EXISTS `parent_kid_education` DEFAULT CHARACTER SET utf8mb4;
USE `parent_kid_education`;

-- 1. 用户表 (Users)
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT 'Primary Key',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Create Time',
  `phone` varchar(255) NOT NULL COMMENT '账号',
  `password_hash` varchar(255) NOT NULL COMMENT '密码',
  `nickname` varchar(255) NOT NULL COMMENT '昵称',
  `avatar` mediumtext COMMENT '头像',
  `appraise_count` int DEFAULT '0' COMMENT '鉴宝藏器数',
  `debate_count` int DEFAULT '0' COMMENT '论道问策数',
  `poem_count` int DEFAULT '0' COMMENT '诗签摘录数',
  `rank_level` varchar(20) DEFAULT '玖阶' COMMENT '文风品位品阶',
  `merit_points` int unsigned NOT NULL DEFAULT '0',
  `yayan_count` int unsigned NOT NULL DEFAULT '0',
  `recovery_code_hash` char(64) DEFAULT NULL,
  `auth_version` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. 账号安全恢复凭据 (Auth Recovery Attempts)
CREATE TABLE IF NOT EXISTS `auth_recovery_attempts` (
  `key_hash` char(64) NOT NULL,
  `window_start` datetime(3) NOT NULL,
  `attempts` int unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`key_hash`),
  KEY `window_start` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. 飞花令游戏对局 (Feihua Games)
CREATE TABLE IF NOT EXISTS `feihua_games` (
  `id` char(36) NOT NULL,
  `user_id` int DEFAULT NULL,
  `guest_hash` char(64) DEFAULT NULL,
  `state` json NOT NULL,
  `awarded_points` int NOT NULL DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. 先贤文博藏品鉴赏记录 (Scholar Artifacts)
CREATE TABLE IF NOT EXISTS `scholar_artifacts` (
  `id` char(36) NOT NULL,
  `user_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `dynasty` varchar(80) NOT NULL,
  `description` text NOT NULL,
  `score` float DEFAULT NULL,
  `degraded` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. 先贤问道对话会话 (Scholar Conversations)
CREATE TABLE IF NOT EXISTS `scholar_conversations` (
  `user_id` int NOT NULL,
  `sage_id` varchar(80) NOT NULL,
  `rounds` int unsigned NOT NULL DEFAULT '0',
  `leave_rounds` int unsigned NOT NULL DEFAULT '0',
  `last_message` text NOT NULL,
  `updated_at` datetime(3) NOT NULL,
  `reply_id` char(36) DEFAULT NULL,
  `reply_text` text,
  `reply_at` datetime(3) DEFAULT NULL,
  `reply_unread` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`,`sage_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. 先贤问道对话单轮问答 (Scholar Turns)
CREATE TABLE IF NOT EXISTS `scholar_turns` (
  `user_id` int NOT NULL,
  `request_id` char(36) NOT NULL,
  `sage_id` varchar(80) NOT NULL,
  `question` text NOT NULL,
  `answer` text NOT NULL,
  `degraded` tinyint NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL,
  PRIMARY KEY (`user_id`,`request_id`),
  KEY `user_id` (`user_id`,`sage_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. 用户诗签收藏表 (User Poems)
CREATE TABLE IF NOT EXISTS `user_poems` (
  `id` int NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `user_id` int NOT NULL COMMENT '用户ID',
  `poem_id` varchar(64) DEFAULT NULL,
  `title` varchar(100) NOT NULL,
  `author` varchar(50) NOT NULL,
  `dynasty` varchar(30) DEFAULT '唐代',
  `content` text NOT NULL,
  `appreciation` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户诗签收藏表';

-- 8. 预置演示与评审账号 (密码均为: 123456)
INSERT INTO `users` (`id`, `phone`, `password_hash`, `nickname`, `rank_level`, `merit_points`, `auth_version`)
VALUES 
  (1, '15779889503', '$2b$10$a8X/myQdk0eLtHBIXNry4.4RMA6PspFq/nqFJWjlcrrR9fhqx6Wtm', '小橘宝宝', '玖阶', 100, 0),
  (2, '13800000000', '$2b$10$a8X/myQdk0eLtHBIXNry4.4RMA6PspFq/nqFJWjlcrrR9fhqx6Wtm', '墨韵雅士', '玖阶', 100, 0)
ON DUPLICATE KEY UPDATE 
  `password_hash` = VALUES(`password_hash`),
  `nickname` = VALUES(`nickname`),
  `rank_level` = VALUES(`rank_level`),
  `auth_version` = 0;
