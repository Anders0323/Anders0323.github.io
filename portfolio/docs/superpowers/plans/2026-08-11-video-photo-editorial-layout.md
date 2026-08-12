# Video and Photography Editorial Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each short-video case an explicit portrait or landscape cover choice and turn photography detail pages into accessible editorial image sequences.

**Architecture:** Add a backwards-compatible `coverOrientation` domain field and one pure presentation helper so public pages and the admin editor share the same cover decision. Photography keeps array order and intrinsic dimensions; a pure layout classifier supplies CSS classes without changing semantic order.

**Tech Stack:** React 19, TypeScript, React Router, Zod, Vitest, Testing Library, CSS Grid, existing repository ports.

## Global Constraints

- Portrait video covers are exactly `3:4`; landscape video covers are exactly `4:3`.
- Missing legacy `coverOrientation` parses as `portrait`.
- Photography series-list covers remain `3:4`; detail images retain intrinsic aspect ratio.
- Do not change the homepage information hierarchy or add new dependencies.
- Preserve repository-only content access, public-safe errors, full-screen viewer keyboard behavior, and media URL security.
- Write a failing test and observe the expected failure before every production change.
- Do not use live CloudBase, real credentials, real uploads, network calls, or deployment during implementation.

---

### Task 1: Cover-orientation domain contract

**Files:**
- Modify: `portfolio/src/domain/content.ts`
- Modify: `portfolio/src/domain/schemas.ts`
- Modify: `portfolio/src/domain/schemas.test.ts`
- Modify: `portfolio/src/fixtures/content.ts`

**Interfaces:**
- Produces: `type CoverOrientation = 'portrait' | 'landscape'`
- Produces: `VideoWork.coverOrientation: CoverOrientation`
- Produces: `videoWorkSchema` and `adminVideoWorkSchema` that default an absent field to `portrait`

- [ ] **Step 1: Write failing schema tests**

Add literal expectations to `schemas.test.ts`:

```ts
it('defaults legacy video cover orientation to portrait', () => {
  const { coverOrientation: _omitted, ...legacy } = fixtureVideos[0]
  expect(videoWorkSchema.parse(legacy).coverOrientation).toBe('portrait')
})

it('accepts only portrait or landscape cover orientation', () => {
  expect(videoWorkSchema.parse({ ...fixtureVideos[0], coverOrientation: 'landscape' }).coverOrientation).toBe('landscape')
  expect(() => videoWorkSchema.parse({ ...fixtureVideos[0], coverOrientation: 'square' })).toThrow()
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run src/domain/schemas.test.ts`

Expected: FAIL because `coverOrientation` is not present in parsed output and `square` is not rejected.

- [ ] **Step 3: Add the minimal type and schema**

In `content.ts`:

```ts
export type CoverOrientation = 'portrait' | 'landscape'

export interface VideoWork {
  // existing fields
  coverOrientation: CoverOrientation
}
```

In both public and private video schema shapes:

```ts
coverOrientation: z.enum(['portrait', 'landscape']).default('portrait'),
```

Add explicit mixed values to fixtures so at least one fixture is `landscape` and one is `portrait`.

- [ ] **Step 4: Verify GREEN and type consistency**

Run: `pnpm exec vitest run src/domain/schemas.test.ts src/infrastructure/memory/contentRepository.test.ts src/infrastructure/cloudbase/contentRepository.test.ts && pnpm typecheck`

