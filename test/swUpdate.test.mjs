import { test } from "node:test";
import assert from "node:assert/strict";

const { applyServiceWorkerUpdate } = await import("../lib/swUpdate.ts");

// Node 22 defines `navigator` as a built-in global with only a getter, so a
// plain `globalThis.navigator = ...` throws - defineProperty is required.
function setNavigator(value) {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
}

function installFakeServiceWorkerContainer({ waiting, firesControllerChange = true } = {}) {
  const listeners = [];
  let reloadCount = 0;
  const waitingWorker = waiting
    ? { postMessage: (msg) => {
        if (firesControllerChange) {
          // Simulate the browser firing controllerchange shortly after the
          // waiting worker is told to skip waiting.
          setTimeout(() => listeners.forEach(({ type, fn }) => type === "controllerchange" && fn()), 5);
        }
        waitingWorker.lastMessage = msg;
      } }
    : null;

  setNavigator({
    serviceWorker: {
      getRegistration: async () => ({ waiting: waitingWorker }),
      addEventListener: (type, fn, _opts) => listeners.push({ type, fn }),
    },
  });
  globalThis.window = {
    location: { reload: () => { reloadCount++; } },
  };

  return {
    getReloadCount: () => reloadCount,
    getWaitingWorker: () => waitingWorker,
    listenerCount: () => listeners.length,
  };
}

// ---------------------------------------------------------------------------
// 13. A service worker is waiting.
test("13. a waiting service worker is promoted via postMessage before reloading", async () => {
  const env = installFakeServiceWorkerContainer({ waiting: true });
  await applyServiceWorkerUpdate();
  assert.deepEqual(env.getWaitingWorker().lastMessage, { type: "SKIP_WAITING" });
  assert.equal(env.getReloadCount(), 1);
});

// ---------------------------------------------------------------------------
// 14. No service worker is waiting.
test("14. no waiting worker - reloads directly without hanging", async () => {
  const env = installFakeServiceWorkerContainer({ waiting: false });
  const start = Date.now();
  await applyServiceWorkerUpdate();
  assert.equal(env.getReloadCount(), 1);
  assert.ok(Date.now() - start < 500, "must not wait for a controllerchange that will never fire");
});

// A waiting worker whose controllerchange never fires (edge case - the
// update got promoted but the browser is slow to hand over control) must
// still reload rather than hanging forever.
test("a waiting worker that never fires controllerchange still reloads after its timeout", async () => {
  const env = installFakeServiceWorkerContainer({ waiting: true, firesControllerChange: false });
  const start = Date.now();
  await applyServiceWorkerUpdate();
  assert.equal(env.getReloadCount(), 1);
  // Should fall back to its internal cap rather than hanging indefinitely.
  assert.ok(Date.now() - start < 5000);
});

// ---------------------------------------------------------------------------
// 16. No unexpected reload loop occurs.
test("16. a single call reloads exactly once, never more", async () => {
  const env = installFakeServiceWorkerContainer({ waiting: true });
  await applyServiceWorkerUpdate();
  assert.equal(env.getReloadCount(), 1);
});

test("16b. a getRegistration() failure still falls through to exactly one reload, not zero or a loop", async () => {
  let reloadCount = 0;
  setNavigator({
    serviceWorker: {
      getRegistration: async () => { throw new Error("not supported in this context"); },
      addEventListener: () => {},
    },
  });
  globalThis.window = { location: { reload: () => { reloadCount++; } } };
  await applyServiceWorkerUpdate();
  assert.equal(reloadCount, 1);
});
