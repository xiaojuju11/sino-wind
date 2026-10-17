// Only entries checked against the linked text receive a verification date.
// Revision links keep the inspected wording reproducible, including variants.
export const SCENE_SOURCES = {
  'wangwei-shanju': { page: '山居秋暝', revision: 2276100, edition: '维基文库《全唐诗》卷126', checkedAt: '2026-10-17' },
  'libai-tianmen': { page: '望天門山', revision: 2690622, edition: '维基文库《全唐诗》卷180', checkedAt: '2026-10-17' },
  'sushi-xilin': { page: '題西林壁_(蘇軾)', revision: 8732088, edition: '维基文库《题西林壁》（苏轼），保留异文说明', checkedAt: '2026-10-17' },
  'menghaoran-guren': { page: '過故人莊', revision: 2691920, edition: '维基文库《全唐诗》卷160', checkedAt: '2026-10-17' },
}

export function poemSource(poem) {
  const record = SCENE_SOURCES[poem.id]
  return record ? {
    sourceUrl: `https://zh.wikisource.org/w/index.php?title=${encodeURIComponent(record.page)}&oldid=${record.revision}`,
    sourceEdition: record.edition, sourceCheckedAt: record.checkedAt, sourceVerified: true,
  } : {
    sourceUrl: `https://zh.wikisource.org/w/index.php?search=${encodeURIComponent(poem.title + ' ' + poem.author)}`,
    sourceEdition: '原文检索入口，具体版本待核', sourceCheckedAt: '', sourceVerified: false,
  }
}
