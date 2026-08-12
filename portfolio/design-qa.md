# Design QA — Responsive Homepage

- Source visual truth: `/Users/luxin/.codex/generated_images/019feb5d-c2bf-7ec0-a00a-dee0084e4d9f/exec-df39a89a-e5bb-4b7c-ab1d-00e07e734f20.png`
- Initial implementation screenshot: `design-qa-mobile-viewport.png`
- Initial combined comparison: `design-qa-mobile-comparison.jpg`
- Final implementation screenshot: `design-qa-mobile-postfix.png`
- Final combined comparison: `design-qa-mobile-comparison-postfix.jpg`
- Final desktop evidence: `design-qa-desktop-postfix.png`
- Menu-open evidence: `design-qa-mobile-menu.png`
- Viewport/state: 390 × 844 CSS px, device scale factor 1, homepage at top; desktop checked at 1440 × 1000.
- Source pixels: 853 × 1844. For the combined composition check the source was downsampled to 390 × 843; implementation pixels are 390 × 844.

## Findings

- [Resolved P1] Selected work previously began too late on mobile.
  - Location: `HomePage` warm-paper surface, immediately after the hero.
  - Evidence: the selected reference begins its light surface directly with “短视频作品”; the implementation inserts a large `00 / PROFILE` section first. This pushes the first work card below the initial mobile viewport and conflicts with the portfolio-only hierarchy.
  - Fix: remove the homepage profile-preview section. Keep personal positioning in `/about`; let the light surface begin with selected video work.
- [Resolved P2] Hero display type was substantially wider than the source.
  - Location: `CONTENT / CREATOR` in the mobile hero.
  - Evidence: the source uses a tall condensed display face that occupies a compact left column; the implementation falls back to a broad sans face and nearly spans the full mobile width.
  - Fix: use a locally bundled freely licensed condensed display font and recalibrate mobile size/line-height/letter spacing against the comparison.

## Required Fidelity Surfaces

- Fonts and typography: passed after locally bundling Bebas Neue for the English hero display; the Chinese UI hierarchy remains clear and unchanged.
- Spacing and layout rhythm: passed after removing the extra profile preview; the warm-paper surface now begins directly with selected video work.
- Colors and visual tokens: charcoal, warm paper, cobalt accent, line colors, and cover color treatment match the intended system.
- Image quality and asset fidelity: all visible slots use real generated raster assets with appropriate crops; no CSS/vector placeholders are present.
- Copy and content: development fixture copy is clearly identifiable and is correctly blocked from production by the later release gate; the homepage hierarchy now remains work-first.

## Interaction and Runtime Checks

- Mobile menu toggles `aria-expanded` from false to true and exposes the five required navigation links.
- Desktop navigation is visible at 1440 px.
- Homepage links and landmarks were present in the browser DOM.
- No homepage `<video>` element is rendered.
- Post-fix mobile menu toggles correctly and exposes the required mobile navigation.
- Post-fix desktop navigation and hero imagery were verified at 1440 × 1000.
- Browser console error log was empty after both the mobile interaction and desktop reload checks.

## Comparison History

### Iteration 1

- Earlier findings: P1 extra profile-preview section; P2 overly wide hero display type.
- Fixes made in code:
  - Removed the homepage `00 / PROFILE` preview so `01 / SELECTED VIDEO` is the first section inside the warm-paper works surface; the profile repository data remains in use for the shell and hero, while `/about` remains available in navigation.
  - Bundled `@fontsource/bebas-neue` 5.3.0 and applied its local 400-weight WOFF/WOFF2 files only to the English hero display. Recalibrated the mobile display to 400 weight, `clamp(3.75rem, 16vw, 5.5rem)`, `.01em` tracking, and `.8` line-height without altering Chinese body typography.
- Structural TDD: focused homepage test first failed because “个人定位” remained in the DOM, then passed 6/6 after the profile preview was removed.
- Automated verification: `pnpm typecheck`, `pnpm check` (6 files, 20 tests, production build), and `pnpm lint` passed.
- Post-fix visual evidence: `design-qa-mobile-postfix.png`, `design-qa-mobile-comparison-postfix.jpg`, and `design-qa-desktop-postfix.png`.
- Post-fix result: the light surface begins with “短视频作品,” the hero type has the intended tall condensed proportion, and no actionable P0/P1/P2 differences remain.

## Implementation Checklist

1. [Completed] Remove the homepage profile-preview section and update focused tests.
2. [Completed] Bundle and apply a condensed display font, then recapture the 390 × 844 hero.
3. [Completed] Recheck mobile menu, desktop hero, and browser console.
4. [Completed] Produce a new combined comparison and record the final verdict.

