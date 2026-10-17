# 诗海字衡与白话雅译插画

2026-10-17 使用内置 imagegen 生成两张独立插画，再用 Sharp 等比转换为 1200×800 WebP。未使用 CLI/API 后备方式。两图为装饰性背景，文字、按钮、词云及统计图均由网页绘制。

- `poetry-desk-v1.webp`：诗海字衡首页入口及二级页引导插画，184,006 字节。
- `yayan-desk-v1.webp`：白话雅译卡片背景，123,078 字节。

## 诗海字衡提示词

Use case: historical-scene. Create a refined wide 1536x1024 Chinese ink and pale mineral watercolor illustration for a classical poetry mobile app card called poetry word frequency (do not render any text). Warm ivory xuan paper, muted sage mountains, antique gold highlights. On right half, an elegant ancient scholar's desk with several open thread-bound poetry books, loose manuscript slips and a brush resting on inkstone, petals and bamboo outside a moon window, misty distant river. Left half and upper left remain pale spacious negative space for real HTML headings. Light delicate lines, exquisite quiet literati atmosphere, match traditional Chinese landscape painting. No lettering, no numbers, no seals, no modern devices, no UI, no frame.

## 白话雅译提示词

Use case: historical-scene. Generate a wide 1536x1024 exquisite Chinese classical ink watercolor illustration for a poetry translation app card. Ivory xuan paper, muted sage bamboo, pale gold and tiny warm pink blossom accents. On the right bottom an ancient writing desk with a slender calligraphy brush and inkstone, an unfurled paper scroll with only faint abstract ink traces (no readable characters), one small vase of plum blossoms; misty lake and far mountains outside a bamboo window. Most left two thirds and upper half must be very light creamy empty paper so HTML input boxes and text can be readable over it. Quiet elegant Song dynasty literati painting, fine delicate washes, warm soft light. No text, no labels, no seal, no border, no charts, no modern objects, no UI.
