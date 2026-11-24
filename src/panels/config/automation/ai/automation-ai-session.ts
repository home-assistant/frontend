import { getStorage } from "../../../../common/decorators/storage";
import type {
  AiEditorConfig,
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

/** What the AI of one config keeps while the user goes elsewhere. */
export interface AutomationAiSession {
  panel?: AutomationAiPanelState;
  /** The config before and after the last change of the AI. */
  change?: { before: AiEditorConfig; after: AiEditorConfig };
  open: boolean;
}

// One entry per kind and id of a config, for as long as the browser tab lives
const STORAGE_KEY = "automation-ai-sessions";

const sessions = () =>
  getStorage("sessionStorage").getValue<Record<string, AutomationAiSession>>(
    STORAGE_KEY
  ) ?? {};

export const loadAiSession = (key: string): AutomationAiSession | undefined =>
  sessions()[key];

/** Stores the session, or forgets it when there is nothing to keep. */
export const saveAiSession = (key: string, session: AutomationAiSession) => {
  const { [key]: _old, ...others } = sessions();
  const keep = !!(
    session.panel?.turns.length ||
    session.panel?.interrupted ||
    session.change
  );
  getStorage("sessionStorage").setValue(
    STORAGE_KEY,
    keep ? { ...others, [key]: session } : others
  );
};
