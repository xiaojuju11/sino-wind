---
name: Song Dynasty Minimalism
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e4e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#564240'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0f0'
  outline: '#897170'
  outline-variant: '#ddc0be'
  surface-tint: '#a23d3b'
  primary: '#6b1417'
  on-primary: '#ffffff'
  primary-container: '#8a2b2b'
  on-primary-container: '#ffa6a1'
  inverse-primary: '#ffb3af'
  secondary: '#3a684c'
  on-secondary: '#ffffff'
  secondary-container: '#b9ebc8'
  on-secondary-container: '#3f6c50'
  tertiary: '#453300'
  on-tertiary: '#ffffff'
  tertiary-container: '#614900'
  on-tertiary-container: '#e4b743'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad7'
  primary-fixed-dim: '#ffb3af'
  on-primary-fixed: '#410005'
  on-primary-fixed-variant: '#822526'
  secondary-fixed: '#bceecb'
  secondary-fixed-dim: '#a1d2af'
  on-secondary-fixed: '#002110'
  on-secondary-fixed-variant: '#224f35'
  tertiary-fixed: '#ffdf98'
  tertiary-fixed-dim: '#eec14b'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#5a4300'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e1'
typography:
  display-hero:
    fontFamily: Noto Serif
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: 0.04em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: 0.02em
  headline-md:
    fontFamily: Noto Serif
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Noto Serif
    fontSize: 17px
    fontWeight: '500'
    lineHeight: 24px
  body-lg:
    fontFamily: Noto Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Noto Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Noto Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-seal:
    fontFamily: Noto Serif
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system channels the refined aesthetic philosophy of the Song Dynasty: understated restraint, generous negative space (宣纸留白), natural material textures, and quiet scholarly elegance. The interface avoids aggressive saturation, neon gradients, and overt decorative clutter. 

Visual rhythm is calibrated like a classical handscroll: content breathes through deliberate emptiness, linear structures evoke ink brushwork, and accent points appear sparingly like cinnabar seal impressions (朱砂印泥). The experience is serene, contemplative, and culturally grounded, targeted at editorial, cultural exhibition, tea lifestyle, literary reading, and high-end lifestyle services on mobile devices.

## Colors

The palette is derived directly from classical Chinese scholarly accoutrements: raw Xuan paper, silk textiles, pine soot ink, crushed cinnabar, bamboo groves, and brushed gold leaf.

- **Primary (`#8A2B2B`)**: Cinnabar Seal Red (朱砂印泥红). Used strictly for focal interactions, active states, brand hallmarks, and seal accents. Never applied as loud, expansive fills.
- **Secondary (`#2D5A3F`)**: Bamboo Forest Green (竹青雅色). Used for affirmative signals, botanical badges, secondary thematic highlights, and tranquil states.
- **Tertiary (`#C59B27`)**: Muted Mud Gold (泥金). Applied to rare collector tags, refined dividers, metallic borders, or editorial milestones. Never garish or neon.
- **Neutral Foreground (`#2B2B2B`)**: Dense Soot Ink (水墨浓黑). Main typographic text, headlines, and structural boundaries.
- **Neutral Subdued (`#6B675B`)**: Washed Ink Grey (水墨淡灰). Secondary body copy, metadata, timestamps, and placeholder states.
- **Backgrounds**:
  - Global Canvas: Warm Xuan Paper (`#F7F4EB`).
  - Elevated Container / Cards: Silk Textile White (`#FAF7F0`).
  - Input & Recessed Surfaces: Aged Parchment (`#EFEBE1`).

## Typography

Typography establishes an intentional dichotomy between poetic classical forms and clean modern legibility.

- **Headlines, Verse, and Seals**: Styled using `Noto Serif` (or classical Song/Kai typefaces where system fonts are available). Titles employ slightly relaxed letter tracking (`0.02em` - `0.04em`) to mimic balanced woodblock impressions.
- **Body and Interactive Controls**: Managed with `Noto Sans` for rapid scanning and modern mobile readability.
- **Vertical Text & Poetry Layouts**: When rendering poetic inscriptions or chapter labels, vertical writing modes (`writing-mode: vertical-rl`) should be used in conjunction with `Noto Serif` and wider line height (`1.8 - 2.0`).

## Layout & Spacing

The layout is built for mobile screens with high proportion of empty space (留白) around content clusters:

