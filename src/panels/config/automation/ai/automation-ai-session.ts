import { getStorage } from "../../../../common/decorators/storage";
import type { AutomationConfig } from "../../../../data/automation";
import type {
  AutomationAiMessage,
  AutomationAiTurn,
} from "./automation-ai-agent";

/** The conversation of the AI panel, a running request as interrupted. */
export interface AutomationAiPanelState {
  turns: AutomationAiTurn[];
  messages: AutomationAiMessage[];
  problems: string[];
  error?: string;
  /** A request whose answer got lost, because the user left the page. */
  interrupted?: string;
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
  const keep = !!(
    session.panel?.turns.length ||
    session.panel?.interrupted ||
    session.change
  );
  getStorage("sessionStorage").setValue(
    STORAGE_KEY,
    keep ? { ...others, [automationId]: session } : others
  );
};