## Follow-up Polish

- [P3] Replace the textual mobile menu trigger with a matching icon-library menu/close glyph during a later visual-polish pass if it remains visually distracting.
- [P3] Add responsive `srcSet` media variants during production optimization.

## Homepage Cover-Ratio Correction

> Superseded by the 2026-08-11 per-work cover rule. The historical viewport-wide behavior below is retained as QA evidence; current cover layout follows each work's orientation metadata instead of switching every cover with the viewport.

- [Resolved P1] The homepage cover declarations set `aspect-ratio`, but the images' HTML `height` attributes still controlled layout height. At 390 × 844, browser measurements showed video covers at roughly 150 × 1672 and photography covers at roughly 164 × 1402.
- Fix: both homepage cover types now explicitly release the intrinsic layout height, use `object-fit: cover`, and share one responsive contract: portrait viewports are `3:4`; landscape viewports are `4:3`.
- Browser verification: at 390 × 844, all four video covers and all five photography covers measured exactly `0.75`; at 844 × 390 they measured `1.3333`. No image stretching was observed.
- Regression verification: focused homepage tests passed 8/8; full `pnpm check` passed 25 files / 155 tests plus 5 release-gate tests and the production build; lint and diff-check passed.

## Task 5 — Short-Video Routes

- Mobile catalog evidence: `task5-videos-mobile.png` at 390 × 844.
- Mobile detail evidence: `task5-video-detail-mobile.png` at 390 × 844 before playback consent.
- Desktop catalog evidence: `task5-videos-desktop.png` at 1440 × 1000.
- Category filtering visibly preserved all four controls, updated the URL to `?category=brand`, set the selected button's `aria-pressed` state, and rendered the expected work.
- Detail playback created no `<video>` before the explicit play click. The deliberately absent fixture MP4 exercised the recovery UI after click: the poster returned, the required error copy appeared, and retry remained available.
- Mobile and desktop layouts stayed consistent with the approved charcoal/paper/cobalt editorial system; no actionable P0/P1/P2 visual or interaction issues were found.
- Browser logs contained only Vite development HMR WebSocket transport noise from the sandboxed preview; no application runtime error was observed.

## Task 6 — Photography Series

- Mobile index evidence: `task6-photography-mobile.png` at 390 × 844.
- Mobile detail evidence: `task6-photo-detail-mobile.png` at 390 × 844.
- Mobile viewer evidence: `task6-photo-viewer-mobile.png` at 390 × 844.
- Desktop index evidence: `task6-photography-desktop.png` at 1440 × 1000.
- The five series retained the approved charcoal/paper/cobalt editorial system. Mobile uses a direct vertical sequence; desktop uses an asymmetric large-image grid with readable metadata and no hover-only controls.
- The native full-screen dialog opened with the close control focused, locked both document scroll roots, closed with Escape, restored the exact thumbnail focus, and returned both overflow values to their original state.
- Browser QA found one route-level issue: opening a detail from a scrolled catalog retained `scrollY = 187`. A router-level correction now resets ordinary PUSH/REPLACE navigation to `0` while leaving POP restoration to the browser. The corrected browser pass measured a scrolled catalog state before navigation and `scrollY = 0` after the detail route opened.
- Browser logs contained only Vite development HMR WebSocket transport noise from the sandboxed preview; no application runtime error was observed.

## Task 7 — About, Contact, and Public Error States

- Mobile evidence at 390 × 844: `task7-about-mobile.png`, `task7-contact-mobile.png`, and `task7-not-found-mobile.png`.
- Desktop evidence at 1440 × 1000: `task7-about-desktop.png` and `task7-contact-desktop.png`.
- About preserves the established charcoal/paper/cobalt editorial hierarchy with immediate one-column readability on mobile and an asymmetric portrait/copy composition on desktop. Contact keeps email, WeChat, and social actions visible without hover-only behavior.
- Browser QA found the initial WeChat fixture path produced a broken image. The correction added a real 800 × 800 development QR PNG, a static-asset integrity test, and visible copy stating that it is not a real WeChat account. Browser recheck measured `complete: true`, `naturalWidth: 800`, and `naturalHeight: 800`.
- Résumé `href` and native `download`, email `mailto:`, and social `target="_blank" rel="noreferrer"` were verified in the rendered page. The unknown-route state exposed only the safe 404 copy and `返回首页`; the test URL's query text was absent.
- Browser logs contained only Vite development HMR WebSocket transport noise from the sandboxed preview; no application runtime error was observed.

