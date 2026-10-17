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
    fontSize: "28px"
    fontWeight: 620
    lineHeight: 1.3
    letterSpacing: "-0.035em"
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
  control: "7px"
  navigation: "7px"
  surface: "10px"
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

Local Inter Variable supplies every text role, with Inter and sans-serif fallbacks. Page headings are compact and semibold; section titles are smaller. Body follows the frontmatter role. Form text uses 13px; table values and controls use 12px; secondary text, table headings and badges use 11px. Small utility text belongs to the dense table presentation, not long-form reading. Counts use tabular figures. Dialog descriptions are limited to 65ch.

## Layout

Desktop shell uses a 236px sidebar and flexible main area, with a 60px header. Content padding is 28px 34px 28px. At 1100px and below, navigation narrows to 200px and content padding to 28px 24px. Collapsed desktop navigation is 72px.

At 760px and below, navigation becomes a fixed 61px bottom bar, the header is 56px, content padding is 24px 16px, and two-column forms become one column. Tables retain horizontal scrolling and a pinned identity column. Page headings become 26px. Coarse-pointer controls have at least 44px hit targets; mobile form, search and quick-edit inputs use 16px text, and the bottom bar respects device safe areas. At 1600px and above, content padding becomes 44px 46px.

Records use 66px standard rows and 46px compact rows. Record details use centered modals up to 1080px wide and 860px high, with 32px desktop viewport margins. At 760px and below they retain 12px viewport margins, with a fixed heading and an internally scrolling body. Dialogs are at most 480px, or 740px for wide variants, constrained to the viewport with internal scrolling.

## Elevation & Depth

Tonal layering and one-pixel borders define ordinary surfaces. Dialogs, sheets and menus use the shared shadow: light `0 16px 64px rgba(20, 39, 65, 0.16)`, dark `0 16px 64px rgba(0, 0, 0, 0.35)`. Active desktop navigation uses a tonal surface without a shadow.

**The Protected Focus Rule.** Reserve the large shadow and dimming overlay for elevated editors and selection menus.

## Shapes

Controls use modest rounded corners; tags and badges are tighter, containers slightly softer, and dialogs use the largest recurring radius. Circular initials identify people. Brand and empty-state icon geometry do not establish general card shapes.

## Components

### Buttons
Primary controls use primary with primary-foreground text; outline controls use surface, border and foreground. Ghost controls remain transparent with muted text. Buttons have a 36px minimum height, 12px semibold text and frontmatter padding. Hover uses primary-hover or surface-hover with 140ms color/border feedback. Keyboard focus uses a 2px accent outline with 3px offset.

### Action groups and toolbars
Page actions are split by role. The page header holds the actions that create or bring in records: one primary button (`New …`) preceded, where relevant, by one outline import button. The toolbar below holds tools that change how the list is viewed, grouped into a single joined control (`.btn-group`) aligned to the right of the search field: Candidates uses Views, Filters and Export; Jobs uses Views and Export; Applications uses Views and the List/Board toggle.

The group is a 36px capsule with a 1px border and the control radius. Its children are borderless 34px buttons at 13px text with 15px icons, separated by 1px hairlines, with only the outer corners rounded. Hover uses surface-hover; an active toggle (Filters, List/Board) uses accent-soft with accent text. Menus opened from the group (saved views) are positioned outside it so they are never clipped. At 760px and below the search takes its own line and the group spans the full width with its buttons sharing the space.

### Copy feedback
Copying never raises a toast. The control that was clicked changes in place: its icon becomes a check and the control turns green (`--green` on `--green-bg`) for about 2.5 seconds, and its tooltip reads "Copied". Candidate email/phone icons show the full value in a tooltip on hover and copy on click; they do not open `mailto:` or `tel:`. If the clipboard is unavailable an error toast explains how to copy manually.

### Inputs / Fields
Bordered inputs use the surface token. Table fields are transparent at rest, reveal a border on hover and use accent on focus. Dirty, saving and error states remain explicit. Detached failed drafts stay in a recovery panel; normalization preserves queued edits. Error text names the failure and offers recovery. Caret, selection highlight and focus colors come from the theme.

Candidate availability uses an inline Radix Select for direct table editing, with a minimum 135px status column and 30px control. Its compact accent treatment distinguishes an editable choice from a static label.

### Navigation
Desktop navigation uses icon and label with active surface/accent treatment. Mobile uses five equal bottom destinations with visible labels. Preserve active semantics and keyboard focus. The skip link moves focus to the main content.

### Chips / Containers
Status badges pair tinted backgrounds with semantic text. Skill tags use a thin border and surface background. Record containers use a 10px radius and border; headers and candidate identity remain sticky while scrolling.

### Detail editor
The wide centered detail modal protects focused work while retaining dimmed record-list context. All four record types share this layout, with two-column forms on desktop and one column on mobile. Nested creation and confirmation overlays sit above the detail modal. Dialog closure restores focus to the opener. Profile item deletion uses a confirmation dialog, and long titles wrap without moving the close control offscreen. It enters over 180ms using `cubic-bezier(.16, 1, .3, 1)`, with a small centered fade/settle and no slide from the screen edge. Modal/menu entrances are 180ms/140ms, and overlays enter over 160ms. Page navigation uses a bounded 160ms opacity transition without remounting content. Table rows never animate on live edits. Reduced-motion preference disables spatial/keyframe effects and JavaScript navigation animation, while retaining 80ms color feedback and readable status text.

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

## Workspace refinement — 17 October 2026

- Keep local Inter and the established light-blue palette. Semantic available status is green in both the list editor and profile summary.
- Names are the strongest table text. Inline secondary fields sit immediately below; reveal arrows occupy reserved space and never create an extra line. Standard candidate rows are 66px on desktop. Compact density remains available.
- Every record table has a pinned identity column, a keyboard-focusable scrolling region, and a horizontal-scroll hint only when needed. Scroll listeners update state only when an edge changes; no row motion is introduced.
- Mobile toolbars put search on its own full-width line. Candidate identity is 170px wide; initials yield to the name on narrow screens. Touch controls keep 44px targets. Names and editable fields use 16px text on mobile; weight distinguishes identity from secondary fields.
- Collapsed candidate filters expose removable active-filter chips. Clear search returns focus to its input. Menus fit available viewport height and expose scroll controls for long option lists.
- Settings starts with preferences, followed by backup, import/export, storage and samples. A section index sits beside desktop content and scrolls horizontally on smaller screens. Section links preserve the workspace route. Navigating to a different workspace page resets the document scroll position.
- Keep the existing bounded 160ms page fade, 180ms centered detail-modal entrance, and 180ms modal entrance. Live edits never replay navigation motion. Dropdown arrows acknowledge open state over 140ms, disabled for reduced motion.
- CSS refinement is grouped at the end of the existing stylesheet so framework entrypoints and prior responsive/safety rules remain intact. Colors continue to use the existing semantic tokens.
