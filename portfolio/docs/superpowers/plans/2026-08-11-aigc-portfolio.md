# AIGC Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class AIGC portfolio that displays final image or video works with minimal copy and no prompt or generation-process fields.

**Architecture:** Use one `AigcWork` record with a discriminating `mediaType`, a required final `mediaUrl`, and a conditional video `coverUrl`. Public pages reuse ResponsiveImage and consent-first VideoPlayer; repositories and admin follow the same secure contracts as existing content.

**Tech Stack:** React 19, TypeScript, React Router, Zod, Vitest, Testing Library, CloudBase JS SDK, existing media components and admin ports.

## Global Constraints

- Public and admin UI expose only final work, title, one-line introduction, and year.
- Do not add prompt, workflow, model, seed, parameter, or generation-process fields.
- Image works use their final image as the list cover; video works require a separate image cover.
- Video media loads only after explicit user action through the existing `VideoPlayer` contract.
- Public reads filter exactly `status: 'published'` and sort by `sortOrder asc`.
- Media persistence accepts only HTTPS or `/media/` URLs.
- Write a failing test and observe the expected failure before every production change.
- Do not use live CloudBase, real credentials, network calls, real uploads, or deployment.

---

### Task 1: AIGC domain and conditional schema

**Files:**
- Modify: `portfolio/src/domain/content.ts`
- Modify: `portfolio/src/domain/schemas.ts`
- Modify: `portfolio/src/domain/schemas.test.ts`
- Modify: `portfolio/src/fixtures/content.ts`

**Interfaces:**
- Produces: `type AigcMediaType = 'image' | 'video'`
- Produces: `AigcWork`
- Produces: `aigcWorkSchema`, `adminAigcWorkSchema`, `fixtureAigcWorks`

- [ ] **Step 1: Write failing schema tests**

Assert a published image with empty `coverUrl` is valid, a published video requires `coverUrl`, unsafe final/cover URLs fail, and drafts allow empty media while preserving the media type.

```ts
expect(aigcWorkSchema.parse({ ...base, mediaType: 'image', mediaUrl: '/media/final.webp', coverUrl: '' })).toBeDefined()
expect(() => aigcWorkSchema.parse({ ...base, mediaType: 'video', mediaUrl: '/media/final.mp4', coverUrl: '' })).toThrow()
```

Also assert parsed keys do not include `prompt`, `model`, or `workflow` when extra input is supplied.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/domain/schemas.test.ts`

Expected: FAIL because AIGC exports do not exist.

- [ ] **Step 3: Implement exact type and refinement**

```ts
export interface AigcWork {
  id: string; slug: string; title: string; mediaType: 'image' | 'video'
  mediaUrl: string; coverUrl: string; summary: string; year: number
  featured: boolean; sortOrder: number; status: PublishStatus; updatedAt: string
}
```

Build public/private object schemas with `coverUrl: z.union([z.literal(''), publicMediaUrlSchema])` and use `superRefine` to add a `coverUrl` issue only for published video records with an empty cover. Do not add creative-process fields.

- [ ] **Step 4: Add fixtures and verify GREEN**

Add one image and one video fixture, both clearly marked `data-origin: fixture`. Run: `pnpm exec vitest run src/domain/schemas.test.ts && pnpm typecheck`.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/domain/content.ts portfolio/src/domain/schemas.ts portfolio/src/domain/schemas.test.ts portfolio/src/fixtures/content.ts
git commit -m "feat: define AIGC portfolio works"
```

### Task 2: AIGC repositories, rules, and media folders

**Files:**
- Modify: `portfolio/src/domain/repository.ts`
- Modify: `portfolio/src/infrastructure/memory/contentRepository.ts`
- Modify: `portfolio/src/infrastructure/memory/contentRepository.test.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/contentRepository.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/contentRepository.test.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/mediaStorage.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/mediaStorage.test.ts`
- Create: `portfolio/cloudbase/rules/aigc_works.json`
- Modify: `portfolio/cloudbase/rules/storage.json`
- Modify: `portfolio/src/infrastructure/cloudbase/securityArtifacts.test.ts`
- Modify: `portfolio/src/test/e2eHarness.ts`

**Interfaces:**
- Produces public methods: `listPublishedAigcWorks`, `getPublishedAigcWork`
- Produces admin methods: `listAllAigcWorks`, `saveAigcWork`, `deleteAigcWork`
- Produces `MediaFolder` values `'aigc-images'` and `'aigc-videos'`

- [ ] **Step 1: Write failing repository tests**

Repeat the real contract against memory and CloudBase: published-only ordered list, unpublished slug privacy, admin all-status list, parsed writes, exact ID delete. CloudBase collection must be `aigc_works` with `where({ status: 'published' }).orderBy('sortOrder', 'asc')`.

- [ ] **Step 2: Write failing storage/rules tests**

Assert `aigc-images` accepts JPEG/PNG/WebP up to 20 MB and rejects MP4; `aigc-videos` accepts MP4 up to 500 MB and rejects images. Both use UUID paths and `{ upsert: false }`. Assert public rule reads only published and admin role owns writes.

- [ ] **Step 3: Verify RED**

Run: `pnpm exec vitest run src/infrastructure/memory/contentRepository.test.ts src/infrastructure/cloudbase`

