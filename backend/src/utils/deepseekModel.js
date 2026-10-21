// DeepSeek 官方模型名（2026-10 官方文档：https://api-docs.deepseek.com/）
//   - deepseek-flash    → 现由 DeepSeek-V4.1-Flash-1017 提供服务
//   - deepseek-v4-pro   → 更强推理档
// 旧代码里写的 deepseek-chat 已不在官方文档中，统一收口到这里；
// 需要临时切换时用环境变量 DEEPSEEK_MODEL 覆盖，不必改代码。
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-flash'

// deepseek-flash 默认开启思考（reasoning），实测同一句雅译默认档 6.9s / 899 thinking tokens，
// 且会把 max_tokens 吃光；本项目的雅译、赏析、搜诗、角色对话都是短回复交互，统一关掉思考，
// 实测 1.5s 返回且 JSON 输出正常。需要更强推理时用环境变量 DEEPSEEK_THINKING=enabled 打开。
const DEEPSEEK_THINKING = Object.freeze({
  type: process.env.DEEPSEEK_THINKING === 'enabled' ? 'enabled' : 'disabled',
})

module.exports = { DEEPSEEK_MODEL, DEEPSEEK_THINKING }
