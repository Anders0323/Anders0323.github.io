# CloudBase Upload Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add credential-safe development diagnostics that identify whether a CloudBase media upload failed during object upload or public URL resolution.

**Architecture:** Extend `CloudBaseMediaStorage` with an optional diagnostic sink and development-mode flag. Normalize third-party failures into a tiny allow-listed diagnostic event while preserving the existing public `MEDIA_UPLOAD_ERROR` behavior.

**Tech Stack:** TypeScript, Vitest, CloudBase JS SDK 3.7.1, Vite.

## Global Constraints

- Diagnostics run only in local development mode.
- Never emit environment variables, credentials, auth tokens, headers, files, paths, request payloads, or raw third-party responses.
- The public UI error remains `文件上传失败，请稍后重试。`.
- No automatic retry, database write, content save, or publish action.
- Do not stage or commit because repository Git metadata is read-only.

---

### Task 1: Safe Upload Failure Diagnostics

**Files:**
- Modify: `src/infrastructure/cloudbase/mediaStorage.ts`
- Test: `src/infrastructure/cloudbase/mediaStorage.test.ts`

**Interfaces:**
- Consumes: existing `CloudBaseMediaStorage.upload(folder, file)` behavior and CloudBase `{ data, error }` envelopes.
- Produces: `MediaUploadDiagnostic` with `stage: 'upload' | 'public-url'`, allow-listed `code`, and fixed safe `message`; optional constructor diagnostic sink.

- [ ] **Step 1: Write failing tests**

Add tests that inject a diagnostic spy and demonstrate these observable behaviors:

```ts
expect(diagnostic).toHaveBeenCalledWith({
  stage: 'upload',
  code: 'STORAGE_PERMISSION_DENIED',
  message: 'CloudBase 媒体上传失败',
})
expect(JSON.stringify(diagnostic.mock.calls)).not.toContain('secret-token')
```

Cover upload error envelopes, rejected public URL resolution, production-mode silence, and success-path silence. Use complete SDK-shaped fixtures and assert the existing user-safe thrown message remains unchanged.

- [ ] **Step 2: Verify RED**

Run:

```bash
pnpm exec vitest run src/infrastructure/cloudbase/mediaStorage.test.ts
```

Expected: new diagnostic assertions fail because the adapter has no diagnostic sink.

- [ ] **Step 3: Implement minimal allow-listed diagnostics**

Add:

```ts
export type MediaUploadDiagnostic = {
  stage: 'upload' | 'public-url'
  code: string
  message: 'CloudBase 媒体上传失败' | 'CloudBase 公开地址解析失败'
}
```

The adapter accepts an optional `{ enabled, report }` diagnostic dependency. Extract only a short `code` from an error-like object; fall back to `UNKNOWN`. Never pass the source error, response, file, or path to `report`.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
pnpm exec vitest run src/infrastructure/cloudbase/mediaStorage.test.ts
pnpm typecheck
pnpm lint
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 5: Perform one authorized live diagnostic upload**

Use the separate clean admin tab and the previously authorized 5.9KB development QR fixture. Do not touch the user's partially completed form. Record only the allow-listed diagnostic event, then stop; do not retry automatically, save, publish, or delete.

- [ ] **Step 6: Report root cause and next action**

Map `stage` and `code` to a concrete next step. If an orphan test object appears, report it and request confirmation before deletion.

- [ ] **Step 7: Regress the classic-storage file ID bug**

Change the upload success fixture to the real compatibility shape: `path` and `fullPath` are relative while `id` is a complete `cloud://` file ID. Assert `getPublicUrl` receives `id`. Run the focused test and confirm it fails because production currently passes a relative path.

- [ ] **Step 8: Use the complete file ID and verify**

Change only the `getPublicUrl` argument to `uploaded.id`. Re-run the focused suite, typecheck, lint, diff-check, then one authorized live upload in the isolated diagnostic tab.
