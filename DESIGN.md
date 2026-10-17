---
name: Recruitdesk
description: A calm locally stored recruiting workspace.
colors:
  background: "#f7f9fc"
  surface: "#ffffff"
  surface-hover: "#f0f5fb"
  foreground: "#203047"
  muted: "#5f7087"
  border: "#dce5f0"
  primary: "#b9dcff"
  primary-hover: "#a5cff7"
  primary-foreground: "#163e68"
  accent: "#275f9c"
  accent-hover: "#1d4e85"
  accent-soft: "#e7f2ff"
  sidebar: "#edf4fc"
  sidebar-border: "#d9e5f2"
  green: "#38694e"
  green-bg: "#e9f3e9"
  blue: "#3b647f"
  blue-bg: "#eaf1f8"
  amber: "#84621f"
  amber-bg: "#f9f2e2"
  red: "#ad4942"
  red-bg: "#fbeeea"
  selection: "#d5eaff"
  dark-background: "#141d2a"
  dark-surface: "#1b2738"
  dark-surface-hover: "#26364b"
  dark-foreground: "#e6eef9"
  dark-muted: "#acbbcf"
  dark-border: "#36475f"
  dark-primary: "#9acbff"
  dark-primary-hover: "#b5daff"
  dark-primary-foreground: "#10243c"
  dark-accent: "#9acbff"
  dark-accent-hover: "#b5daff"
  dark-accent-soft: "#243e5e"
  dark-sidebar: "#182435"
  dark-sidebar-border: "#36475f"
  dark-green: "#b0d4b6"
  dark-green-bg: "#2a4030"
  dark-blue: "#b3cde4"
  dark-blue-bg: "#263c4b"
  dark-amber: "#e4c27f"
  dark-amber-bg: "#423922"
  dark-red: "#f3b1a7"
  dark-red-bg: "#4b2f2a"
  dark-selection: "#304e73"
typography:
  headline:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "27px"
    fontWeight: 620
    lineHeight: 1.3
    letterSpacing: "-0.85px"
  title:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.45px"
  body:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "13px"
    lineHeight: 1.5
  label:
    fontFamily: "Inter Variable, Inter, sans-serif"
    fontSize: "11px"
    fontWeight: 500
rounded:
  tag: "4px"
  badge: "5px"
  control: "6px"
  navigation: "7px"
  surface: "8px"
  dialog: "12px"
spacing:
  compact: "8px"
  control: "12px"
  group: "16px"
  section: "24px"
  dialog: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "9px 11px"
  navigation:
    textColor: "{colors.muted}"
    rounded: "{rounded.navigation}"
    padding: "10px 12px"
  badge:
    backgroundColor: "{colors.green-bg}"
    textColor: "{colors.green}"
    rounded: "{rounded.badge}"
    padding: "3px 7px"
  record-surface:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
---
# Design System: Recruitdesk

## Overview

**Creative North Star: "The Professional Reference Index"**

A professional reference index: pale blue primary actions, cool blue navigation and editable records on quiet surfaces. Typography and alignment establish hierarchy; color identifies actions and meaningful record states.

The system supports dense everyday recruiting work. Light and dark themes preserve the same relationships; fonts and icons are bundled locally.

**Key Characteristics:**
- Dense aligned records with persistent identity.
- Tonal surfaces and restrained borders.
- Protected detail editing with visible save state.

## Colors

### Primary
Pale blue fills identify primary actions with dark blue text. A separate deeper blue accent keeps navigation, text, focus and selected controls readable in light mode. Dark mode uses pale blue accents over navy surfaces. This palette follows Ray’s explicit light-blue primary color request.

### Neutral
Background, surface, surface-hover and sidebar form the tonal hierarchy. Foreground and muted provide the text levels; border separates records. Frontmatter records the exact light and dark CSS values; `dark-` entries are theme overrides.

Green, blue, amber and red foreground/background pairs accompany textual status labels.

**The Semantic Pair Rule.** Keep status foregrounds paired with their corresponding tinted backgrounds in either theme.

## Typography

