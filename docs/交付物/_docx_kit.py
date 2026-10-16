# -*- coding: utf-8 -*-
"""三份交付文档共用的排版工具（python-docx）"""
import os
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

SEAL = RGBColor(0x8A, 0x2B, 0x2B)
INK = RGBColor(0x2B, 0x2B, 0x2B)
SUB = RGBColor(0x6B, 0x67, 0x5B)
BAMBOO = RGBColor(0x2D, 0x5A, 0x3F)
GOLD = RGBColor(0xC5, 0x9B, 0x27)
HEAD_FONT = "微软雅黑"
BODY_FONT = "宋体"


def set_run(run, size=10.5, bold=False, color=INK, font=BODY_FONT, italic=False):
    run.font.size = Pt(size); run.bold = bold; run.italic = italic
    run.font.color.rgb = color; run.font.name = font
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is None:
        rFonts = rPr.makeelement(qn('w:rFonts'), {}); rPr.append(rFonts)
    for k in ('w:eastAsia', 'w:ascii', 'w:hAnsi'):
        rFonts.set(qn(k), font)
    return run


def new_doc():
    doc = Document()
    for s in doc.sections:
        s.page_width, s.page_height = Cm(21.0), Cm(29.7)
        s.top_margin = s.bottom_margin = Cm(2.4)
        s.left_margin = s.right_margin = Cm(2.6)
    st = doc.styles['Normal']
    st.font.name = BODY_FONT; st.font.size = Pt(10.5)
    st.element.rPr.rFonts.set(qn('w:eastAsia'), BODY_FONT)
    st.paragraph_format.line_spacing = 1.5
    st.paragraph_format.space_after = Pt(4)
    return doc


def cover(doc, title, sub, meta_lines):
    for _ in range(3):
        doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run(p.add_run(title), size=26, bold=True, color=SEAL, font=HEAD_FONT)
    if sub:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_run(p.add_run(sub), size=13, color=SUB, font=HEAD_FONT)
    doc.add_paragraph()
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_run(p.add_run("—" * 22), size=11, color=GOLD)
    for _ in range(2):
        doc.add_paragraph()
    for line in meta_lines:
        p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_run(p.add_run(line), size=11.5)
    doc.add_page_break()


def h1(doc, text):
    doc.add_page_break()
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(10)
    set_run(p.add_run(text), size=16, bold=True, color=SEAL, font=HEAD_FONT)
    pPr = p._element.get_or_add_pPr(); pbdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single'); bottom.set(qn('w:sz'), '12')
    bottom.set(qn('w:space'), '4'); bottom.set(qn('w:color'), 'C59B27')
    pbdr.append(bottom); pPr.append(pbdr)
    return p


def h2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(5)
    set_run(p.add_run(text), size=13, bold=True, color=BAMBOO, font=HEAD_FONT)
    return p


def h3(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(7); p.paragraph_format.space_after = Pt(3)
    set_run(p.add_run(text), size=11.5, bold=True, font=HEAD_FONT)
    return p


def para(doc, text, size=10.5, color=INK, indent=True, bold=False):
    p = doc.add_paragraph()
    if indent:
        p.paragraph_format.first_line_indent = Pt(21)
    set_run(p.add_run(text), size=size, color=color, bold=bold)
    return p


def bullet(doc, text):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(2); p.paragraph_format.line_spacing = 1.4
    set_run(p.add_run(text), size=10.5)
    return p


def numbered(doc, text):
    p = doc.add_paragraph(style='List Number')
    p.paragraph_format.space_after = Pt(2); p.paragraph_format.line_spacing = 1.4
    set_run(p.add_run(text), size=10.5)
    return p


def note(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Pt(14); p.paragraph_format.space_after = Pt(6)
    set_run(p.add_run(text), size=9.5, color=SUB)
    return p


def table(doc, headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'; t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, htxt in enumerate(headers):
        hdr[i].text = ''
        p = hdr[i].paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_run(p.add_run(htxt), size=9.5, bold=True,
                color=RGBColor(0xFF, 0xFF, 0xFF), font=HEAD_FONT)
        shd = OxmlElement('w:shd'); shd.set(qn('w:fill'), '8A2B2B'); shd.set(qn('w:val'), 'clear')
        hdr[i]._tc.get_or_add_tcPr().append(shd)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = ''
            p = cells[i].paragraphs[0]
            p.paragraph_format.line_spacing = 1.25; p.paragraph_format.space_after = Pt(1)
            set_run(p.add_run(str(val)), size=9.5)
    if widths:
        for r in t.rows:
            for i, w in enumerate(widths):
                r.cells[i].width = Cm(w)
    doc.add_paragraph()
    return t


def img(doc, path, caption, width_cm=14.0):
    """插入图片 + 图注。
    两处排版要点（实测踩过）：
      ① 移动端截图多为 390x844 竖长图，直接按宽度插入会占满整页，
         导致图注被挤到下一页、与图片分离 —— 故对长图先按高宽比裁剪压缩。
      ② 图与图注设 keep_with_next / keep_together，禁止在两者之间分页。
    """
    if not os.path.exists(path):
        note(doc, "（缺图：%s）" % os.path.basename(path)); return
    cropped = _fit_image(path)
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6); p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    p.paragraph_format.keep_together = True
    p.add_run().add_picture(cropped, width=Cm(width_cm))
    c = doc.add_paragraph(); c.alignment = WD_ALIGN_PARAGRAPH.CENTER
    c.paragraph_format.space_after = Pt(10)
    c.paragraph_format.keep_together = True
    set_run(c.add_run(caption), size=9, color=SUB)


def _fit_image(path, max_ratio=1.35, max_width=1600):
    """为排版准备图片副本（不修改原图）：
      ① 竖长图按高宽比裁剪，避免单图占满整页、图注被迫另起一页；
      ② 压到适合 A4 印刷的分辨率（约 150dpi），避免 DOCX 体积膨胀。
    原图（proof/ 下的证据截图）保持不变。
    """
    try:
        from PIL import Image
    except ImportError:
        return path
    out = os.path.join(os.path.dirname(path), "_fit_" + os.path.basename(path))
    try:
        im = Image.open(path)
        w, h = im.size
        changed = False
        if h / w > max_ratio:
            im = im.crop((0, 0, w, int(w * max_ratio)))  # 自顶部保留（移动端关键信息在上半部）
            w, h = im.size
            changed = True
        if w > max_width:
            im = im.resize((max_width, int(h * max_width / w)), Image.LANCZOS)
            changed = True
        if not changed:
            return path
        im.save(out, optimize=True)
        return out
    except Exception:
        return path
