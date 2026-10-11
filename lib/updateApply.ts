// The actual "is it safe to apply this update right now" decision, kept as
// a pure function with its side effects (saving a snapshot, reloading)
// injected in - so the decision logic itself is fully unit-testable without
// a browser, a real AbortController, or a real service worker.
import { Sentiment, AppState } from "../types";
import type { SessionSnapshot } from "./sessionSnapshot";

export interface UpdateApplyContext {
  isGenerating: boolean;
  notes: string;
  result: string;
  sentiment: Sentiment;
  saveSnapshot: (snapshot: SessionSnapshot) => boolean;
  reload: () => Promise<void>;
}

export type UpdateApplyOutcome =
  | { ok: true }
  | { ok: false; reason: string };

export async function applyUpdateSafely(ctx: UpdateApplyContext): Promise<UpdateApplyOutcome> {
  // A generation in progress is never a safe moment to snapshot-and-reload:
  // its content is actively changing, and interrupting it would both lose
  // the in-progress draft and abandon a Gemini call already underway.
  if (ctx.isGenerating) {
    return {
      ok: false,
      reason: "A generation is currently running. Finish or cancel it first, then try Update Now again.",
    };
  }

  const hasContent = ctx.notes.trim().length > 0 || ctx.result.trim().length > 0;

  if (hasContent) {
    const saved = ctx.saveSnapshot({
      notes: ctx.notes,
      result: ctx.result,
      sentiment: ctx.sentiment,
      appState: ctx.result.trim().length > 0 ? AppState.COMPLETE : AppState.IDLE,
    });
    if (!saved) {
      return {
        ok: false,
        reason: "Your notes or article could not be safely saved before updating. Copy them somewhere safe first, then try again.",
      };
    }
  }

  await ctx.reload();
  return { ok: true };
}
