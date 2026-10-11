// Service worker registration and update application, split out from
// index.tsx so the "apply an update" decision is a single, explicit,
// testable function rather than something that fires automatically off a
// lifecycle event. Nothing in this module ever reloads the page on its own -
// applyServiceWorkerUpdate() only runs when something calls it, and the only
// caller is the Settings panel's explicit "Update Now" action, after the
// caller has already decided it is safe to do so (see lib/updateApply.ts).

export function initServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        // Primes the registration's `waiting` state if a new worker exists,
        // without installing or activating anything - purely informative.
        reg.update().catch(() => {});
      })
      .catch(() => {});
  });
}

// Promotes any waiting service worker (if one exists) and reloads the page.
// Call this only once the caller has already confirmed it is safe to reload
// right now - this function itself has no notion of unsaved notes, an active
// generation, or anything else about app state.
export async function applyServiceWorkerUpdate(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        // If the service worker itself did not actually change (a common
        // case - an ordinary app-code deploy often leaves sw.js untouched),
        // there is nothing to wait for controllerchange on, so cap the wait
        // rather than hanging the update indefinitely.
        navigator.serviceWorker.addEventListener("controllerchange", finish, { once: true });
        setTimeout(finish, 3000);
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
      });
    }
  } catch {
    // Fall through to reload regardless. The caller already confirmed a
    // newer deployment exists via version.json, and the service worker's
    // own fetch handler is network-first, so a plain reload still picks up
    // fresh assets even if no service worker update was involved at all.
  }
  window.location.reload();
}
