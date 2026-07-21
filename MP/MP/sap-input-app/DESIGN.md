---
name: CMMS PTPN IV Monitoring Work Order
description: The Industrial Command Center (Data-dense, precise, high-contrast)
colors:
  primary: "#064e3b"
  secondary: "#10b981"
  tertiary: "#f59e0b"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  neutral-text: "#0f172a"
  neutral-muted: "#64748b"
typography:
  display:
    fontFamily: "'Instrument Sans', sans-serif"
    fontWeight: 700
  headline:
    fontFamily: "'Instrument Sans', sans-serif"
    fontWeight: 700
    fontSize: "1.5rem"
  title:
    fontFamily: "'Instrument Sans', sans-serif"
    fontWeight: 600
  body:
    fontFamily: "'Instrument Sans', sans-serif"
    fontWeight: 400
  label:
    fontFamily: "'Font-Mono', monospace"
    fontWeight: 700
    fontSize: "0.625rem"
    letterSpacing: "0.05em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  card:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
---

# Design System: CMMS PTPN IV Monitoring Work Order

## 1. Overview

**Creative North Star: "The Industrial Command Center (Data-dense, precise, high-contrast)"**

The CMMS PTPN IV design system merges the firmness of the industrial sector (palm oil mills) with the freshness of agriculture. It is an industrial command center that presents thousands of rows of data rapidly and clearly. The aesthetic relies on high-contrast data, precise text alignment, and comfortable scanning rhythms, while avoiding glaring background colors or low-contrast gray text.

**Key Characteristics:**
- Data clarity over decoration.
- Comfortable alerts (using text color on clean backgrounds).
- Fast scannability via rhythm and semibold weights.
- Modern glassmorphism for floating overlays.

## 2. Colors

A natural, curated palette that projects corporate luxury and industrial stability.

### Primary
- **Forest Canopy (PTPN Emerald)** (`#064e3b`): The core brand identity, used for dominant headers, primary actions, and deep backgrounds.

### Secondary
- **Fresh Sprout (Leaf Green)** (`#10b981`): Used for success states, accents, and secondary actions.

### Tertiary
- **Harvest Gold** (`#f59e0b`): Warning states, alerts, and configurations.

### Neutral
- **Clean Paper** (`#f8fafc`): The main application background.
- **Surface White** (`#ffffff`): Card and container backgrounds.
- **Obsidian Ink** (`#0f172a`): Primary text for high readability.
- **Slate Muted** (`#64748b`): Secondary text and borders.

### Named Rules
**The Glare-Free Rule.** Backgrounds remain clean (white or light slate). Alerts and status indicators use colored text or subtle tinted backgrounds, never full-saturation blinding banners.

## 3. Typography

**Display Font:** 'Instrument Sans', sans-serif
**Body Font:** 'Instrument Sans', sans-serif
**Label/Mono Font:** 'Font-Mono', monospace

**Character:** A modern, highly readable sans-serif paired with a precise monospace font to reinforce a computerized, accurate industrial feel.

### Hierarchy
- **Display** (700, clamp(2rem, 5vw, 3rem)): Main application heroes.
- **Headline** (700, 1.5rem): Page headers and major sections.
- **Title** (600, 1.125rem): Card headers and widget titles.
- **Body** (400, 0.875rem): Standard UI text and table cells.
- **Label** (700, 0.625rem, 0.05em, uppercase): Table headers, badges, and metadata (uses monospace).

### Named Rules
**The Mono Precision Rule.** Data points, IDs, equipment numbers, and financial costs must use the monospace font for strict columnar alignment and an industrial dashboard feel.

## 4. Elevation

Layered, using soft shadows to separate the table and cards from the background.

### Shadow Vocabulary
- **Card Shadow** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Subtle lift for content cards and tables.
- **Floating Shadow** (`box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25)`): Used exclusively for modals and floating glassmorphic elements.

### Named Rules
**The Structural Shadow Rule.** Shadows are structural, not ambient. They define the hierarchy between the base layer (background) and interactive/content layers (cards, tables, modals).

## 5. Components

### Cards / Containers
- **Corner Style:** 24px (`rounded-3xl`) for main layout cards, 16px (`rounded-2xl`) for nested summary cards.
- **Background:** White (`#ffffff`).
- **Shadow Strategy:** Subtle card shadow to lift from the background.
- **Border:** 1px solid slate-200.

### Buttons
- **Shape:** 8px or 12px radius.
- **Primary:** Forest Canopy (`#064e3b`) background, White text.
- **Hover / Focus:** Transitions to slightly darker emerald (`#065f46`).

### Tables
- **Style:** Data-dense, 11px body text, 10px uppercase monospace headers.
- **Interactions:** Sticky headers (white background) to maintain context during scroll.

### Modals & Overlays
- **Style:** Modern glass (glassmorphism, blurs, semi-transparent). Uses `backdrop-blur-xs` and deep slate overlays (`bg-slate-900/60`).

## 6. Do's and Don'ts

### Do:
- **Do** ensure a minimum 4.5:1 text contrast ratio for optimal readability.
- **Do** use sticky headers and frozen layout sections for long data tables.
- **Do** align monetary values and numeric IDs using the monospace font.

### Don't:
- **Don't** use glaring, bright background colors for alerts (use colored text instead).
- **Don't** use nested cards (cards within cards); keep the layout hierarchy flat and clear.
- **Don't** use thin, low-contrast gray text that is hard to read.
