import { HomeAssistant } from "../types";

interface IntentTarget {
  type: "area" | "device" | "entity" | "domain" | "device_class" | "custom";
  name: string;
  id: string | null;
}

interface IntentResultBase {
  language: string;
  speech:
    | {
        [SpeechType in "plain" | "ssml"]: { extra_data: any; speech: string };
      }
    | null;
}

interface IntentResultActionDone extends IntentResultBase {
  response_type: "action_done";
  data: {
    targets: IntentTarget[];
    success: IntentTarget[];
    failed: IntentTarget[];
  };
}

interface IntentResultQueryAnswer extends IntentResultBase {
  response_type: "query_answer";
  data: {
    targets: IntentTarget[];
    success: IntentTarget[];
    failed: IntentTarget[];
  };
}

interface IntentResultError extends IntentResultBase {
  response_type: "error";
  data: {
    code:
      | "no_intent_match"
      | "no_valid_targets"
      | "failed_to_handle"
      | "unknown";
  };
}

interface ConversationResult {
  conversation_id: string;
  response:
    | IntentResultActionDone
    | IntentResultQueryAnswer
    | IntentResultError;
}

export interface AgentInfo {
  attribution?: { name: string; url: string };
  onboarding?: { text: string; url: string };
}

export const processConversationInput = (
  hass: HomeAssistant,
  text: string,
  // eslint-disable-next-line: variable-name
  conversation_id: string
): Promise<ConversationResult> =>
  hass.callWS({
    type: "conversation/process",
    text,
    conversation_id,
  });

export const getAgentInfo = (hass: HomeAssistant): Promise<AgentInfo> =>
  hass.callWS({
    type: "conversation/agent/info",
  });

export const setConversationOnboarding = (
  hass: HomeAssistant,
  value: boolean
): Promise<boolean> =>
  hass.callWS({
    type: "conversation/onboarding/set",
    shown: value,
  });
