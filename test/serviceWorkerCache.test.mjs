// Verifies that Forge's service worker only ever deletes its own obsolete
// caches on activate, never another app's. CacheStorage is shared across
// every app hosted on the same origin (dathaze20.github.io), regardless of
// service worker scope - a bare `name !== CACHE_NAME` filter would delete
// a sibling app's offline cache (e.g. Super Pong's) the moment Forge's
// service worker activates.
//
// This runs the actual public/sw.js source in a sandboxed VM context (not a
// reimplementation of its logic), so it exercises exactly what ships.
import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const swSource = readFileSync(join(__dirname, "..", "public", "sw.js"), "utf-8");

function createMockCaches(initialCacheNames) {
  const store = new Map(initialCacheNames.map((name) => [name, {}]));
  const deletedNames = [];
  const api = {
    keys: async () => Array.from(store.keys()),
    open: async (name) => {
      if (!store.has(name)) store.set(name, {});
      return {
        addAll: async () => {},
        put: async () => {},
      };
    },
    delete: async (name) => {
      deletedNames.push(name);
      return store.delete(name);
    },
    match: async () => undefined,
  };
  return { store, deletedNames, api };
}

function loadServiceWorker(initialCacheNames) {
  const listeners = {};
  const { store, deletedNames, api } = createMockCaches(initialCacheNames);

  const sandbox = {
    caches: api,
    fetch: async () => { throw new Error("fetch should not be called by this test"); },
    console,
  };
  sandbox.self = {
    addEventListener: (type, handler) => { listeners[type] = handler; },
    clients: { claim: () => {} },
    skipWaiting: () => {},
  };
  // Service worker scripts run with `self` as the global scope - a classic
  // (non-module) script can also reference its globals unqualified.
  Object.assign(sandbox, sandbox.self);

  const context = vm.createContext(sandbox);
  vm.runInContext(swSource, context, { filename: "sw.js" });

  return { listeners, store, deletedNames };
}

async function triggerActivate(listeners) {
  let waitUntilPromise = Promise.resolve();
  await listeners.activate({ waitUntil: (p) => { waitUntilPromise = p; } });
  await waitUntilPromise;
}

test("activate preserves the current Forge cache, deletes obsolete Forge caches, and preserves unrelated apps' caches", async () => {
  const { listeners, store, deletedNames } = loadServiceWorker([
    "abel-arroyo-forge-v1",       // current Forge cache - must survive
    "abel-arroyo-forge-v0-old",   // obsolete Forge cache - must be deleted
    "pong-game-v37",              // Super Pong's cache - must survive
    "some-other-app-cache-xyz",   // unknown third-party cache - must survive
  ]);

  await triggerActivate(listeners);

  // The current Forge cache is preserved.
  assert.ok(store.has("abel-arroyo-forge-v1"), "current Forge cache must be preserved");

  // Obsolete Forge caches are deleted.
  assert.ok(!store.has("abel-arroyo-forge-v0-old"), "obsolete Forge cache must be deleted");
  assert.ok(deletedNames.includes("abel-arroyo-forge-v0-old"));

  // Super Pong's cache is preserved.
  assert.ok(store.has("pong-game-v37"), "Super Pong's cache must never be touched");
  assert.ok(!deletedNames.includes("pong-game-v37"));

  // An unknown third-party cache is preserved.
  assert.ok(store.has("some-other-app-cache-xyz"), "an unrecognized cache must be left alone");
  assert.ok(!deletedNames.includes("some-other-app-cache-xyz"));

  // Only the one genuinely obsolete Forge cache was deleted - nothing else.
  assert.deepEqual(deletedNames, ["abel-arroyo-forge-v0-old"]);
});

test("a fresh install (no caches yet) activates cleanly with nothing to delete", async () => {
  const { listeners, store, deletedNames } = loadServiceWorker([]);
  await triggerActivate(listeners);
  assert.deepEqual(deletedNames, []);
  assert.deepEqual(Array.from(store.keys()), []);
});

test("multiple obsolete Forge cache versions are all cleaned up in one activate", async () => {
  const { listeners, store, deletedNames } = loadServiceWorker([
    "abel-arroyo-forge-v1",
    "abel-arroyo-forge-v0",
    "abel-arroyo-forge-beta",
    "pong-game-v37",
  ]);

  await triggerActivate(listeners);

  assert.ok(store.has("abel-arroyo-forge-v1"));
  assert.ok(store.has("pong-game-v37"));
  assert.equal(deletedNames.length, 2);
  assert.ok(deletedNames.includes("abel-arroyo-forge-v0"));
  assert.ok(deletedNames.includes("abel-arroyo-forge-beta"));
});

test("a cache name that merely contains the Forge prefix elsewhere is not treated as Forge's own", async () => {
  // Guards against a naive `.includes(prefix)` style check - only a cache
  // name that *starts with* Forge's exact prefix is ever eligible for
  // deletion.
  const { listeners, store, deletedNames } = loadServiceWorker([
    "abel-arroyo-forge-v1",
    "some-app-that-mentions-abel-arroyo-forge-in-its-name",
  ]);

  await triggerActivate(listeners);

  assert.ok(store.has("some-app-that-mentions-abel-arroyo-forge-in-its-name"));
  assert.ok(!deletedNames.includes("some-app-that-mentions-abel-arroyo-forge-in-its-name"));
});