final result: passed

## 2026-08-11 Video/Photo Editorial Layout — Task 5 QA

### Fresh automated gates

- Command: `PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm check && PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint && git diff --check`
- `pnpm check` passed: TypeScript typecheck; Vitest 27 files / 166 tests; Node release gate 5 tests; production build completed.
- `pnpm lint` passed (`oxlint`). `git diff --check` completed with no output.
- Production build output included Vite's existing chunk-size warning for chunks over 500 kB after minification.

### In-app browser evidence and pending checks

- At 390 × 844, `/videos?category=people` and `/videos?category=event` each had covers measuring 358 × 477.328 (ratio `0.75`). `/videos?category=brand` and `/videos?category=social` each had covers measuring 358 × 268.5 (ratio `1.3333`).
- On all four mobile routes, `document.scrollWidth = 390 = innerWidth`. Brand and social initially displayed fallback UI because a landscape fixture URL was missing; after the Task 2 fix round 1, both loaded successfully and were remeasured at `1.3333`.
- The rendered heights, 477.328 for the `3:4` image attributes and 268.5 for the `4:3` image attributes, were not equal to the HTML image attribute heights. The HTML source height therefore did not act as the rendered pixel height in these observed category pages.
- At 390 × 844, `/photography` showed all five series covers at 358 × 477.328 (ratio `0.75`) with no horizontal overflow.
- At 390 × 844, `/photography/light-and-space` contained only the current development fixture's one image: `data-layout=landscape`, `data-align=start`, image ratio `1.4996`, and no horizontal overflow.
- At 1440 × 1000, `/` had the homepage video DOM order: 归途对话 (portrait, ratio `.75`), 工作室清晨 (landscape, `1.3333`), 夜市现场 (portrait, `.75`), 一分钟手作 (landscape, `1.3333`). The cards used x/y offsets, and `document.scrollWidth = 1440 = innerWidth`.
- At 1440 × 1000, `/photography/light-and-space` had one photography-detail figure measuring 1128 × 783.031 with no overflow.
- At 1440 × 1000, `/photography/light-and-space` contained only that one image. Layout mechanism and the three-image order are verified by automated tests; real mixed visual rhythm remains deferred until the user uploads grouped real photos. Browser QA therefore does not claim observed landscape/portrait/detail mixing.
- Task 5 fix round 2 static review found the desktop rules clean: portrait cards span 5 columns, landscape cards span 7 columns, and DOM order remains unchanged. The controller's browser session had already finalized, so post-fix-round-2 browser remeasurement is pending.
- Browser interaction checks were not executed in this round and remain pending. Component and router coverage cited for this work is automated-test evidence only.

## 2026-08-12 Live Portfolio — Task 6 QA

### Fresh automated gates

- Command: `PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm check && PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint && git diff --check`
- Passed: TypeScript, 30 Vitest files / 236 tests, 5 Node release-gate tests, production build, oxlint, and diff-check.
- The production build retained Vite's existing warning for the lazily loaded CloudBase chunk over 500 kB; the build completed successfully.

### In-app browser evidence

- Desktop `/live` at 1440 × 1000: the two catalog covers measured 780 × 520.2 and 432 × 288.1, ratios `1.4995` and `1.4996`; both used the matching screenshot metadata `aspect-ratio: 1600 / 1067`. No horizontal overflow and no `<video>` element were present.
- Mobile `/live` at 390 × 844: both catalog covers measured 358 × 238.7, ratio `1.4996`, with the same matching `1600 / 1067` metadata. No horizontal overflow and no `<video>` element were present.
- Mobile `/live/community-forum-live`: the screenshot sequence preserved one 358 × 269.531 landscape image followed by one 358 × 667.234 portrait image. Opening the second screenshot focused Close, reported `2 / 2`, closed with Escape, and restored focus to the exact opener. No horizontal overflow and no `<video>` element were present.
- The live catalog's earlier height defect is closed: browser rendering now follows the selected cover screenshot metadata rather than the source file's unrelated natural dimensions.

### Explicit limitation

- The authenticated admin browser workflow was not claimed in the ordinary preview. The test-only E2E server remains unavailable in this sandbox because binding `127.0.0.1:4174` returns `listen EPERM`; it is not represented as a completed browser interaction.

### Final-fix route-level closed loop

