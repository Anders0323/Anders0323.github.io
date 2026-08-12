# Live Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-class live-event portfolio whose cases contain screenshots and concise copy, with public pages, secure repositories, and admin editing but no replay video.

**Architecture:** Model a live case as metadata plus ordered `PhotoAsset[]`, reuse the existing responsive image and full-screen viewer, and extend both repository implementations behind the existing ports. Public and admin routes remain repository-injected; CloudBase access stays lazy and security-rule constrained.

**Tech Stack:** React 19, TypeScript, React Router, Zod, Vitest, Testing Library, CloudBase JS SDK, existing media storage and PhotoViewer.

## Global Constraints

- A live case contains screenshots and short text only; never add a replay URL or video player.
- Each case contains 1–12 published screenshots with editable alt, width, and height.
- Public reads filter exactly `status: 'published'` and sort by `sortOrder asc`.
- Media persistence accepts only HTTPS or `/media/` URLs; no `blob:`, `cloud://`, local path, or filename persistence.
- Admin errors and public errors must remain generic and must not leak SDK or collection details.
- Write a failing test and observe the expected failure before every production change.
- Do not use live CloudBase, real credentials, network calls, real uploads, or deployment.

---

### Task 1: Live-work domain and schemas

**Files:**
- Modify: `portfolio/src/domain/content.ts`
- Modify: `portfolio/src/domain/schemas.ts`
- Modify: `portfolio/src/domain/schemas.test.ts`
- Modify: `portfolio/src/fixtures/content.ts`

**Interfaces:**
- Produces: `LiveWork`
- Produces: `liveWorkSchema` and `adminLiveWorkSchema`
- Produces: `fixtureLiveWorks: LiveWork[]`

- [ ] **Step 1: Write failing schema tests**

Create a literal valid case and assert published cases require title, summary, description, roles, heldAt, a cover that belongs to screenshots, and 1–12 valid screenshots. Assert draft allows empty text, empty cover, and zero screenshots but never more than 12.

```ts
expect(liveWorkSchema.parse(validLive).screenshots).toHaveLength(2)
expect(() => liveWorkSchema.parse({ ...validLive, screenshots: [] })).toThrow()
expect(() => liveWorkSchema.parse({ ...validLive, replayUrl: '/media/replay.mp4' })).not.toThrow()
```

Do not add `replayUrl` to the schema; Zod strips it. Also assert unsafe screenshot URLs fail.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/domain/schemas.test.ts`

Expected: FAIL because the live schemas are not exported.

- [ ] **Step 3: Implement exact types and schemas**

```ts
export interface LiveWork {
  id: string; slug: string; title: string; summary: string; description: string
  roles: string[]; heldAt: string; coverUrl: string; screenshots: PhotoAsset[]
  featured: boolean; sortOrder: number; status: PublishStatus; updatedAt: string
}
```

Use `identityFields`, `photoAssetSchema`, `draftMediaUrlSchema`, and a private draft schema. Add `.max(12)` to both screenshot arrays; public uses `.min(1)`. Add a public-schema `superRefine` that requires `screenshots.some((shot) => shot.url === coverUrl)`. Add two fixture cases with multiple screenshot orientations and `data-origin: fixture` IDs.

- [ ] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run src/domain/schemas.test.ts && pnpm typecheck`

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/domain/content.ts portfolio/src/domain/schemas.ts portfolio/src/domain/schemas.test.ts portfolio/src/fixtures/content.ts
git commit -m "feat: define live portfolio content"
```

### Task 2: Memory and CloudBase repository support

**Files:**
- Modify: `portfolio/src/domain/repository.ts`
- Modify: `portfolio/src/infrastructure/memory/contentRepository.ts`
- Modify: `portfolio/src/infrastructure/memory/contentRepository.test.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/contentRepository.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/contentRepository.test.ts`
- Modify: `portfolio/src/infrastructure/repositoryFactory.ts`
- Modify: `portfolio/src/test/e2eHarness.ts`

**Interfaces:**
- Produces on `ContentRepository`: `listPublishedLiveWorks(): Promise<LiveWork[]>`, `getPublishedLiveWork(slug: string): Promise<LiveWork | null>`
- Produces on `AdminContentRepository`: `listAllLiveWorks`, `saveLiveWork`, `deleteLiveWork`

- [ ] **Step 1: Write repository contract RED tests**

For both implementations, assert public list uses only published cases sorted ascending, public slug hides draft/hidden, admin list includes all statuses, save parses with `adminLiveWorkSchema`, and delete uses the exact document ID.

For CloudBase, assert the query chain receives:

```ts
where({ status: 'published' }).orderBy('sortOrder', 'asc')
```

and the collection name is `live_works`.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/infrastructure/memory/contentRepository.test.ts src/infrastructure/cloudbase/contentRepository.test.ts`

Expected: compile/test failure because the methods do not exist.

- [ ] **Step 3: Implement both repositories**

Extend the constructor without breaking current call sites as `constructor(videos: VideoWork[], photoSeries: PhotoSeries[], profile: SiteProfile, liveWorks: LiveWork[] = [])`. Parse public output with `liveWorkSchema` and admin output with `adminLiveWorkSchema`. Clone arrays on memory reads/writes. CloudBase document writes use the supplied `id`; safe errors remain existing generic repository errors.

- [ ] **Step 4: Update providers and harness fixtures**

