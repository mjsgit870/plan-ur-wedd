---
name: ui-ux-pro-max
description: Elite UI/UX design and interaction standards for modern web and mobile apps. Enforces design systems, micro-interactions, responsive ergonomics, accessibility, skeleton loaders, and feedback loops.
---

# UI/UX Pro Max Skill Guidelines

## 1. Visual Hierarchy & Aesthetics
- **Color Discipline:** 1 primary accent (Rose/Emerald for wedding themes), subtle tints for surface backgrounds (`slate-50`, `rose-50/50`), neutral text (`slate-900` for titles, `slate-600` for body, `slate-400` for captions). WCAG AA contrast ratio minimum 4.5:1.
- **Elevation & Depth:** Avoid harsh black shadows. Use multi-layer ambient shadows (`shadow-xs`, `shadow-sm`) and subtle borders (`border-gray-200/80`).
- **Typography Rhythm:** Strict font scale with balanced line-heights. Numerical values formatted cleanly in local currency (`Intl.NumberFormat`) with tabular figures.

## 2. Micro-Interactions & Fluidity
- **Tactile Feedback:** Active button downscaling (`active:scale-[0.98]`), gentle hover elevation.
- **Timing Functions:** Fast cubic-bezier easing (`cubic-bezier(0.16, 1, 0.3, 1)` or `ease-out`) between 150ms and 250ms. Never sluggish (>350ms).
- **Progress Transitions:** Progress bars transition widths smoothly with `transition-all duration-300 ease-out`.

## 3. Perceived Performance & Loading States
- **Skeleton Loaders:** Never show blank screens or jarring shifts. Use content-shaped pulsing skeletons (`animate-pulse bg-gray-200/70 rounded-lg`).
- **Inline Button Spinners:** Buttons preserve dimensions when switching to loading state.
- **Optimistic or Immediate Feedback:** Toast alerts acknowledge operations instantly.

## 4. Ergonomics & Mobile-First
- **Touch Targets:** Minimum 44x44px hit-box for primary touch elements on mobile.
- **Reachability:** Critical action triggers and primary navigation located in the bottom thumb zone on mobile screens.
- **Sheet & Drawers:** Use bottom drawers for input forms on mobile, centered modals on desktop.

## 5. Empathetic Empty & Error States
- Provide helpful guidance and a single clear call-to-action (CTA) instead of dead-ends.
- Friendly contextual error notices with actionable recovery paths.
