import { generateUuidV4 } from "../common/util/uuid";
import type { HomeAssistant } from "../types";

const STORAGE_KEY_SESSION = "tools-debug-console-session";

// Tabs tell each other which sessions they use, over this channel.
const SESSION_CHANNEL = "tools-debug-console-sessions";

// How long a tab waits for another tab to say it uses a session already.
const CLAIM_TIMEOUT = 100;

type SessionMessage =
  | { type: "claim"; sessionId: string; ticket: number }
  | { type: "taken"; sessionId: string };

// Per user, so accounts taking turns in the same browser tab share nothing.
const sessionIds = new Map<string, Promise<string>>();

// The sessions this tab uses, once claimed.
const ownSessionIds = new Set<string>();

const sessionChannel = (() => {
  try {
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.addEventListener("message", (ev: MessageEvent<SessionMessage>) => {
      if (ev.data.type === "claim" && ownSessionIds.has(ev.data.sessionId)) {
        channel.postMessage({
          type: "taken",
          sessionId: ev.data.sessionId,
        } satisfies SessionMessage);
      }
    });
    return channel;
  } catch (_err: unknown) {
    // Without it, a tab opened from another one shares its session.
    return undefined;
  }
})();

/**
 * Return if another open tab uses this session already, or claims it at the
 * same time. Then the tab with the lowest ticket keeps it; both see the claim
 * of the other, so exactly one of them does.
 */
const isSessionTaken = (sessionId: string): Promise<boolean> => {
  const channel = sessionChannel;
  if (!channel) {
    return Promise.resolve(false);
  }

  const ticket = Math.random();
  return new Promise((resolve) => {
    const done = (taken: boolean) => {
      window.clearTimeout(timeout);
      channel.removeEventListener("message", onMessage);
      resolve(taken);
    };
    const onMessage = (ev: MessageEvent<SessionMessage>) => {
      const message = ev.data;
      if (message.sessionId !== sessionId) {
        return;
      }

      if (
        message.type === "taken" ||
        (message.type === "claim" && message.ticket < ticket)
      ) {
        done(true);
      }
    };
    const timeout = window.setTimeout(() => done(false), CLAIM_TIMEOUT);

    channel.addEventListener("message", onMessage);
    channel.postMessage({
      type: "claim",
      sessionId,
      ticket,
    } satisfies SessionMessage);
  });
};

const claimSessionId = async (userId: string): Promise<string> => {
  const storageKey = `${STORAGE_KEY_SESSION}-${userId}`;
  let sessionId: string | undefined;
  try {
    sessionId = window.sessionStorage.getItem(storageKey) ?? undefined;
  } catch (_err: unknown) {
    // Without storage, the session lasts until the page reloads.
  }

  // A tab opened from another one gets a copy of its session storage. When
  // that tab is still open, this one starts a session of its own.
  if (!sessionId || (await isSessionTaken(sessionId))) {
    sessionId = generateUuidV4();
    try {
      window.sessionStorage.setItem(storageKey, sessionId);
    } catch (_err: unknown) {
      // Kept for this page load only.
    }
  }

  ownSessionIds.add(sessionId);
  return sessionId;
};

/**
 * The console session of this browser tab. The backend keeps the session for
 * a while after disconnecting, so a reload continues where it left off.
 */
const getSessionId = (userId: string): Promise<string> => {
  let sessionId = sessionIds.get(userId);
  if (!sessionId) {
    sessionId = claimSessionId(userId);
    sessionIds.set(userId, sessionId);
  }

  return sessionId;
};

/** Claim the session of this tab ahead of time, so commands do not wait. */
export const prepareDebugConsoleSession = (userId: string) => {
  getSessionId(userId);
};

const callDebugConsole = async <T>(
  hass: HomeAssistant,
  message: { type: string; [key: string]: unknown }
) =>
  hass.callWS<T>({
    ...message,
    session_id: await getSessionId(hass.user!.id),
  });