Expected: missing methods, folders, and rule failures.

- [ ] **Step 4: Implement repositories, folders, rule, and harness data**

Parse every public boundary with `aigcWorkSchema` and every admin boundary with `adminAigcWorkSchema`. Extend the memory constructor as `constructor(videos, photoSeries, profile, liveWorks = [], aigcWorks = [])`, preserving the exact typed arguments introduced by the live plan. Preserve existing generic error messages and lazy CloudBase setup. Pass `fixtureAigcWorks` as the fifth E2E memory-repository argument.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run src/infrastructure src/test/e2eHarness.test.ts && pnpm typecheck`

```bash
git add portfolio/src/domain/repository.ts portfolio/src/infrastructure portfolio/cloudbase/rules portfolio/src/test/e2eHarness.ts
git commit -m "feat: store secure AIGC works"
```

### Task 3: Public AIGC list and detail pages

**Files:**
- Create: `portfolio/src/features/aigc/AigcIndexPage.tsx`
- Create: `portfolio/src/features/aigc/AigcDetailPage.tsx`
- Create: `portfolio/src/features/aigc/AigcPages.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Produces: `/aigc`, `/aigc/:slug`
- Reuses: `ResponsiveImage`, `VideoPlayer`, public safe-state patterns

- [ ] **Step 1: Write page and route RED tests**

Assert image list cards use `mediaUrl`, video list cards use `coverUrl`, titles and summaries render, and no prompt/process label exists. Detail image renders ResponsiveImage. Detail video initially renders poster but no `<video>`, then creates `<video>` only after pressing play. Include empty, rejected, not-found, and stale response coverage.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/aigc/AigcPages.test.tsx src/app/router.test.tsx`

Expected: FAIL because pages and routes are absent.

- [ ] **Step 3: Implement public pages**

Use `mediaType === 'image' ? mediaUrl : coverUrl` for list presentation. Detail copy is limited to title, summary, year, and media. Use existing section indexes and safe retry/not-found wording; never render unknown repository error text.

- [ ] **Step 4: Add responsive editorial CSS**

Use mixed image/video cards in an asymmetric desktop grid and a direct single column on mobile. Because `AigcWork` intentionally carries no process or dimension metadata, list cover slots use one fixed `4:3` ratio with `object-fit: cover`; image detail pages display the final asset without forced cropping.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run src/features/aigc src/components/media/VideoPlayer.test.tsx src/app/router.test.tsx && pnpm typecheck`

```bash
git add portfolio/src/features/aigc portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx portfolio/src/styles/global.css
git commit -m "feat: add public AIGC portfolio"
```

### Task 4: AIGC admin list and editor

**Files:**
- Create: `portfolio/src/features/admin/AdminAigcListPage.tsx`
- Create: `portfolio/src/features/admin/AdminAigcEditor.tsx`
- Create: `portfolio/src/features/admin/AdminAigcEditor.test.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Produces: `/admin/aigc`, `/admin/aigc/:id`
- Consumes: AIGC admin repository methods and media storage port

- [ ] **Step 1: Write editor RED tests**

Test switching image/video type, correct `accept` MIME, correct folder, read-only resolved URLs, image publish without separate cover, video publish blocked without cover, draft save with incomplete media, safe upload rejection, safe save rejection, and absence of prompt/model inputs.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/admin/AdminAigcEditor.test.tsx src/features/admin/AdminListPage.test.tsx src/app/router.test.tsx`

Expected: missing component and routes.

- [ ] **Step 3: Implement schema-valid draft and editor**

```ts
{ id, slug, title: '', mediaType: 'image', mediaUrl: '', coverUrl: '', summary: '',
  year: new Date().getFullYear(), featured: false, sortOrder: 0,
  status: 'draft', updatedAt }
```

Upload final image to `aigc-images`, final MP4 to `aigc-videos`, and a video cover to `aigc-images`. Clear incompatible media URLs only after explicit media-type confirmation; do not perform destructive clearing on a simple select change without warning.

- [ ] **Step 4: Add admin overview/delete support**

Load AIGC records in the admin overview, add new/edit links, and extend the delete discriminator with `kind: 'aigc'`. Preserve delayed confirm, Escape, focus restoration, and no optimistic deletion.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run src/features/admin src/app/router.test.tsx && pnpm typecheck`

```bash
git add portfolio/src/features/admin portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx portfolio/src/styles/global.css
git commit -m "feat: manage AIGC portfolio works"
```

### Task 5: Full AIGC verification

**Files:**
- Modify: `portfolio/design-qa.md`

**Interfaces:**
- Produces: verified image/video AIGC flows with no process metadata

- [ ] **Step 1: Run all automated gates**

Run: `pnpm check && pnpm lint && git diff --check`

- [ ] **Step 2: Browser-check public and admin states**

At 390 × 844 and 1440 × 1000, verify image and video cards, consent-first playback, safe fallback, no prompt/process copy, no overflow, and touch targets. In E2E harness, create one image and one video draft and publish them without live services.

- [ ] **Step 3: Record evidence and commit**

```bash
git add portfolio/design-qa.md
git commit -m "test: verify AIGC portfolio workflows"
```
