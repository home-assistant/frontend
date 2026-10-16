import { generateUuidV4 } from "../common/util/uuid";
import type { HomeAssistant } from "../types";

const STORAGE_KEY_SESSION = "tools-debug-console-session";

// Per user, so accounts taking turns in the same browser tab share nothing.
const sessionIds = new Map<string, string>();

/**
 * The console session of this browser tab. The backend keeps the session for
 * a while after disconnecting, so a reload continues where it left off.
 */
const getSessionId = (userId: string): string => {
  let sessionId = sessionIds.get(userId);
  if (sessionId) {
    return sessionId;
  }

  const storageKey = `${STORAGE_KEY_SESSION}-${userId}`;
  try {
    sessionId = window.sessionStorage.getItem(storageKey) ?? undefined;
    if (!sessionId) {
      sessionId = generateUuidV4();
      window.sessionStorage.setItem(storageKey, sessionId);
    }
  } catch (_err: unknown) {
    // Without storage, the session lasts until the page reloads.
  }

  sessionId ??= generateUuidV4();
  sessionIds.set(userId, sessionId);
  return sessionId;
};

const callDebugConsole = <T>(
  hass: HomeAssistant,
  message: { type: string; [key: string]: unknown }
) => hass.callWS<T>({ ...message, session_id: getSessionId(hass.user!.id) });

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
  incomplete?: boolean;
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

export const executeDebugConsole = (
  hass: HomeAssistant,
  code: string,
  checkComplete = false
) =>
  callDebugConsole<DebugConsoleExecuteResult>(hass, {
    type: "debug_console/execute",
    code,
    check_complete: checkComplete,
  });

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
