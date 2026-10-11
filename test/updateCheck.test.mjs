// Mocked verification of lib/updateCheck.ts's version comparison logic.
// No network calls - fetch is fully stubbed per test.
import { test } from "node:test";
import assert from "node:assert/strict";

// __APP_VERSION__ only exists at runtime via vite.config.ts's `define`
// (a build-time text substitution) - under plain Node there is no bundler,
// so it must be provided as a real global before the module is imported.
// Assigning to globalThis here creates a genuine global binding, which the
// module's bare `__APP_VERSION__` reference resolves against exactly the
// same way it would resolve a bundler-injected one.
globalThis.__APP_VERSION__ = "current-sha-aaaa";

const { checkForUpdate } = await import("../lib/updateCheck.ts");

// Node 22 defines `navigator` as a built-in global with only a getter, so a
// plain `globalThis.navigator = ...` throws - defineProperty is required to
// override it for these tests.
function setNavigator(value) {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
}

function withFetch(impl, body) {
  const original = globalThis.fetch;
  const originalNavigator = globalThis.navigator;
  globalThis.fetch = impl;
  setNavigator({ onLine: true });
  return body().finally(() => {
    globalThis.fetch = original;
    setNavigator(originalNavigator);
  });
}

// ---------------------------------------------------------------------------
// 1. Current version equals the deployed version.
test("1. up to date when the remote commit matches __APP_VERSION__", async () => {
  await withFetch(
    async (url, init) => {
      assert.ok(url.toString().startsWith("./version.json?cachebust="));
      assert.equal(init.cache, "no-store");
      return new Response(JSON.stringify({ commit: "current-sha-aaaa" }), { status: 200 });
    },
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "up-to-date" });
    }
  );
});

// ---------------------------------------------------------------------------
// 2. A newer deployment is available.
test("2. update-available when the remote commit differs", async () => {
  await withFetch(
    async () => new Response(JSON.stringify({ commit: "newer-sha-bbbb" }), { status: 200 }),
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "update-available", remoteCommit: "newer-sha-bbbb" });
    }
  );
});

// ---------------------------------------------------------------------------
// 3. The device is offline.
test("3. offline is detected before attempting a network call", async () => {
  const original = globalThis.navigator;
  const originalFetch = globalThis.fetch;
  let fetchCalled = false;
  setNavigator({ onLine: false });
  globalThis.fetch = async () => { fetchCalled = true; throw new Error("should not be called"); };
  try {
    const result = await checkForUpdate();
    assert.deepEqual(result, { status: "offline" });
    assert.equal(fetchCalled, false, "fetch should never be attempted while known offline");
  } finally {
    setNavigator(original);
    globalThis.fetch = originalFetch;
  }
});

// A genuine network failure while navigator.onLine reports true (DNS
// failure, connection refused, CORS, etc.) is classified distinctly from
// the fast-path offline check above.
test("3b. a network failure while nominally online is reported distinctly", async () => {
  await withFetch(
    async () => { throw new TypeError("Failed to fetch"); },
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "network-error" });
    }
  );
});

// ---------------------------------------------------------------------------
// 4. The version endpoint returns invalid data.
test("4. invalid-data when the response body is malformed JSON", async () => {
  await withFetch(
    async () => new Response("this is not json", { status: 200 }),
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "invalid-data" });
    }
  );
});

test("4b. invalid-data when the response is valid JSON but missing a commit field", async () => {
  await withFetch(
    async () => new Response(JSON.stringify({ builtAt: "2026-01-01" }), { status: 200 }),
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "invalid-data" });
    }
  );
});

// ---------------------------------------------------------------------------
// 5. The version endpoint returns an HTTP error.
test("5. server-error carries the actual HTTP status", async () => {
  await withFetch(
    async () => new Response("Not Found", { status: 404 }),
    async () => {
      const result = await checkForUpdate();
      assert.deepEqual(result, { status: "server-error", httpStatus: 404 });
    }
  );
});

// A hanging connection (no error, just never resolving) must not leave a
// check stuck forever - verified by confirming a bounded AbortSignal is
// actually wired into the fetch call, rather than waiting out a real
// multi-second timeout in this test.
test("a timeout signal is attached so a hung connection cannot hang forever", async () => {
  await withFetch(
    async (_url, init) => {
      assert.ok(init.signal instanceof AbortSignal, "fetch must receive a bounding AbortSignal");
      return new Response(JSON.stringify({ commit: "current-sha-aaaa" }), { status: 200 });
    },
    async () => {
      await checkForUpdate();
    }
  );
});

// ---------------------------------------------------------------------------
// 6. A cached response cannot falsely report the latest version.
// This module never reads from any cache itself - every call is a fresh
// fetch with cache: "no-store" and a unique cache-busting query string, so
// there is no code path here that could return a stale success. The
// complementary guarantee (the service worker must never intercept or
// serve version.json from its offline cache) lives in public/sw.js and is
// verified separately - see the PR description / final report for the real
// end-to-end browser confirmation, since that half cannot be exercised
// without a real service worker.
test("6. every check is a fresh, cache-busted, no-store request", async () => {
  const seenUrls = [];
  await withFetch(
    async (url, init) => {
      seenUrls.push(url.toString());
      assert.equal(init.cache, "no-store");
      return new Response(JSON.stringify({ commit: "current-sha-aaaa" }), { status: 200 });
    },
    async () => {
      await checkForUpdate();
      await new Promise((r) => setTimeout(r, 2));
      await checkForUpdate();
    }
  );
  assert.equal(seenUrls.length, 2);
  assert.notEqual(seenUrls[0], seenUrls[1], "two checks must not reuse an identical (and therefore cacheable) URL");
});
