// Mocked, reproducible verification of Gemini generation cancellation.
// Mocks @google/genai entirely via node:test's mock.module - NO network
// calls, NO real API key, nothing billed.
//
// Run with: npm test
// (requires Node 22+ for --experimental-test-module-mocks)
import { test, mock } from "node:test";
import assert from "node:assert/strict";

let currentBehavior;
mock.module("@google/genai", {
  namedExports: {
    GoogleGenAI: class {
      constructor(_opts) {}
      models = {
        generateContentStream: (request) => currentBehavior(request),
      };
    },
    ThinkingLevel: { LOW: "LOW" },
  },
});

// lib/apiKey.ts reads localStorage, which doesn't exist under plain Node.
globalThis.localStorage = {
  _store: { postpilot_gemini_api_key: "fake-test-key-not-real" },
  getItem(k) { return this._store[k] ?? null; },
  setItem(k, v) { this._store[k] = v; },
  removeItem(k) { delete this._store[k]; },
};

const { generateBlogPost, GenerationCancelledError } = await import("../services/geminiService.ts");
const { Sentiment } = await import("../types.ts");

function abortError() {
  const e = new Error("The operation was aborted.");
  e.name = "AbortError";
  return e;
}

function makeStream(chunks) {
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: { text: chunks[i++] } };
        },
      };
    },
  };
}

// A stream whose first chunk arrives immediately, then blocks indefinitely
// (simulating network latency) unless the given signal aborts - mirroring
// how aborting a real in-flight fetch causes the next read to reject.
function makeAbortAwareStream(chunks, signal) {
  let i = 0;
  return {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          if (i === 0) {
            i = 1;
            return { done: false, value: { text: chunks[0] } };
          }
          await new Promise((resolve, reject) => {
            if (signal.aborted) { reject(abortError()); return; }
            signal.addEventListener("abort", () => reject(abortError()), { once: true });
          });
          const value = { text: chunks[i++] };
          return { done: false, value };
        },
      };
    },
  };
}

async function waitFor(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate() && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1));
  }
  return predicate();
}

// ---------------------------------------------------------------------------
// 1. Normal generation completes successfully.
test("1. normal generation completes successfully", async () => {
  currentBehavior = async (request) => {
    assert.ok(request.config.systemInstruction.includes("YOU ARE ABEL ARROYO"));
    return makeStream(["Hello ", "world."]);
  };

  const controller = new AbortController();
  const updates = [];
  await generateBlogPost("test notes", Sentiment.FOR, (u) => updates.push(u), controller.signal);

  const last = updates[updates.length - 1];
  assert.equal(last.isComplete, true);
  assert.equal(last.content, "Hello world.");
  assert.deepEqual(last.sources, []);
});

// ---------------------------------------------------------------------------
// 2. Cancel is pressed while Gemini is streaming.
test("2. cancel during an active stream stops it and throws GenerationCancelledError", async () => {
  const controller = new AbortController();
  currentBehavior = async () => makeAbortAwareStream(["first chunk ", "SHOULD NOT ARRIVE"], controller.signal);

  const updates = [];
  const promise = generateBlogPost("test notes", Sentiment.FOR, (u) => updates.push(u), controller.signal);

  assert.ok(await waitFor(() => updates.some((u) => u.content)), "first chunk never arrived");
  controller.abort();

  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof GenerationCancelledError);
    assert.equal(err.name, "GenerationCancelledError");
    return true;
  });

  assert.ok(updates.some((u) => u.content === "first chunk "));
  assert.ok(!updates.some((u) => u.isComplete));
});

// ---------------------------------------------------------------------------
// 3. Cancel is pressed during retry/backoff.
test("3. cancel during retry/backoff short-circuits the wait", async () => {
  const controller = new AbortController();
  currentBehavior = async () => {
    throw new Error("503 Service Unavailable: UNAVAILABLE");
  };

  const start = Date.now();
  const promise = generateBlogPost("test notes", Sentiment.AGAINST, () => {}, controller.signal);
  setTimeout(() => controller.abort(), 15);

  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof GenerationCancelledError);
    return true;
  });
  assert.ok(Date.now() - start < 500, "cancellation did not short-circuit the backoff delay");
});

// ---------------------------------------------------------------------------
// 4 & 5. A new generation starts immediately after cancellation, and the old
// request cannot overwrite the new result. Replicates App.tsx's exact
// request-id guard pattern (there is no DOM/React renderer in this project,
// so this drives the real generateBlogPost through the same acceptance
// check App.tsx applies in its onUpdate callback and catch block).
test("4 & 5. a superseded request cannot overwrite a newer generation's result", async () => {
  let requestId = 0;
  let activeController = null;
  const state = { result: "", complete: false, errors: [] };

  async function runGeneration(notes, behavior) {
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const id = ++requestId;
    currentBehavior = behavior;
    try {
      await generateBlogPost(notes, Sentiment.FOR, (u) => {
        if (id !== requestId) return; // 6. stale callbacks cannot modify UI state
        if (u.content) state.result = u.content;
        if (u.isComplete) state.complete = true;
      }, controller.signal);
    } catch (err) {
      if (id !== requestId || err instanceof GenerationCancelledError) return;
      state.errors.push(err);
    }
  }

  const oldPromise = runGeneration("old notes", async () => makeAbortAwareStream(["OLD"], activeController.signal));
  await new Promise((r) => setTimeout(r, 10));
  const newPromise = runGeneration("new notes", async () => makeStream(["NEW RESULT"]));

  await Promise.all([oldPromise, newPromise]);

  assert.equal(state.result, "NEW RESULT", "the superseded request must not overwrite the new result");
  assert.equal(state.complete, true);
  assert.equal(state.errors.length, 0, "a superseded/cancelled request must never surface as an error");
});

