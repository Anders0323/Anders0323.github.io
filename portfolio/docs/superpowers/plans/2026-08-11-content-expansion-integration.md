# Content Expansion Integration and Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate video, photography, live, and AIGC work into one coherent navigation, admin shell, E2E workflow, release gate, and operating guide.

**Architecture:** Keep feature routes independently repository-backed, then connect them only at shared shell boundaries: navigation, provider factory, admin overview, E2E harness, CloudBase artifacts, and release documentation. The production build must remain free of E2E-only markers and fixture content.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Playwright specs, Node release gate, Vite, CloudBase configuration artifacts.

## Global Constraints

- Public navigation order is exactly `首页 / 短视频 / 摄影 / 直播 / AIGC / 关于 / 联系`.
- Homepage body remains unchanged apart from shared navigation/footer links.
- Production must not contain fixture copy, `data-origin: fixture`, fixture-named binary assets, or E2E harness markers.
- Do not add a development admin bypass to normal dev or production modes.
- Do not run live CloudBase, use real credentials, migrate real content, or deploy in this plan.
- All public and admin routes keep safe loading, empty, error, and not-found behavior.
- Write a failing test and observe the expected failure before every production change.

---

### Task 1: Shared public navigation and route coverage

**Files:**
- Modify: `portfolio/src/components/layout/SiteHeader.tsx`
- Modify: `portfolio/src/components/layout/SiteHeader.test.tsx`
- Modify: `portfolio/src/components/layout/SiteFooter.tsx`
- Modify: `portfolio/src/app/router.test.tsx`

**Interfaces:**
- Consumes: completed `/live`, `/aigc`, `/live/:slug`, `/aigc/:slug` routes
- Produces: exact seven-item navigation in desktop, mobile, and footer surfaces

- [ ] **Step 1: Write failing navigation tests**

Assert desktop/mobile navigation link text and href order exactly equals:

```ts
[
  ['首页', '/'], ['短视频', '/videos'], ['摄影', '/photography'],
  ['直播', '/live'], ['AIGC', '/aigc'], ['关于', '/about'], ['联系', '/contact'],
]
```

Open the mobile menu, activate live/AIGC links, and assert menu close behavior remains intact. Add router integration assertions for all four new public routes.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/components/layout/SiteHeader.test.tsx src/app/router.test.tsx`

Expected: live/AIGC links are absent.

- [ ] **Step 3: Implement exact navigation order**

Add the two entries between photography and about in `navigationItems`, and mirror them in `SiteFooter`. Do not add homepage sections.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm exec vitest run src/components/layout src/app/router.test.tsx`

```bash
git add portfolio/src/components/layout portfolio/src/app/router.test.tsx
git commit -m "feat: expose live and AIGC navigation"
```

### Task 2: Admin navigation and overview integration

**Files:**
- Modify: `portfolio/src/features/admin/AdminLayout.tsx`
- Modify: `portfolio/src/features/admin/AdminAccess.test.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.tsx`
- Modify: `portfolio/src/features/admin/AdminListPage.test.tsx`
- Modify: `portfolio/src/app/router.tsx`
- Modify: `portfolio/src/app/router.test.tsx`

**Interfaces:**
- Consumes: live/AIGC admin list and editor routes
- Produces: discoverable `全部作品 / 直播 / AIGC / 个人资料` admin navigation and complete overview states

- [ ] **Step 1: Write integration RED tests**

Assert authenticated admin navigation hrefs, overview counts for video/photo/live/AIGC, new-item actions, edit links, and deletion dispatch to the correct repository method for all four kinds. Retain Escape/focus/delayed-confirm tests.

- [ ] **Step 2: Verify RED**

Run: `pnpm exec vitest run src/features/admin/AdminAccess.test.tsx src/features/admin/AdminListPage.test.tsx src/app/router.test.tsx`

Expected: missing links/counts/actions.

- [ ] **Step 3: Implement shared integration**

Load four lists in one `Promise.all` and fail safely if any list rejects. Extend:

```ts
type PendingDelete = { kind: 'video' | 'photo' | 'live' | 'aigc'; id: string; title: string }
```

Use exhaustive `switch (pendingDelete.kind)` for delete dispatch; include a `never` check so future kinds cannot silently choose the wrong repository method.

- [ ] **Step 4: Verify GREEN and commit**

Run: `pnpm exec vitest run src/features/admin src/app/router.test.tsx && pnpm typecheck`

```bash
git add portfolio/src/features/admin portfolio/src/app/router.tsx portfolio/src/app/router.test.tsx
git commit -m "feat: integrate expanded admin content"
```

### Task 3: E2E harness and user journeys

**Files:**
- Modify: `portfolio/src/test/e2eHarness.ts`
- Modify: `portfolio/src/test/e2eHarness.test.ts`
- Modify: `portfolio/e2e/public-portfolio.spec.ts`
- Modify: `portfolio/e2e/admin-workflow.spec.ts`

**Interfaces:**
- Consumes: completed memory repository and admin routes
- Produces: deterministic local-only public/admin journeys for all content types

