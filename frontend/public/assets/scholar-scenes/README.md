# 诗人对席专属场景 · v1

2026-10-14，按用户“李白只是示例、其他诗人背景可自行生成”的明确要求，使用内置 ImageGen 生成。用于聊天页面的艺术化意境插画，不作为图标或静态 UI 截图。其他页面仍使用纯代码山水。所有图保持原始内容，仅转为 WebP（quality 88、method 6），原图保留在 Codex generated_images 中。

| 资源 | 意境 | 大小（bytes） |
| --- | --- | ---: |
| libai-scene-v1.webp | 太白邀月 | 190192 |
| sushi-scene-v1.webp | 赤壁清风 | 252332 |
| liqingzhao-scene-v1.webp | 荷塘疏雨 | 242466 |
| dufu-scene-v1.webp | 浣花草堂 | 222464 |
| wangyangming-scene-v1.webp | 龙场悟道 | 200304 |
| xinqiji-scene-v1.webp | 灯下看剑 | 257158 |
| group_zhulin-scene-v1.webp | 竹林清谈 | 279146 |

## 最终提示词

苏轼、李清照、杜甫共用前缀：

> Use case: historical-scene. Asset: a tall portrait 1:2 Chinese ink-wash illustration for a poet's chat page, NOT a screenshot or UI. Exquisite detailed traditional brush painting on ivory warm xuan paper, muted ink gray mountains, deep bamboo green, restrained cinnabar accents, elegant Song painting detail. Composition: top 8% clean mist for a live UI header; main figure at left in upper 12–38%, landscape at upper right and thin side borders; lower 48–95% very pale empty paper and mist suitable for live chat bubbles, with small scenic details only at bottom edge. No letters, calligraphy, seals, text, logos, frames, buttons, icons or typography. No modern objects. The figure and scenic motif must be recognizably distinct from other poets, refined realistic ink portrait not cartoon.

分别追加：

- 苏轼：Su Shi, mature bearded Northern Song scholar with black dongpo cap and loose ivory robe, holding a tea bowl, standing by Red Cliff and a quiet Yangtze river. A tiny wooden skiff and red cliffs in the distance, windswept pines, soft dusk sun. Magnanimous, serene, expansive.
- 李清照：Li Qingzhao, a dignified Song dynasty woman poet in elegant pale sage-green and ivory robes, delicate updo, holding a small book, by a lakeside pavilion. Lotus blossoms and broad lotus leaves, a slender willow and fine rain, distant garden water. Lyrical and restrained, dignified literary scholar, not fantasy princess.
- 杜甫：Du Fu, an older Tang dynasty poet with lean lined face and gray beard, simple worn warm-gray scholar robe and plain cloth cap, holding a manuscript by a modest thatched cottage beside Huanhua stream. Bamboo fence, autumn reeds, pale chrysanthemums, distant Chengdu hills. Humane, contemplative, quietly warm.

其余四幅共用前缀：

> Use case: historical-scene. Asset: tall portrait 1:2 Chinese ink-wash illustration for a poet's chat page, NOT UI. Exquisite traditional detailed brush painting on warm ivory xuan paper, muted gray mountains, bamboo green and restrained cinnabar, coherent refined Song painting aesthetic. Top 8% clean mist for live header; main figure in upper-left 12–38%, distant scenery upper-right and narrow side borders; lower 48–95% mostly blank pale paper/mist for live chat bubbles; tiny scenic detail only at bottom edge. No text, characters, seals, logos, typography, frames, buttons or icons. Dignified historically plausible scholars, not cartoon or fantasy characters.

分别追加：

- 王阳明：Wang Yangming, mature Ming dynasty philosopher with short dark beard and plain black Ming scholar hat, ivory and pale blue robe, seated on an ancient rock contemplating a flowering branch. Longchang mountain grotto and old pine, clean waterfall descending at far right into mist. Spiritual clarity, tranquil mountain dawn.
- 辛弃疾：Xin Qiji, dignified middle-aged Southern Song poet and former general, thick eyebrows, dark beard, dark scholar headwrap, ivory robe with muted rust sash, sitting beside a study desk, examining a sheathed ancient sword under a tiny oil lamp. Open pavilion facing distant misty mountains and autumn trees. Brave, resolute, wistful; no battle, no violence, no fantasy armor.
- 竹林雅集：A gathering of seven Wei-Jin scholars in a bamboo grove, small full-body figures in loose ivory and pale gray robes, one playing guqin, others calmly listening or discussing with cups by a winding stream and flat rocks. Concentrate this intimate group in the upper third, poetic bamboo canopy edges, layered distant mountains, large pale empty paper lower half. An elegant historical handscroll mood, not a crowd photo.
- 李白：Li Bai, bearded Tang poet in flowing ivory robes with a dark sash, long loose hair and simple topknot, standing on a lakeside rock raising a wine cup toward a bright full moon in upper right. Tall craggy ink mountains, a tiny moonlit boat, pavilion and plum blossom at far right. Romantic, free and transcendent. Upper-left full figure, tiny in large landscape, lower half empty pale mist.