- **Horizontal Margins**: 20px (`1.25rem`) safe outer margins allow content to stay centered and clear of viewport edges.
- **Vertical Breathing Room**: Section separations leverage generous vertical margins (`space-xl` / 32px or greater) instead of harsh divider rules, creating natural pauses between chapters or lists.
- **Grid Structure**: A lightweight 4-column layout on standard mobile viewports, scaling to 8 columns on tablet devices while maintaining generous outer margins.

## Elevation & Depth

Depth is tactile and planar, avoiding heavy drop shadows or synthetic material blurs:

- **Surface Layers**: Depth is formed through natural paper layering. The background is Warm Xuan Paper (`#F7F4EB`), upon which Silk Textile White (`#FAF7F0`) cards rest.
- **Low-Contrast Cinnabar Hairlines**: Elevated items are bounded by hairline borders: `1px solid rgba(138, 43, 43, 0.12)`.
- **Soft Bas-Relief Shadow**: Where cards or floating navigation bars float above the paper plane, use an ultra-diffused shadow: `0 4px 16px rgba(0, 0, 0, 0.04)`.
- **Inlaid Depth**: Input controls, tags, and progress tracks sit recessed into the surface using `#EFEBE1` without interior drop shadows.

## Shapes

Shapes mirror hand-crafted and carved edges:

- **Cards & Modal Sheets**: Bound by a standard radius of 12px (`0.75rem`), giving a soft, folded paper-like corner.
- **Seals & Badges**: Small square or rectangular stamps utilize an architectural 6px radius (`0.375rem`), evocative of stone chops (印章) pressed onto fibrous paper.
- **Buttons**: Contoured to 8px–12px or natural pill shapes when representing floating actions.

## Components

### Iconography
- All icons are single-color vector linework drawn with a consistent `1.5px` stroke weight.
- Never use solid colored shapes, multi-tone fills, or glossy gradients.
- Default stroke color matches Washed Ink Grey (`#6B675B`) or Dense Soot Ink (`#2B2B2B`).

### Buttons
- **Primary Action (Seal Stamp)**: `#8A2B2B` solid background, text in `#FAF7F0`, border-radius 8px to 12px, padded with `12px 24px`. Pressed state shifts subtly to darker cinnabar (`#742323`).
- **Secondary Action**: Background `#FAF7F0`, border `1px solid rgba(138, 43, 43, 0.25)`, text in `#2B2B2B`.
- **Text Action**: Pure text in `#8A2B2B` or `#2B2B2B`, marked with understated underline or paired with a subtle `1.5px` stroke directional arrow.

### Cards
- Surface background: Silk Textile White (`#FAF7F0`).
- Border: `1px solid rgba(138, 43, 43, 0.12)`.
- Shadow: `0 4px 16px rgba(0, 0, 0, 0.04)`.
- Corner radius: `12px`.
- Padding: `16px` to `20px`.

### Input Fields
- Surface background: Aged Parchment (`#EFEBE1`).
- Border: `1px solid rgba(107, 103, 91, 0.15)`, transitioning to `1px solid #8A2B2B` on focus.
- Text: `#2B2B2B`; placeholder text: `#6B675B` with 60% opacity.
- Corner radius: `8px`.

### Seal Tags & Chips
- Emulating classical chop seals: Background tinted cinnabar wash (`rgba(138, 43, 43, 0.08)`), text `#8A2B2B`, border `1px solid rgba(138, 43, 43, 0.3)`.
- For botanical states: Green wash (`rgba(45, 90, 63, 0.08)`), text `#2D5A3F`, border `1px solid rgba(45, 90, 63, 0.3)`.
- Shape: 6px corner radius, compact padding (`2px 8px`). Font: `label-seal`.

### Lists & Dividers
- Separators do not use heavy continuous lines. Dividers are either 1px hairline rules with `rgba(107, 103, 91, 0.12)` fading out toward the edges, or generous whitespace spacing without divider lines.
- List row padding defaults to `16px` vertically.

### Checkboxes & Radios
- Size: 18px x 18px.
- Unchecked: `1.5px solid #6B675B` border over `#FAF7F0`.
- Checked: `#8A2B2B` background with an off-white `#FAF7F0` checkmark or interior dot.
- Corner radius: 4px for checkboxes, 50% for radio dots.