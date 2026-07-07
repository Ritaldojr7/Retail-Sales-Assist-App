# Frido Design System Rebrand Reference Guide

This document defines the branding guidelines and design tokens implemented for the **Frido Sales Assist** application.

---

## 1. Color System

All colors are defined as CSS variables in `globals.css` and mapped to Tailwind colors in `tailwind.config.ts`.

### Primary Palette
- **Frido Yellow**: `#FFD100` (Pantone 109 C) - Applied on primary CTA buttons, active state highlights, and launcher icon backgrounds.
- **Frido Black**: `#101820` (Pantone Black 6 C) - Primary text color, icons, and text-on-yellow combinations.
- **Frido White**: `#FFFFFF` - Base background and input surfaces.

### Semantic Roles

#### Light Theme (Default)
```css
--bg: #FFFFFF;
--surface: #FFFDF5;       /* Warm off-white card backgrounds */
--surface-2: #F4F5F7;     /* Hover states and inactive chip defaults */
--border: #E7E9ED;
--text: #101820;
--text-muted: #5B636E;
--primary: #FFD100;
--on-primary: #101820;    /* Text on yellow is always black */
--focus-ring: #101820;
--danger: #FF585D;
--required: #FF585D;
```

#### Dark Theme (Variant Flip)
To swap the entire application into a refined dark theme, flip the variables inside `:root[data-theme="dark"]` or `.dark` class:
```css
--bg: #0B1220;
--surface: #141C2B;
--surface-2: #1E2839;
--border: #2A3446;
--text: #FFFFFF;
--text-muted: #9AA4B2;
--focus-ring: #FFD100;
```

---

## 2. Typography

- **Headings & Display Typography**: Uses **Poppins** as the active display font, mapped to `--font-display`.
  > `// TODO: swap to licensed Gilroy` when Gilroy `.woff2` font files are loaded into `src/app/fonts/`.
- **UI & Body Typography**: Mapped to `--font-body` using **Outfit** loaded via Google Fonts.

---

## 3. Geometry and Spacing

- **Small Radius (`--r-sm` / `10px`)**: Badges, tags.
- **Medium Radius (`--r-md` / `16px`)**: Inputs, textareas, selectors, and history items.
- **Large Radius (`--r-lg` / `22px`)**: Form panels and action cards.
- **Pill Radius (`--r-pill` / `999px`)**: Choice chips and primary buttons.
- **Touch Targets**: All choice chips and action controls maintain a minimum height of `40px` for mobile compliance.

---

## 4. Zoho Lead Integration (External Styling Split)

For the **Register a Lead** Zoho Form integration:
- The iframe wrapper and the surrounding header card are styled locally inside `src/app/lead/page.tsx` using the `Frido Connect Form` card layout and yellow top borders.
- To maintain design system consistency *inside* the iframe, apply the following custom styles within the **Zoho Form Builder CSS overrides panel**:
  - Set container font to `Outfit, sans-serif`.
  - Input field borders: `#E7E9ED` with radius `16px`.
  - Focused input field border ring: `2px solid #101820`.
  - Required fields asterisks: `#FF585D`.
  - Submit Button: Background `#FFD100`, text `#101820`, font weight `600`, border-radius `999px`.