Local Inter Variable supplies every text role, with Inter and sans-serif fallbacks. Page headings are compact and semibold; section titles are smaller. Body follows the frontmatter role, form text uses 12px and table text 11px. Table headings are 10px; badges are 9px. Small utility text belongs to the dense table presentation, not long-form reading. Counts use tabular figures. Dialog descriptions are limited to 65ch.

## Layout

Desktop shell uses a 236px sidebar and flexible main area, with a 65px header. Content padding is 36px 34px 28px. At 1100px and below, navigation narrows to 200px and content padding to 28px 24px. Collapsed desktop navigation is 72px.

At 760px and below, navigation becomes a fixed 61px bottom bar, the header is 53px, content padding is 25px 17px, and two-column forms become one column. Tables retain horizontal scrolling and a pinned identity column. Page headings become 24px. Coarse-pointer controls have at least 44px hit targets; mobile form and quick-edit inputs use 16px text, and the bottom bar respects device safe areas. At 1600px and above, content padding becomes 44px 46px.

Records use 66px standard rows and 46px compact rows. Detail sheets are at most 660px wide, becoming full width on narrow screens. Dialogs are at most 480px, or 740px for wide variants, constrained to the viewport with internal scrolling.

## Elevation & Depth

Tonal layering and one-pixel borders define ordinary surfaces. Dialogs, sheets and menus use the shared shadow: light `0 16px 64px rgba(20, 39, 65, 0.16)`, dark `0 16px 64px rgba(0, 0, 0, 0.35)`. Active desktop navigation uses `0 2px 5px rgba(0, 0, 0, 0.025)`.

**The Protected Focus Rule.** Reserve the large shadow and dimming overlay for elevated editors and selection menus.

## Shapes

Controls use modest rounded corners; tags and badges are tighter, containers slightly softer, and dialogs use the largest recurring radius. Circular initials identify people. Brand and empty-state icon geometry do not establish general card shapes.

## Components

### Buttons
Primary controls use primary with primary-foreground text; outline controls use surface, border and foreground. Ghost controls remain transparent with muted text. Buttons have a 34px minimum height, 11px semibold text and frontmatter padding. Hover uses primary-hover or surface-hover with 140ms color/border feedback. Keyboard focus uses a 2px accent outline with 3px offset.

### Inputs / Fields
Bordered inputs use the surface token. Table fields are transparent at rest, reveal a border on hover and use accent on focus. Dirty, saving and error states remain explicit. Detached failed drafts stay in a recovery panel; normalization preserves queued edits. Error text names the failure and offers recovery. Caret, selection highlight and focus colors come from the theme.

Candidate availability uses an inline Radix Select for direct table editing, with a minimum 135px status column and 28px control. Its compact accent treatment distinguishes an editable choice from a static label.

### Navigation
Desktop navigation uses icon and label with active surface/accent treatment. Mobile uses five equal bottom destinations with visible labels. Preserve active semantics and keyboard focus. The skip link moves focus to the main content.

### Chips / Containers
Status badges pair tinted backgrounds with semantic text. Skill tags use a thin border and surface background. Record containers use an 8px radius and border; headers and candidate identity remain sticky while scrolling.

### Detail editor
The sheet protects focused work while retaining record-list context. Dialog closure restores focus to the opener. Profile item deletion uses a confirmation dialog, and long titles wrap without moving the close control offscreen. It enters over 220ms using `cubic-bezier(.16, 1, .3, 1)`, from a 24px horizontal offset at full opacity. Modal/menu entrances are 180ms/140ms, and overlays enter over 160ms. Page navigation uses a bounded 160ms opacity transition without remounting content. Table rows never animate on live edits. Reduced-motion preference disables spatial/keyframe effects and JavaScript navigation animation, while retaining 80ms color feedback and readable status text.

## Do's and Don'ts

### Do:
- Do retain local Inter and the consistent Lucide icon vocabulary.
- Do show focus, dirty, saving, error and empty states explicitly.
- Do preserve semantic labels alongside status color.
- Do adapt navigation and forms to narrow screens while retaining table scrolling.

### Don't:
- Don't introduce remote fonts, images or analytics into the visual layer.
- Don't replace useful records with decorative metrics or illustration.
- Don't use color alone to communicate a status or failure.