Pass `fixtureLiveWorks` through memory repository creation and the E2E harness. Keep production CloudBase initialization unchanged and lazy.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run src/infrastructure src/test/e2eHarness.test.ts && pnpm typecheck`

```bash
git add portfolio/src/domain/repository.ts portfolio/src/infrastructure portfolio/src/test/e2eHarness.ts
git commit -m "feat: store live portfolio cases"
```

### Task 3: CloudBase rules and screenshot storage

**Files:**
- Create: `portfolio/cloudbase/rules/live_works.json`
- Modify: `portfolio/cloudbase/rules/storage.json`
- Modify: `portfolio/src/infrastructure/cloudbase/securityArtifacts.test.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/mediaStorage.ts`
- Modify: `portfolio/src/infrastructure/cloudbase/mediaStorage.test.ts`

**Interfaces:**
- Produces: `MediaFolder` includes `'live'`
- Produces: public-read/admin-write rule for `live_works`

- [ ] **Step 1: Write failing security and storage tests**

Assert `live_works.json` has public read constrained to `resource.status == 'published'`, write constrained to the seeded admin role, and no anonymous write. Assert image MIME types upload to `live/<uuid>.<ext>` with `{ upsert: false }`; video MIME is rejected before SDK invocation.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/infrastructure/cloudbase/securityArtifacts.test.ts src/infrastructure/cloudbase/mediaStorage.test.ts`

Expected: FAIL because the rule and folder are absent.

- [ ] **Step 3: Implement minimal rule and folder policy**

Add `'live'` only to the image folder map, with JPEG/PNG/WebP and 20 MB maximum inherited from existing image policy. Add the collection rule by matching the existing video/photo rule structure exactly except the collection target.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm exec vitest run src/infrastructure/cloudbase`

```bash
git add portfolio/cloudbase/rules portfolio/src/infrastructure/cloudbase
git commit -m "feat: secure live screenshots"
```

### Task 4: Public live list and detail pages

**Files:**
- Create: `portfolio/src/features/live/LiveIndexPage.tsx`
- Create: `portfolio/src/features/live/LiveDetailPage.tsx`
- Create: `portfolio/src/features/live/LivePages.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Consumes: public live repository methods
- Produces: `/live` and `/live/:slug`
- Reuses: `ResponsiveImage`, `PhotoViewer`, safe loading/error/not-found patterns

- [ ] **Step 1: Write public-page RED tests**

Assert list order, links, summary text, and absence of `<video>`. Assert detail renders description, roles, screenshot alt order, opens the selected screenshot in `PhotoViewer`, and restores focus on close. Add loading, empty, rejected repository, and unpublished slug cases.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/live/LivePages.test.tsx src/app/router.test.tsx`

Expected: FAIL because pages and routes are missing.

- [ ] **Step 3: Implement list and detail states**

Use the same active-flag stale-response protection as photography. The detail screenshot figure button uses intrinsic aspect ratio:

```tsx
style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
```

Render no media field other than screenshot images. Reuse `PhotoViewer` with `screenshots`.

- [ ] **Step 4: Add responsive editorial CSS**

Use a readable single column on mobile and 12-column alternating spans on desktop. Preserve DOM order and prevent horizontal overflow. Apply existing charcoal/paper/cobalt tokens only.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm exec vitest run src/features/live src/app/router.test.tsx && pnpm typecheck`

```bash
git add portfolio/src/features/live portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx portfolio/src/styles/global.css
git commit -m "feat: add public live portfolio"
```

### Task 5: Live admin list and editor

**Files:**
- Create: `portfolio/src/features/admin/AdminLiveListPage.tsx`
- Create: `portfolio/src/features/admin/AdminLiveEditor.tsx`
- Create: `portfolio/src/features/admin/AdminLiveEditor.test.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`
- Modify: `portfolio/src/styles/global.css`

**Interfaces:**
- Consumes: live admin repository methods and `AdminMediaStoragePort`
- Produces: `/admin/live`, `/admin/live/:id`, screenshot reorder/remove/cover selection, draft/publish/hidden

- [ ] **Step 1: Write admin RED tests**

Test new draft creation, image dimension reading, 12-image limit, alt validation, cover membership validation, up/down order, delayed destructive removal confirmation, save without optimistic success, and safe upload/repository failure copy.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/admin/AdminLiveEditor.test.tsx src/features/admin/AdminListPage.test.tsx src/app/router.test.tsx`

Expected: FAIL because live admin UI and routes are absent.

- [ ] **Step 3: Implement list and editor**

Follow `AdminPhotoEditor` interaction contracts but cap screenshots at 12 and upload to `live`. The new draft is schema-valid:

```ts
{ id, slug, title: '', summary: '', description: '', roles: [], heldAt: '', coverUrl: '',
  screenshots: [], featured: false, sortOrder: 0, status: 'draft', updatedAt }
```

Add live cases to the admin overview and its delete union using `kind: 'live'`.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm exec vitest run src/features/admin src/app/router.test.tsx && pnpm typecheck`

```bash
git add portfolio/src/features/admin portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx portfolio/src/styles/global.css
git commit -m "feat: manage live portfolio cases"
```

### Task 6: Full verification

**Files:**
- Modify: `portfolio/design-qa.md`

**Interfaces:**
- Produces: verified live public/admin flows without replay media

- [ ] **Step 1: Run all gates**

Run: `pnpm check && pnpm lint && git diff --check`

- [ ] **Step 2: Browser-check public list and detail**

At 390 × 844 and 1440 × 1000, verify screenshot rhythm, copy hierarchy, viewer open/Escape/focus restoration, no `<video>`, and no horizontal overflow.

- [ ] **Step 3: Browser-check E2E admin harness**

Create a draft, upload mocked screenshots, reorder, set cover, publish, and verify the public list updates in the same repository instance. Do not use live CloudBase.

- [ ] **Step 4: Record evidence and commit**

```bash
git add portfolio/design-qa.md
git commit -m "test: verify live portfolio workflows"
```