- A single Vitest integration test now creates a draft through `/admin/live/new`, uploads two locally mocked screenshots with deterministic local dimensions, reorders them, selects the reordered screenshot as the cover, publishes, unmounts the admin route, and remounts `/live` using the same `MemoryContentRepository`. The public card titled `同仓库直播闭环` is the final observable assertion.
- This is one connected local-memory workflow rather than a collection of segmented assertions. It does not start a server or perform a CloudBase/network upload.

## 2026-08-12 AIGC Portfolio — Task 5 QA

### Fresh automated gates

- Command: `PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm check && PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint && git diff --check`
- Passed: TypeScript typecheck; Vitest 33 files / 284 tests; Node release gate 5 tests; production build; `oxlint`; and whitespace diff check.
- The production build completed with Vite's existing warning that one minified chunk exceeds 500 kB.

### Automated AIGC evidence

- Component, router, schema, repository, storage-policy, and local-harness tests cover published-only public reads, draft-capable admin writes, image/video upload-folder selection, video-cover validation, consent-first video DOM creation, safe rejected states, and the absence of prompt/model/workflow/process copy.
- The E2E harness is local-only: its storage returns deterministic fixture URLs and its repository is `MemoryContentRepository`; no CloudBase, network upload, or deployment was invoked.
- At the initial Task 5 gate, the Playwright specs contained public/mobile and admin workflows for the existing video/photo surfaces but no AIGC image-and-video draft-to-publish route scenario; the connected local React E2E-harness assertion covered Live only. The AIGC route-level closure added afterward is recorded below.

### Historical pre-fix browser blocker (resolved below)

- Before the acceptance-blocker correction, the controller's ordinary memory preview at `/aigc` was empty because `createContentRepository` did not pass `fixtureAigcWorks` to `MemoryContentRepository`, and the original AIGC fixture media paths were absent from `public/media`. The correction and completed public browser matrix are recorded below.
- Authenticated AIGC admin browser verification remains unclaimed. The test-only Playwright server is configured for `127.0.0.1:4174`; prior sandbox attempts to bind that port returned `listen EPERM`, and this QA pass did not start a server or run Playwright.
- Historical follow-up, now completed below: wire safe AIGC development fixtures/assets into the ordinary preview, add one local-memory AIGC route-level image/video publish flow, and re-run public browser checks without live services.

### 2026-08-12 AIGC acceptance-blocker correction

- [Resolved P1] The ordinary Memory preview now receives `fixtureAigcWorks` as the fifth `MemoryContentRepository` argument, so `/aigc` has its two published development cards instead of the empty state.
- [Resolved P1] The fixture image final and video poster now use existing public JPG raster assets: `/media/fixture-photo-space.jpg` and `/media/fixture-photo-motion.jpg`. A static asset integrity test protects both catalog paths. The deliberately absent video MP4 remains behind the consent-first player, preserving the existing safe fallback after an explicit play click; its pre-click poster is no longer broken.
- [Resolved P1] A connected local-memory route test goes through `/admin/aigc/new` twice, saves image/video drafts after mocked local uploads, publishes them, remounts `/aigc`, and observes both resulting public cards. It makes no direct repository save and does not call CloudBase or a network service.
- Fresh focused Vitest evidence: factory, AIGC public/admin, router, and local harness suites passed 5 files / 45 tests. A temporary public-route mutation produced the expected red failure for the new closed-loop test before restoration.
- Browser limitation remains explicit: the sandboxed test-only admin server has previously failed to bind with `listen EPERM`; this correction closes the ordinary-preview data/asset blockers but does not claim a fresh authenticated browser run or new screenshots.
- Final fresh gates passed: `pnpm check` (33 Vitest files / 287 tests, 5 release-gate tests, and production build), `pnpm lint`, and `git diff --check`. Vite's existing chunk-size warning remained non-failing.

### Post-fix in-app browser evidence

- Mobile `/aigc` at 390 × 844 rendered both development cards. Each cover measured 358 × 268.5 (ratio `1.3333`), loaded successfully from the real local JPG assets, created no `<video>`, and produced no horizontal overflow. No prompt, model, workflow, or generation-process copy appeared.
- Desktop `/aigc` at 1440 × 1000 preserved the asymmetric two-card layout: covers measured 664 × 498 and 548 × 411, both exact `4:3` (`1.3333`), with no horizontal overflow and no `<video>`.
- Desktop image detail `/aigc/aigc-light-study` displayed the final image at its natural 1122 × 1402 source proportion (rendered ratio `0.8003`) without forced catalog cropping or horizontal overflow.
- Desktop video detail `/aigc/aigc-motion-study` loaded a valid poster and contained zero `<video>` elements before the explicit play action. Clicking Play exercised the deliberately absent development MP4: the player returned to the poster, displayed the generic recovery message and retry action, and did not expose a backend path.
- Authenticated admin browser verification remains unclaimed because the test-only server cannot bind in this sandbox; the connected local-memory route test is the evidence for the admin-to-public workflow.

