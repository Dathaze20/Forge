// Checks whether a newer deployment exists by comparing the commit baked
// into this running bundle (__APP_VERSION__, from vite.config.ts) against
// public/version.json as currently served by the live site. This is
// deliberately independent of the service worker lifecycle: an ordinary
// app-code deployment can leave the service worker file itself byte-for-byte
// unchanged, so "is a new service worker waiting" is not a reliable signal
// of "is a new deployment live" - the commit SHA in version.json is.

export type UpdateCheckResult =
  | { status: "up-to-date" }
  | { status: "update-available"; remoteCommit: string }
  | { status: "offline" }
  | { status: "network-error" }
  | { status: "server-error"; httpStatus: number }
  | { status: "invalid-data" };

interface VersionManifest {
  commit: string;
  builtAt?: string;
}

function isVersionManifest(data: unknown): data is VersionManifest {
  return (
    !!data &&
    typeof data === "object" &&
    typeof (data as Record<string, unknown>).commit === "string" &&
    (data as Record<string, unknown>).commit !== ""
  );
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  // Fail fast and honestly on a known-offline device instead of letting a
  // fetch hang or ambiguously error - this is the one case we can detect
  // before even trying the network.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { status: "offline" };
  }

  let response: Response;
  try {
    // cache: "no-store" plus a cache-busting query param defeats both the
    // browser's HTTP cache and any intermediate proxy cache. The service
    // worker additionally never intercepts version.json at all (see
    // public/sw.js), so this is always a genuine live round trip, never a
    // cached response mistaken for one.
    response = await fetch(`./version.json?cachebust=${Date.now()}`, {
      cache: "no-store",
      // Without a bound, a connection that hangs instead of erroring (not
      // uncommon on flaky mobile networks) would leave the Settings panel
      // stuck on "Checking..." indefinitely, with no way back since the
      // panel's state persists across closing and reopening it.
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { status: "network-error" };
  }

  if (!response.ok) {
    return { status: "server-error", httpStatus: response.status };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { status: "invalid-data" };
  }

  if (!isVersionManifest(data)) {
    return { status: "invalid-data" };
  }

  if (data.commit === __APP_VERSION__) {
    return { status: "up-to-date" };
  }
  return { status: "update-available", remoteCommit: data.commit };
}
