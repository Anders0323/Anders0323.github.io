# Catalog Grid and Adaptive Video Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all four public catalog titles smaller, display catalog works in two columns, and adapt the video detail player to the real media orientation without cropping.

**Architecture:** Keep the current repository-backed pages and component boundaries. Add observable layout contracts to existing page tests, then extend `VideoPlayer` with an initial aspect ratio and metadata-driven update while CSS controls contain rendering.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, CSS.

## Global Constraints

- Preserve all existing CloudBase repository and admin behavior.
- Mobile catalog grid has exactly two columns.
- Portrait covers remain 3:4; landscape covers remain 4:3.
- Video media uses its intrinsic dimensions and is never cropped.
- No new dependency.

---

### Task 1: Protect the confirmed catalog layout

**Files:**
- Modify: `src/features/videos/VideoIndexPage.test.tsx`
- Modify: `src/features/photography/PhotographyPages.test.tsx`
- Modify: `src/features/live/LivePages.test.tsx`
- Modify: `src/features/aigc/AigcPages.test.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: existing catalog page class names.
- Produces: a shared two-column/mobile title CSS contract.

- [ ] Add failing page assertions that observe two rendered works per grid row through computed CSS and the shared main-title class.
- [ ] Run the four focused suites and confirm the new assertions fail for the current single-column/oversized rules.
- [ ] Add one shared catalog-title rule and two-column grid rules while preserving 3:4 and 4:3 cover ratios.
- [ ] Re-run the focused suites and confirm they pass.

### Task 2: Make VideoPlayer orientation-aware

**Files:**
- Modify: `src/components/media/VideoPlayer.test.tsx`
- Modify: `src/components/media/VideoPlayer.tsx`
- Modify: `src/features/videos/VideoDetailPage.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `initialAspectRatio: number` from the video work orientation.
- Produces: metadata-driven inline `aspectRatio` and contained media rendering.

- [ ] Add failing tests for portrait initial ratio, landscape initial ratio, metadata-driven ratio change, and `object-fit: contain` behavior.
- [ ] Run the focused player/detail tests and confirm failure is caused by missing adaptive behavior.
- [ ] Extend `VideoPlayer` with `initialAspectRatio`, update it from `videoWidth / videoHeight` on metadata load, and pass the correct initial ratio from `VideoDetailPage`.
- [ ] Re-run focused tests and confirm they pass.

### Task 3: Verify responsive behavior

**Files:**
- Modify only if verification exposes a scoped defect.

**Interfaces:**
- Consumes: completed catalog and player behavior.
- Produces: verified local rendering at 390px and desktop widths.

- [ ] Run focused Vitest suites.
- [ ] Run `pnpm typecheck`, `pnpm lint`, and `git diff --check`.
- [ ] Inspect `/videos`, `/photography`, `/live`, `/aigc`, and a video detail route at mobile width in the local preview.
- [ ] Report exact verification results and any remaining limitation.