// ---------------------------------------------------------------------------
// 6. Stale callbacks cannot modify UI state - covered directly inside
// scenario 4 & 5 above (the `if (id !== requestId) return;` guard), and
// again here in isolation for a cancelled (not superseded) request.
test("6. stale callbacks from a cancelled request never fire after cancellation", async () => {
  const controller = new AbortController();
  let requestId = 1;
  const currentRequestId = { current: requestId };
  const seenAfterCancel = [];

  currentBehavior = async () => makeAbortAwareStream(["a", "b", "c"], controller.signal);

  const promise = generateBlogPost("notes", Sentiment.FOR, (u) => {
    if (currentRequestId.current !== requestId) {
      seenAfterCancel.push(u);
    }
  }, controller.signal);

  await new Promise((r) => setTimeout(r, 20));
  currentRequestId.current = 2; // simulate App.tsx's handleCancel bumping requestIdRef
  controller.abort();
  await promise.catch(() => {});

  assert.equal(seenAfterCancel.length, 0, "no update should have been accepted after the id was invalidated");
});

// ---------------------------------------------------------------------------
// 7. Old requests cannot trigger delayed scrolling. Replicates App.tsx's
// exact setTimeout-then-recheck-requestId pattern used before calling
// scrollIntoView, since there is no DOM/React renderer in this project.
test("7. a superseded request's delayed scroll never fires", async () => {
  let requestIdRef = 0;
  let scrollCalls = 0;

  function scheduleScrollLikeAppTsx(capturedRequestId) {
    // Mirrors App.tsx exactly: schedule unconditionally, but re-check at
    // fire time, not just at schedule time.
    setTimeout(() => {
      if (capturedRequestId === requestIdRef) {
        scrollCalls++;
      }
    }, 20);
  }

  const requestId1 = ++requestIdRef;
  scheduleScrollLikeAppTsx(requestId1);

  // A newer generation starts before the timeout fires.
  await new Promise((r) => setTimeout(r, 5));
  const requestId2 = ++requestIdRef;
  scheduleScrollLikeAppTsx(requestId2);

  await new Promise((r) => setTimeout(r, 40));

  assert.equal(scrollCalls, 1, "only the current (newest) request's scroll should have fired");
});

// ---------------------------------------------------------------------------
// 8. Expected cancellation errors are not shown as system failures.
test("8. intentional cancellation never produces a misleading failure message", async () => {
  const controller = new AbortController();
  currentBehavior = async () => makeAbortAwareStream(["x"], controller.signal);
  const promise = generateBlogPost("n", Sentiment.FOR, () => {}, controller.signal);
  await new Promise((r) => setTimeout(r, 10));
  controller.abort();

  await assert.rejects(promise, (err) => {
    assert.equal(err.message, "Generation cancelled.");
    assert.ok(!err.message.includes("experiencing extremely high demand"));
    assert.ok(!err.message.includes("Gemini request failed"));
    assert.ok(!err.message.includes("invalid"));
    return true;
  });
});

// ---------------------------------------------------------------------------
// 9. Abort listeners and resources are cleaned up correctly. Runs several
// cancellations back to back and asserts no unhandled promise rejections
// occur anywhere in the process - a dangling/leaked listener firing twice,
// or a promise neither resolved nor caught, would surface as one.
test("9. no unhandled rejections or leaked listeners across repeated cancellations", async () => {
  const unhandled = [];
  const onUnhandled = (reason) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);

  try {
    for (let i = 0; i < 5; i++) {
      const controller = new AbortController();
      currentBehavior = async () => {
        throw new Error("503 Service Unavailable: UNAVAILABLE");
      };
      const promise = generateBlogPost("n", Sentiment.FOR, () => {}, controller.signal);
      setTimeout(() => controller.abort(), 5);
      await promise.catch(() => {});
    }
    // Give any late microtasks a chance to surface as unhandled rejections.
    await new Promise((r) => setTimeout(r, 50));
  } finally {
    process.off("unhandledRejection", onUnhandled);
  }

  assert.equal(unhandled.length, 0, `unexpected unhandled rejections: ${unhandled.map(String)}`);
});

// ---------------------------------------------------------------------------
// 10. React component unmounting cannot leave a stale request affecting a
// future component instance. App.tsx adds a useEffect(() => () =>
// abortControllerRef.current?.abort(), []) cleanup on unmount - this
// replicates that exact pattern (no DOM/React renderer is installed in this
// project, so this tests the pattern directly rather than a mounted
// component's real unmount).
test("10. unmounting aborts any in-flight request so it cannot affect a later instance", async () => {
  function createAppInstance() {
    const abortControllerRef = { current: null };
    const unmount = () => {
      abortControllerRef.current?.abort();
    };
    return { abortControllerRef, unmount };
  }

  const instanceA = createAppInstance();
  const controller = new AbortController();
  instanceA.abortControllerRef.current = controller;

  const updatesSeenByInstanceA = [];
  currentBehavior = async () => makeAbortAwareStream(["x"], controller.signal);
  const promise = generateBlogPost("n", Sentiment.FOR, (u) => updatesSeenByInstanceA.push(u), controller.signal);

  await new Promise((r) => setTimeout(r, 10));
  instanceA.unmount(); // simulates the component tearing down mid-generation

  await assert.rejects(promise, (err) => err instanceof GenerationCancelledError);

  // A brand new instance (e.g. a fresh mount) starts with its own,
  // independent state - nothing from instance A can reach it.
  const instanceB = createAppInstance();
  assert.equal(instanceB.abortControllerRef.current, null);
});