/** Return if the user has to accept the warning before using the console. */
export const getDebugConsoleInfo = (hass: Pick<HomeAssistant, "callWS">) =>
  hass.callWS<{ warning_required: boolean }>({ type: "debug_console/info" });

export const acceptDebugConsoleWarning = (
  hass: Pick<HomeAssistant, "callWS">
) => hass.callWS({ type: "debug_console/warning/accept" });

export type DebugConsoleValue =
  | { type: "none" }
  | { type: "boolean"; value: boolean }
  | { type: "number"; value: string }
  | { type: "string"; value: string; truncated: boolean }
  | { type: "text"; value: string; truncated: boolean }
  | {
      type: "object";
      class: string;
      preview: string;
      /** Unique per backend session, so stale IDs never find another object. */
      object_id: string;
      length?: number;
    };

export interface DebugConsoleExecuteResult {
  logs?: DebugConsoleValue[][];
  /** Set when the code printed more lines than the console keeps. */
  logs_truncated?: boolean;
  result?: DebugConsoleValue | null;
  error?: string;
}

export type DebugConsoleChild =
  { key: string; value: DebugConsoleValue } | { key: string; getter: true };

/**
 * Looks into objects of the console, for components that do not hold the
 * hass object.
 */
export interface DebugConsoleObjects {
  inspect(objectId: string): Promise<DebugConsoleInspectResult>;
  getAttribute(
    objectId: string,
    attribute: string
  ): Promise<DebugConsoleGetAttributeResult>;
}

export interface DebugConsoleInspectResult {
  children: DebugConsoleChild[];
  truncated: boolean;
}

export type DebugConsoleGetAttributeResult =
  { value: DebugConsoleValue } | { error: string };

export const executeDebugConsole = (hass: HomeAssistant, code: string) =>
  callDebugConsole<DebugConsoleExecuteResult>(hass, {
    type: "debug_console/execute",
    code,
  });

/** Return if code needs more input before it runs, like in the Python REPL. */
export const checkDebugConsoleInput = (
  hass: Pick<HomeAssistant, "callWS">,
  code: string
) =>
  hass.callWS<{ incomplete: boolean }>({
    type: "debug_console/check_input",
    code,
  });

/** Stop the code this tab is running, which then answers it stopped. */
export const stopDebugConsole = (hass: HomeAssistant) =>
  callDebugConsole(hass, { type: "debug_console/stop" });

export const inspectDebugConsole = (hass: HomeAssistant, objectId: string) =>
  callDebugConsole<DebugConsoleInspectResult>(hass, {
    type: "debug_console/inspect",
    object_id: objectId,
  });

export const getDebugConsoleAttribute = (
  hass: HomeAssistant,
  objectId: string,
  attribute: string
) =>
  callDebugConsole<DebugConsoleGetAttributeResult>(hass, {
    type: "debug_console/get_attribute",
    object_id: objectId,
    attribute,
  });

export interface DebugConsoleCompleteResult {
  /** The part of the line the matches complete. */
  token: string;
  matches: string[];
}

/** Complete the code being typed, which is the text up to the cursor. */
export const completeDebugConsole = (hass: HomeAssistant, code: string) =>
  callDebugConsole<DebugConsoleCompleteResult>(hass, {
    type: "debug_console/complete",
    code,
  });

export interface DebugConsoleSignature {
  name: string;
  parameters: string[];
  /** Index of the parameter the argument being typed goes to. */
  active: number | null;
  returns: string | null;
  doc: string;
}

/** Return the signature of the call the code up to the cursor is in. */
export const getDebugConsoleSignature = (hass: HomeAssistant, code: string) =>
  callDebugConsole<{ signature: DebugConsoleSignature | null }>(hass, {
    type: "debug_console/signature",
    code,
  });

export const clearDebugConsole = (hass: HomeAssistant) =>
  callDebugConsole(hass, { type: "debug_console/clear" });
