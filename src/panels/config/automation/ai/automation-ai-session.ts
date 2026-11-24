import { getStorage } from "../../../../common/decorators/storage";
import type { AutomationConfig } from "../../../../data/automation";
import type {
  AutomationAiMessage,
  AutomationAiStep,
  AutomationAiTurn,
} from "./automation-ai-agent";

/** The conversation of the AI panel, without a request that still runs. */
export interface AutomationAiPanelState {
  turns: AutomationAiTurn[];
  steps: AutomationAiStep[];
  messages: AutomationAiMessage[];
  problems: string[];
  error?: string;
}

/** What the AI of one automation keeps while the user goes elsewhere. */
export interface AutomationAiSession {
  panel?: AutomationAiPanelState;
  /** The config before and after the last change of the AI. */
  change?: { before: AutomationConfig; after: AutomationConfig };
  open: boolean;
}

// One entry per automation id, for as long as the browser tab lives
const STORAGE_KEY = "automation-ai-sessions";

const sessions = () =>
  getStorage("sessionStorage").getValue<Record<string, AutomationAiSession>>(
    STORAGE_KEY
  ) ?? {};

export const loadAiSession = (
  automationId: string
): AutomationAiSession | undefined => sessions()[automationId];

/** Stores the session, or forgets it when there is nothing to keep. */
export const saveAiSession = (
  automationId: string,
  session: AutomationAiSession
) => {
  const { [automationId]: _old, ...others } = sessions();
  const keep = !!(session.panel?.turns.length || session.change);
  getStorage("sessionStorage").setValue(
    STORAGE_KEY,
    keep ? { ...others, [automationId]: session } : others
  );
};