## 2026-08-12 Content Expansion — Final Integration Automated Audit

### Fresh automated gates

- Command: `PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm check && PATH=/Users/luxin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint && git diff --check`
- Passed: TypeScript typecheck; Vitest 33 files / 303 tests; Node release-gate suite 9/9; normal production build; `oxlint`; and whitespace diff check.
- The normal production build retained Vite's non-failing chunk-size warning: `client-CbkBFc9u.js` is 738.58 kB minified (181.96 kB gzip).

### Production-isolation and release evidence

- A separate normal `pnpm build` passed. The requested artifact scan found no `data-e2e-harness`, `local-e2e-admin`, or `e2e-only://` marker, confirming that the E2E-only harness identifiers are absent from the ordinary build.
- The same scan found `data-origin: fixture` 23 times in `dist/assets/index-ByhY3cOs.js`. This is an expected release blocker: the ordinary build still uses development fixture content.
- `pnpm release:check` exited 1 before producing a release build. Its exact configuration gate reported that `VITE_CLOUDBASE_REGION`, `VITE_CLOUDBASE_ENV_ID`, and `VITE_CLOUDBASE_PUBLISHABLE_KEY` are missing; it also requires `VITE_CONTENT_BACKEND=cloudbase`.
- The release scanner was run separately against the freshly built normal `dist` and exited 1 at the first fixture asset: `dist/media/fixture-photo-event.jpg`. Real CloudBase configuration alone is therefore insufficient; all fixture media and fixture copy must be replaced before hosting handoff.

### Browser matrix handoff

- Controller evidence is recorded in the completed matrix below. This automated-audit worker did not itself start a server, run Playwright, capture CLI screenshots, access CloudBase, perform network operations, or deploy.

### Current integration status

- Automated non-environment gates: passed.
- Release readiness: blocked by intentional, actionable CloudBase configuration and fixture-content gates.
- Final visual result: passed with no observed public P0–P2 issue. Hosting remains intentionally blocked by the configuration and fixture gates above.

### Completed controller in-app-browser matrix

- Desktop 1440 × 1000: header navigation was exactly `首页 / 短视频 / 摄影 / 直播 / AIGC / 关于 / 联系`; footer used the same order. The homepage had no horizontal overflow.
- Mobile 390 × 844: the menu exposed the same seven links in order. Activating the mobile AIGC link navigated to `/aigc` and changed `aria-expanded` from `true` to `false`.
- Mobile short-video categories: people and event covers measured 358 × 477.3 (`3:4`); brand and social measured 358 × 268.5 (`4:3`). All four routes had no horizontal overflow.
- Mobile photography: all five list covers were `3:4`; `/photography/light-and-space` rendered its current development image at ratio `1.4996` with no overflow. The viewer focused Close, locked both scroll roots, closed on Escape, restored the exact `VIEW / 01` opener, and restored scroll. The current fixture contains one image, so a real mixed landscape/portrait/detail visual rhythm remains content-dependent; its ordered layout behavior is covered by automated tests.
- Mobile live: the list covers rendered at ratio `1.4996`; `/live/community-forum-live` rendered ratios `1.4996` and `0.5625`. Opening the second screenshot focused Close, showed `2 / 2`, locked both scroll roots, closed on Escape, restored `VIEW / 02`, and restored scroll. No `<video>` existed.
- Mobile AIGC: both catalog covers were exact `4:3`; no pre-consent `<video>` or process copy was present. The desktop image detail kept its natural `0.8003` ratio. The video detail used a valid poster, created no `<video>` before Play, and returned a generic retry state for the deliberately absent development MP4 after Play.
- Desktop core routes `/videos?category=brand`, `/photography`, `/live`, `/aigc`, `/about`, and `/contact` all rendered their expected headings without horizontal overflow; first media ratios were respectively `1.3333`, `0.75`, `1.4995`, `1.3333`, `0.8`, and `1`.
- Browser console warning/error log was empty after the matrix.
- Authenticated admin browser execution remains unclaimed because the E2E-only server cannot bind `127.0.0.1:4174` in this sandbox. Same-repository route-level tests cover video/live/AIGC editor journeys; 16 Playwright cases are discovered but were not executed.

final result: passed