- [ ] **Step 1: Write failing harness isolation tests**

Assert E2E mode creates one shared repository containing video/photo/live/AIGC fixtures and injected admin services, while ordinary development and production entrypoints never import the harness. Keep `data-e2e-harness` as an E2E-only marker for the release scanner.

- [ ] **Step 2: Extend public Playwright specification**

Add journeys that open each top-level route, select one video category, open a mixed-cover detail, open/close a photography screenshot, open a live screenshot viewer, and verify AIGC video does not create `<video>` before play.

- [ ] **Step 3: Extend admin Playwright specification**

Using the harness only, create/update one live and one AIGC work, reorder live screenshots down then up, publish, navigate to public pages in the same SPA, and assert the new titles appear. Do not intercept or call CloudBase.

- [ ] **Step 4: Verify test discovery and available execution**

Run: `pnpm exec vitest run src/test/e2eHarness.test.ts && pnpm exec playwright test --list`

Expected: harness tests pass and all new Playwright cases are listed. If the environment permits 127.0.0.1 binding, run `pnpm test:e2e`; otherwise record the exact `listen EPERM` and do not claim execution.

- [ ] **Step 5: Commit**

```bash
git add portfolio/src/test portfolio/e2e
git commit -m "test: cover expanded portfolio journeys"
```

### Task 4: Release artifacts and operating guide

**Files:**
- Modify: `portfolio/scripts/assert-no-fixtures.mjs`
- Modify: `portfolio/scripts/release-gate.test.mjs`
- Modify: `portfolio/README.md`
- Modify: `portfolio/.env.example`
- Modify: `portfolio/cloudbase/rules/storage.json`

**Interfaces:**
- Produces: release scanner coverage for new fixture assets/copy and exact CloudBase migration checklist

- [ ] **Step 1: Write release-gate RED tests**

Build temporary clean/dirty output trees. Assert the scanner rejects new live/AIGC fixture markers and fixture-named binaries but accepts production-like media names. Assert missing CloudBase browser config still exits nonzero with safe Chinese guidance.

- [ ] **Step 2: Verify RED**

Run: `node --test scripts/release-gate.test.mjs`

Expected: new fixture cases are not yet rejected.

- [ ] **Step 3: Extend scanner without broad false positives**

Add exact new fixture markers and retain binary filename checking. Do not scan arbitrary user copy for generic words such as “直播” or “AIGC”.

- [ ] **Step 4: Update README operations**

Document:

- content preparation folders for videos, photography, live screenshots, and AIGC finals;
- per-video portrait/landscape selection;
- CloudBase collections `videos`, `photo_series`, `live_works`, `aigc_works`, `site_profile`;
- rule application and role seed order;
- local admin verification before hosting;
- fixture audit, preview build, deployment handoff, and quarterly backup;
- explicit statement that real content can be loaded into CloudBase before public hosting.

- [ ] **Step 5: Verify GREEN and commit**

Run: `node --test scripts/release-gate.test.mjs && pnpm build`

```bash
git add portfolio/scripts portfolio/README.md portfolio/.env.example portfolio/cloudbase/rules/storage.json
git commit -m "docs: prepare expanded portfolio release"
```

### Task 5: Final automated and visual release audit

**Files:**
- Modify: `portfolio/design-qa.md`
- Create: `portfolio/docs/superpowers/reports/2026-08-11-content-expansion-report.md`

**Interfaces:**
- Produces: evidence-backed release readiness status without deployment

- [ ] **Step 1: Run fresh complete gates**

Run: `pnpm check && pnpm lint && git diff --check`

Expected: all typechecks, Vitest suites, Node release gates, production build, lint, and whitespace checks pass. A size warning is recorded but is not a failure if CloudBase remains in a lazy admin chunk.

- [ ] **Step 2: Prove production isolation**

Run a normal production build, then:

```bash
rg -n "data-e2e-harness|local-e2e-admin|e2e-only://|data-origin: fixture" dist
```

Expected: no matches. Run the release scanner and expect nonzero until real CloudBase configuration and real content replace fixtures; record the exact blockers.

- [ ] **Step 3: Complete in-app browser matrix**

Inspect at 390 × 844 and 1440 × 1000:

- seven-item navigation and mobile menu;
- all four short-video categories with portrait/landscape cases;
- photography series list and one irregular detail sequence;
- live list/detail/viewer;
- AIGC image and consent-first video;
- admin list plus video/live/AIGC editors in E2E mode only.

Record bounding-box ratios, overflow, focus restoration, error states, and console results. Do not substitute CLI screenshots for the in-app browser when the latter is available.

- [ ] **Step 4: Write the report**

State each automated command and exit result, every tested viewport/route, unexecuted E2E matrix caused by environment limits, fixture release blockers, and remaining manual CloudBase/deployment steps. Use `final result: passed` only when every required non-environment gate is green and no P0–P2 visual issue remains.

- [ ] **Step 5: Commit**

```bash
git add portfolio/design-qa.md portfolio/docs/superpowers/reports/2026-08-11-content-expansion-report.md
git commit -m "test: complete expanded portfolio release audit"
```
