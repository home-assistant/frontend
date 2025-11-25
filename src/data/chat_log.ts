import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

export const enum ChatLogEventType {
  INITIAL_STATE = "initial_state",
  CREATED = "created",
  UPDATED = "updated",
  DELETED = "deleted",
  CONTENT_ADDED = "content_added",
}

export interface ChatLogAttachment {
  media_content_id: string;
  mime_type: string;
  path: string;
}

export interface ChatLogSystemContent {
  role: "system";
  content: string;
  created: Date;
}

export interface ChatLogUserContent {
  role: "user";
  content: string;
  created: Date;
  attachments?: ChatLogAttachment[];
}

export interface ChatLogAssistantContent {
  role: "assistant";
  agent_id: string;
  created: Date;
  content?: string;
  thinking_content?: string;
  tool_calls?: any[];
}

export interface ChatLogToolResultContent {
  role: "tool_result";
  agent_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_result: any;
  created: Date;
}

export type ChatLogContent =
  | ChatLogSystemContent
  | ChatLogUserContent
  | ChatLogAssistantContent
  | ChatLogToolResultContent;

export interface ChatLog {
  conversation_id: string;
  continue_conversation: boolean;
  content: ChatLogContent[];
  created: Date;
}

// Internal wire format types (not exported)
interface ChatLogSystemContentWire {
  role: "system";
  content: string;
  created: string;
}

interface ChatLogUserContentWire {
  role: "user";
  content: string;
  created: string;
  attachments?: ChatLogAttachment[];
}

interface ChatLogAssistantContentWire {
  role: "assistant";
  agent_id: string;
  created: string;
  content?: string;
  thinking_content?: string;
  tool_calls?: {
    tool_name: string;
    tool_args: Record<string, any>;
    id: string;
    external: boolean;
  }[];
}

interface ChatLogToolResultContentWire {
  role: "tool_result";
  agent_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_result: any;
  created: string;
}

type ChatLogContentWire =
  | ChatLogSystemContentWire
  | ChatLogUserContentWire
  | ChatLogAssistantContentWire
  | ChatLogToolResultContentWire;

interface ChatLogWire {
  conversation_id: string;
  continue_conversation: boolean;
  content: ChatLogContentWire[];
  created: string;
}

const processContent = (content: ChatLogContentWire): ChatLogContent => ({
  ...content,
  created: new Date(content.created),
});

const processChatLog = (chatLog: ChatLogWire): ChatLog => ({
  ...chatLog,
  created: new Date(chatLog.created),
  content: chatLog.content.map(processContent),
});

interface ChatLogInitialStateEvent {
  event_type: ChatLogEventType.INITIAL_STATE;
  data: ChatLogWire;
}

interface ChatLogIndexInitialStateEvent {
  event_type: ChatLogEventType.INITIAL_STATE;
  data: ChatLogWire[];
}

interface ChatLogCreatedEvent {
  conversation_id: string;
  event_type: ChatLogEventType.CREATED;
  data: ChatLogWire;
}

interface ChatLogUpdatedEvent {
  conversation_id: string;
  event_type: ChatLogEventType.UPDATED;
  data: { chat_log: ChatLogWire };
}

interface ChatLogDeletedEvent {
  conversation_id: string;
  event_type: ChatLogEventType.DELETED;
  data: ChatLogWire;
}

interface ChatLogContentAddedEvent {
  conversation_id: string;
  event_type: ChatLogEventType.CONTENT_ADDED;
  data: { content: ChatLogContentWire };
}

type ChatLogSubscriptionEvent =
  | ChatLogInitialStateEvent
  | ChatLogUpdatedEvent
  | ChatLogDeletedEvent
  | ChatLogContentAddedEvent;

type ChatLogIndexSubscriptionEvent =
  | ChatLogIndexInitialStateEvent
  | ChatLogCreatedEvent
  | ChatLogDeletedEvent;

export const subscribeChatLog = (
  hass: HomeAssistant,
  conversationId: string,
  callback: (chatLog: ChatLog | null) => void
): Promise<UnsubscribeFunc> => {
  let chatLog: ChatLog | null = null;

  return hass.connection.subscribeMessage<ChatLogSubscriptionEvent>(
    (event) => {
      if (event.event_type === ChatLogEventType.INITIAL_STATE) {
        chatLog = processChatLog(event.data);
        callback(chatLog);
      } else if (event.event_type === ChatLogEventType.CONTENT_ADDED) {
        if (chatLog) {
          chatLog = {
            ...chatLog,
            content: [...chatLog.content, processContent(event.data.content)],
          };
          callback(chatLog);
        }
      } else if (event.event_type === ChatLogEventType.UPDATED) {
        chatLog = processChatLog(event.data.chat_log);
        callback(chatLog);
      } else if (event.event_type === ChatLogEventType.DELETED) {
        chatLog = null;
        callback(null);
      }
    },
    {
      type: "conversation/chat_log/subscribe",
      conversation_id: conversationId,
    }
  );
};

export const subscribeChatLogIndex = (
  hass: HomeAssistant,
  callback: (chatLogs: ChatLog[]) => void
): Promise<UnsubscribeFunc> => {
  let chatLogs: ChatLog[] = [];

  return hass.connection.subscribeMessage<ChatLogIndexSubscriptionEvent>(
    (event) => {
      if (event.event_type === ChatLogEventType.INITIAL_STATE) {
        chatLogs = event.data.map(processChatLog);
        callback(chatLogs);
      } else if (event.event_type === ChatLogEventType.CREATED) {
        chatLogs = [...chatLogs, processChatLog(event.data)];
        callback(chatLogs);
      } else if (event.event_type === ChatLogEventType.DELETED) {
        chatLogs = chatLogs.filter(
          (chatLog) => chatLog.conversation_id !== event.conversation_id
        );
        callback(chatLogs);
      }
    },
    {
      type: "conversation/chat_log/subscribe_index",
    }
  );
};
