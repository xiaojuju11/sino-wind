#### /api/auth

| 方法 | 路径 |
| :--- | :--- |
| `POST` | `/api/auth/login` |
| `GET` | `/api/auth/captcha` |
| `POST` | `/api/auth/register` |
| `POST` | `/api/auth/recovery-code` |
| `POST` | `/api/auth/recovery/reset` |
| `GET` | `/api/auth/info` |
| `POST` | `/api/auth/updateAvatar` |
| `POST` | `/api/auth/updateNickname` |
| `POST` | `/api/auth/updatePassword` |

#### /api/poem

| 方法 | 路径 |
| :--- | :--- |
| `GET` | `/api/poem/random` |
| `GET` | `/api/poem/search` |
| `POST` | `/api/poem/collect` |
| `POST` | `/api/poem/remove` |
| `DELETE` | `/api/poem/:id` |
| `GET` | `/api/poem/collection` |
| `GET` | `/api/poem/my-list` |
| `POST` | `/api/poem/appreciate` |

#### /api/coze

| 方法 | 路径 |
| :--- | :--- |
| `POST` | `/api/coze/recognition` |

#### /api/deepseek

| 方法 | 路径 |
| :--- | :--- |
| `POST` | `/api/deepseek/chat` |
| `POST` | `/api/deepseek/chat/stream` |
| `POST` | `/api/deepseek/yayan` |
| `POST` | `/api/deepseek/soul` |
| `POST` | `/api/deepseek/appreciate` |
| `GET` | `/api/deepseek/feihua/rules` |
| `POST` | `/api/deepseek/feihua/start` |
| `POST` | `/api/deepseek/feihua/turn` |
| `GET` | `/api/deepseek/feihua/records` |
| `GET` | `/api/deepseek/feihua/records/:id` |
| `GET` | `/api/deepseek/scholar/summary` |
| `POST` | `/api/deepseek/scholar/sync` |
| `GET` | `/api/deepseek/scholar/letters` |
| `GET` | `/api/deepseek/scholar/letters/:sageId` |
| `POST` | `/api/deepseek/scholar/letters/:sageId/leave` |
| `POST` | `/api/deepseek/scholar/letters/:sageId/read` |
| `GET` | `/api/deepseek/scholar/artifacts` |
| `POST` | `/api/deepseek/scholar/artifacts` |
| `DELETE` | `/api/deepseek/scholar/artifacts/:id` |

#### /api/upload

| 方法 | 路径 |
| :--- | :--- |
| `POST` | `/api/upload/check` |
| `POST` | `/api/upload/chunk` |
| `POST` | `/api/upload/merge` |
