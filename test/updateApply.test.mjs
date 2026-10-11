import { test } from "node:test";
import assert from "node:assert/strict";

const { applyUpdateSafely } = await import("../lib/updateApply.ts");
const { Sentiment, AppState } = await import("../types.ts");

function fakeCtx(overrides) {
  const calls = { saveSnapshot: [], reload: 0 };
  const ctx = {
    isGenerating: false,
    notes: "",
    result: "",
    sentiment: Sentiment.FOR,
    saveSnapshot: (s) => { calls.saveSnapshot.push(s); return true; },
    reload: async () => { calls.reload++; },
    ...overrides,
  };
  return { ctx, calls };
}

// ---------------------------------------------------------------------------
// 8. User selects Update Now with no unsaved work.
test("8. no notes and no result - reloads directly, no snapshot taken", async () => {
  const { ctx, calls } = fakeCtx({});
  const outcome = await applyUpdateSafely(ctx);
  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.saveSnapshot.length, 0, "nothing to protect, so no snapshot should be attempted");
  assert.equal(calls.reload, 1);
});

// ---------------------------------------------------------------------------
// 9. User has research notes in progress.
test("9. notes in progress - snapshots as IDLE before reloading", async () => {
  const { ctx, calls } = fakeCtx({ notes: "half-written research notes" });
  const outcome = await applyUpdateSafely(ctx);
  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.saveSnapshot.length, 1);
  assert.equal(calls.saveSnapshot[0].notes, "half-written research notes");
  assert.equal(calls.saveSnapshot[0].appState, AppState.IDLE);
  assert.equal(calls.reload, 1);
});

// ---------------------------------------------------------------------------
// 10. User has a completed article.
test("10. a completed article - snapshots as COMPLETE before reloading", async () => {
  const { ctx, calls } = fakeCtx({ notes: "original notes", result: "the finished article" });
  const outcome = await applyUpdateSafely(ctx);
  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.saveSnapshot.length, 1);
  assert.equal(calls.saveSnapshot[0].result, "the finished article");
  assert.equal(calls.saveSnapshot[0].appState, AppState.COMPLETE);
  assert.equal(calls.reload, 1);
});

// ---------------------------------------------------------------------------
// 11. Generation is currently active.
test("11. generation active - blocked immediately, nothing saved or reloaded", async () => {
  const { ctx, calls } = fakeCtx({ isGenerating: true, notes: "in-flight notes" });
  const outcome = await applyUpdateSafely(ctx);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /generation is currently running/i);
  assert.equal(calls.saveSnapshot.length, 0, "must never attempt a snapshot mid-generation");
  assert.equal(calls.reload, 0, "must never reload while generating");
});

// ---------------------------------------------------------------------------
// 12. Temporary session preservation fails.
test("12. snapshot save failure blocks the update instead of reloading anyway", async () => {
  const { ctx, calls } = fakeCtx({
    notes: "important notes that must not be lost",
    saveSnapshot: () => false,
  });
  const outcome = await applyUpdateSafely(ctx);
  assert.equal(outcome.ok, false);
  assert.match(outcome.reason, /could not be safely saved/i);
  assert.equal(calls.reload, 0, "must never reload if the snapshot save failed - that would discard the content");
});

// Whitespace-only notes/result must not be treated as "content to protect" -
// trimming matches what the Generate button itself uses to decide
// readiness, so an empty-looking textarea doesn't block a safe update.
test("whitespace-only notes are treated as no content", async () => {
  const { ctx, calls } = fakeCtx({ notes: "   \n  ", result: "" });
  const outcome = await applyUpdateSafely(ctx);
  assert.deepEqual(outcome, { ok: true });
  assert.equal(calls.saveSnapshot.length, 0);
});

// The reload rejecting must propagate rather than being silently swallowed -
// applyUpdateSafely has no catch around ctx.reload().
test("a reload failure propagates instead of being reported as a safe success", async () => {
  const { ctx } = fakeCtx({ reload: async () => { throw new Error("reload failed"); } });
  await assert.rejects(() => applyUpdateSafely(ctx), /reload failed/);
});
