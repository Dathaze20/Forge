import { test } from "node:test";
import assert from "node:assert/strict";

const { saveSnapshot, takeSnapshot } = await import("../lib/sessionSnapshot.ts");
const { Sentiment, AppState } = await import("../types.ts");

function installWorkingSessionStorage() {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return store;
}

test("saves and restores a snapshot exactly once, then deletes it", async () => {
  const store = installWorkingSessionStorage();

  const snapshot = {
    notes: "some research notes",
    result: "",
    sentiment: Sentiment.AGAINST,
    appState: AppState.IDLE,
  };

  assert.equal(saveSnapshot(snapshot), true);
  assert.equal(store.size, 1);

  const restored = takeSnapshot();
  assert.deepEqual(restored, snapshot);

  // One-time use: a second read must find nothing.
  assert.equal(takeSnapshot(), null);
  assert.equal(store.size, 0);
});

test("a completed article snapshots with AppState.COMPLETE", async () => {
  installWorkingSessionStorage();
  const snapshot = {
    notes: "notes that led to the article",
    result: "FULL ARTICLE TEXT HERE",
    sentiment: Sentiment.FOR,
    appState: AppState.COMPLETE,
  };
  assert.equal(saveSnapshot(snapshot), true);
  assert.deepEqual(takeSnapshot(), snapshot);
});

test("returns null and does not throw when sessionStorage is empty", async () => {
  installWorkingSessionStorage();
  assert.equal(takeSnapshot(), null);
});

test("save failure (quota exceeded) is reported as false, never silently swallowed", async () => {
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => { throw new DOMException("QuotaExceededError"); },
    removeItem: () => {},
  };
  const ok = saveSnapshot({ notes: "x".repeat(10_000_000), result: "", sentiment: Sentiment.FOR, appState: AppState.IDLE });
  assert.equal(ok, false);
});

test("a write that silently no-ops (private-mode style) is detected via read-back verification", async () => {
  // Simulates a storage backend that accepts setItem without error but
  // never actually persists it - saveSnapshot must not trust setItem alone.
  globalThis.sessionStorage = {
    getItem: () => null, // always empty, as if nothing was ever written
    setItem: () => {},
    removeItem: () => {},
  };
  const ok = saveSnapshot({ notes: "x", result: "", sentiment: Sentiment.FOR, appState: AppState.IDLE });
  assert.equal(ok, false, "a write that does not round-trip must be reported as failed, not successful");
});

test("corrupt or malformed stored data is rejected rather than restored", async () => {
  globalThis.sessionStorage = {
    _raw: '{"notes": 42, "result": "x", "sentiment": "FOR", "appState": "IDLE"}', // notes is not a string
    getItem(k) { return k === "forge_update_snapshot_v1" ? this._raw : null; },
    setItem() {},
    removeItem() { this._raw = null; },
  };
  assert.equal(takeSnapshot(), null);
});

test("throwing sessionStorage access (disabled storage) is handled without crashing", async () => {
  globalThis.sessionStorage = {
    getItem() { throw new Error("storage disabled"); },
    setItem() { throw new Error("storage disabled"); },
    removeItem() { throw new Error("storage disabled"); },
  };
  assert.equal(saveSnapshot({ notes: "x", result: "", sentiment: Sentiment.FOR, appState: AppState.IDLE }), false);
  assert.equal(takeSnapshot(), null);
});