Expected: all pass; any hand-built `VideoWork` fixture now includes `coverOrientation` or is parsed through the schema default.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/domain/content.ts portfolio/src/domain/schemas.ts portfolio/src/domain/schemas.test.ts portfolio/src/fixtures/content.ts
git commit -m "feat: add video cover orientation contract"
```

### Task 2: Shared video cover presentation

**Files:**
- Create: `portfolio/src/features/videos/videoCover.ts`
- Create: `portfolio/src/features/videos/videoCover.test.ts`
- Modify: `portfolio/src/features/videos/VideoIndexPage.tsx`
- Modify: `portfolio/src/features/videos/VideoIndexPage.test.tsx`
- Modify: `portfolio/src/features/home/HomePage.tsx`
- Modify: `portfolio/src/features/home/HomePage.test.tsx`
- Modify: `portfolio/src/features/home/HomePage.coverRatios.test.ts`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Consumes: `VideoWork.coverOrientation`
- Produces: `getVideoCover(video: VideoWork): { src: string; width: number; height: number; modifier: 'portrait' | 'landscape' }`

- [ ] **Step 1: Write the pure-helper RED test**

```ts
expect(getVideoCover({ ...fixtureVideos[0], coverOrientation: 'portrait' })).toEqual({
  src: fixtureVideos[0].verticalCoverUrl, width: 3, height: 4, modifier: 'portrait',
})
expect(getVideoCover({ ...fixtureVideos[0], coverOrientation: 'landscape' })).toEqual({
  src: fixtureVideos[0].horizontalCoverUrl, width: 4, height: 3, modifier: 'landscape',
})
```

Add component assertions that mixed fixtures render `cover-portrait` and `cover-landscape` and select the expected URLs.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/videos/videoCover.test.ts src/features/videos/VideoIndexPage.test.tsx src/features/home/HomePage.test.tsx`

Expected: FAIL because `videoCover.ts` and orientation modifier classes do not exist.

- [ ] **Step 3: Implement the helper and consume it**

```ts
export function getVideoCover(video: VideoWork) {
  return video.coverOrientation === 'landscape'
    ? { src: video.horizontalCoverUrl, width: 4, height: 3, modifier: 'landscape' as const }
    : { src: video.verticalCoverUrl, width: 3, height: 4, modifier: 'portrait' as const }
}
```

Use the helper in homepage and video catalog images. Render classes as `video-catalog-cover cover-${modifier}` and `video-cover cover-${modifier}`. Set image `width` and `height` from the helper so intrinsic reservation matches the selected ratio.

Replace the viewport-orientation rule with data-driven modifiers:

```css
.cover-portrait { aspect-ratio: 3 / 4; }
.cover-landscape { aspect-ratio: 4 / 3; }
.video-cover,
.video-catalog-cover {
  width: 100%;
  height: auto;
  object-fit: cover;
}
```

Keep `.photo-cover` and `.photography-series-cover` fixed at `3 / 4`; remove any `@media (orientation: landscape)` cover switch.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/features/videos src/features/home`

Expected: all focused tests pass and the cover-ratio regression test protects both modifier rules and explicit height release.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/features/videos portfolio/src/features/home portfolio/src/styles/global.css
git commit -m "feat: render mixed video cover orientations"
```

### Task 3: Admin cover-orientation control

**Files:**
- Modify: `portfolio/src/features/admin/AdminVideoEditor.tsx`
- Modify: `portfolio/src/features/admin/AdminVideoEditor.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`

**Interfaces:**
- Consumes: `CoverOrientation`
- Produces: an accessible “封面版式” select and publish validation for the chosen URL

- [ ] **Step 1: Write failing editor tests**

Test that the select changes the saved payload and that publish blocks only when the selected cover is missing:

```ts
await user.selectOptions(screen.getByLabelText('封面版式'), 'landscape')
await user.click(screen.getByRole('button', { name: '发布作品' }))
expect(saveVideo).toHaveBeenCalledWith(expect.objectContaining({ coverOrientation: 'landscape' }))
```

Use one fixture with `horizontalCoverUrl: ''` and assert the visible error is `请上传横版封面`; repeat portrait with `请上传竖版封面`.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/admin/AdminVideoEditor.test.tsx src/app/router.test.tsx`

Expected: FAIL because no control exists and new draft values omit the field.

- [ ] **Step 3: Implement the control and validation**

Add the select:

```tsx
<label>
  <span>封面版式</span>
  <select aria-label="封面版式" value={video.coverOrientation}
    onChange={(event) => update('coverOrientation', event.currentTarget.value as CoverOrientation)}>
    <option value="portrait">竖版 3:4</option>
    <option value="landscape">横版 4:3</option>
  </select>
