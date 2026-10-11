// A deliberately temporary, one-time safety net for the single reload that
// applying an update triggers - not a general draft-autosave feature.
//
// Uses sessionStorage (cleared when the browser/tab session ends), never
// localStorage, so research notes are never silently turned into permanent
// on-disk storage. The snapshot is read back and immediately deleted the
// first time it is read, so it can only ever restore across exactly one
// reload.
import { Sentiment, AppState } from "../types";

const SNAPSHOT_KEY = "forge_update_snapshot_v1";

export interface SessionSnapshot {
  notes: string;
  result: string;
  sentiment: Sentiment;
  // Only IDLE (notes in progress, nothing generated yet) or COMPLETE (a
  // finished article) can ever be snapshotted - a generation in progress is
  // never safe to snapshot and is blocked before this is called at all.
  appState: AppState.IDLE | AppState.COMPLETE;
}

function isSessionSnapshot(data: unknown): data is SessionSnapshot {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.notes === "string" &&
    typeof d.result === "string" &&
    (d.sentiment === Sentiment.FOR || d.sentiment === Sentiment.AGAINST) &&
    (d.appState === AppState.IDLE || d.appState === AppState.COMPLETE)
  );
}

// Returns true only if the snapshot was genuinely written and verified to
// have round-tripped - never claim success on a failed or silently-ignored
// write (e.g. Safari private mode, which can accept setItem then no-op it).
export function saveSnapshot(snapshot: SessionSnapshot): boolean {
  try {
    const serialized = JSON.stringify(snapshot);
    sessionStorage.setItem(SNAPSHOT_KEY, serialized);
    return sessionStorage.getItem(SNAPSHOT_KEY) === serialized;
  } catch {
    return false;
  }
}

// One-time read: if a snapshot exists, deletes it immediately so it can
// never be restored a second time (e.g. from a later, unrelated reload).
export function takeSnapshot(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(SNAPSHOT_KEY);
    const parsed = JSON.parse(raw);
    return isSessionSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