</label>
```

Resolve `selectedCoverUrl` before publish and report the orientation-specific safe error. Set `coverOrientation: 'portrait'` in `AdminVideoRoute` new-draft construction.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/features/admin/AdminVideoEditor.test.tsx src/app/router.test.tsx && pnpm typecheck`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/features/admin/AdminVideoEditor.tsx portfolio/src/features/admin/AdminVideoEditor.test.tsx portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx
git commit -m "feat: choose video cover layout in admin"
```

### Task 4: Photography editorial classifier and layout

**Files:**
- Create: `portfolio/src/features/photography/photoLayout.ts`
- Create: `portfolio/src/features/photography/photoLayout.test.ts`
- Modify: `portfolio/src/features/photography/PhotoSeriesPage.tsx`
- Modify: `portfolio/src/features/photography/PhotographyPages.test.tsx`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Consumes: `PhotoAsset.width`, `PhotoAsset.height`, and array index
- Produces: `getPhotoLayout(photo: PhotoAsset, index: number): { orientation: 'landscape' | 'portrait' | 'detail'; align: 'start' | 'end' | 'center' }`

- [ ] **Step 1: Write failing classifier and DOM-order tests**

```ts
expect(getPhotoLayout({ ...photo, width: 1600, height: 900 }, 0).orientation).toBe('landscape')
expect(getPhotoLayout({ ...photo, width: 900, height: 1600 }, 1).orientation).toBe('portrait')
expect(getPhotoLayout({ ...photo, width: 1200, height: 1100 }, 2).orientation).toBe('detail')
```

Render three photos and assert figure `data-layout` values while image alt order remains the repository array order.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/photography/photoLayout.test.ts src/features/photography/PhotographyPages.test.tsx`

Expected: FAIL because the classifier and data attributes do not exist.

- [ ] **Step 3: Implement deterministic classification**

```ts
export function getPhotoLayout(photo: PhotoAsset, index: number) {
  const ratio = photo.width / photo.height
  const orientation = ratio >= 1.2 ? 'landscape' : ratio <= 0.8 ? 'portrait' : 'detail'
  const aligns = ['start', 'end', 'center'] as const
  return { orientation, align: aligns[index % aligns.length] }
}
```

Add `data-layout` and `data-align` to each figure without reordering the array.

Implement desktop 12-column spans and mobile width tiers:

```css
.photo-series-item[data-layout='landscape'] { width: 100%; }
.photo-series-item[data-layout='portrait'] { width: 82%; }
.photo-series-item[data-layout='detail'] { width: 68%; }
.photo-series-item[data-align='end'] { margin-left: auto; }
.photo-series-item[data-align='center'] { margin-inline: auto; }
@media (min-width: 56rem) {
  .photo-series-item[data-layout='landscape'] { grid-column: 1 / 11; }
  .photo-series-item[data-layout='portrait'] { grid-column: 8 / 13; }
  .photo-series-item[data-layout='detail'] { grid-column: 3 / 8; }
}
```

Keep thumbnail inline `aspectRatio` and the viewer unchanged.

- [ ] **Step 4: Verify GREEN and viewer regression**

Run: `pnpm exec vitest run src/features/photography`

Expected: classifier, DOM order, viewer focus, Escape, navigation, and scroll-lock tests all pass.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/features/photography portfolio/src/styles/global.css
git commit -m "feat: add editorial photography sequences"
```

### Task 5: Browser QA and complete gate

**Files:**
- Modify: `portfolio/design-qa.md`

**Interfaces:**
- Consumes: completed Tasks 1–4
- Produces: measured portrait/landscape cover evidence and editorial-gallery QA record

- [ ] **Step 1: Run focused and full automated gates**

Run: `pnpm check && pnpm lint && git diff --check`

Expected: typecheck, all Vitest and Node release-gate tests, production build, lint, and whitespace check pass.

- [ ] **Step 2: Verify mobile public pages in the in-app browser**

At 390 × 844, inspect all four `/videos?category=` values and one mixed photography detail. Measure every catalog cover bounding box; portrait ratios must be `0.75`, landscape ratios `1.3333`. Confirm no cover uses the HTML source height as rendered pixels and no horizontal overflow exists.

- [ ] **Step 3: Verify desktop editorial rhythm**

At 1440 × 1000, confirm mixed video cards preserve DOM order, horizontal cards occupy wider spans, and photo landscape/portrait/detail figures visibly differ without resembling a repeated nine-grid.

- [ ] **Step 4: Record exact evidence**

Append viewport, route, measurements, interaction checks, and any remaining P3 polish only to `design-qa.md`. Do not claim a browser state that was not observed.

- [ ] **Step 5: Commit**

```bash
git add portfolio/design-qa.md
git commit -m "test: verify mixed editorial cover layouts"
```
