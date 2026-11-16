import { dump, load } from "js-yaml";
import type { AITaskStructure } from "../../../../data/ai_task";
import { generateDataAITask } from "../../../../data/ai_task";
import type { AutomationConfig } from "../../../../data/automation";
import { normalizeAutomationConfig } from "../../../../data/automation";
import type { ChatLog } from "../../../../data/chat_log";
import { subscribeChatLog } from "../../../../data/chat_log";
import { validateConfig } from "../../../../data/config";
import type { HomeAssistant } from "../../../../types";

/** A step the agent takes, shown to the user while it works. */
export interface AutomationAiStep {
  type: "context" | "generate" | "validate" | "fix";
  status: "running" | "done" | "error";
  /** For `validate` and `fix`, how many problems were found. */
  problems?: number;
}

export interface AutomationAiMessage {
  role: "system" | "user" | "assistant";
  content: string;
  thinking?: string;
}

/** A request the user made in the sheet and what the AI answered. */
export interface AutomationAiTurn {
  prompt: string;
  summary: string;
  /** The user declined the changes, so the automation doesn't include them. */
  declined?: boolean;
}

export interface AutomationAiRequest {
  hass: HomeAssistant;
  /** The config the AI changes. */
  config: AutomationConfig;
  prompt: string;
  /** Earlier requests of the same session, oldest first. */
  history: AutomationAiTurn[];
  onStep: (steps: AutomationAiStep[]) => void;
  onMessages: (messages: AutomationAiMessage[]) => void;
}

export interface AutomationAiResult {
  config: AutomationConfig;
  summary: string;
  /** Problems the AI could not fix, the user decides whether to keep it. */
  problems: string[];
}

const MAX_FIX_ATTEMPTS = 2;

// Keeps the prompt within what models take for a large home
const MAX_ENTITIES = 1500;

const STRUCTURE: AITaskStructure = {
  summary: {
    description:
      "A short message to the user, in their language, saying what you changed and anything they should check. If the request can't be done, say why.",
    required: true,
    selector: { text: { multiline: true } },
  },
  automation_yaml: {
    description:
      "The complete updated automation as YAML, including everything you didn't change.",
    required: true,
    selector: { text: { multiline: true } },
  },
};

interface GeneratedAutomation {
  summary: string;
  automation_yaml: string;
}

const describeEntities = (hass: HomeAssistant): string => {
  const lines = Object.values(hass.states)
    .filter((stateObj) => !hass.entities[stateObj.entity_id]?.hidden)
    .slice(0, MAX_ENTITIES)
    .map((stateObj) => {
      const entry = hass.entities[stateObj.entity_id];
      const areaId =
        entry?.area_id ??
        (entry?.device_id ? hass.devices[entry.device_id]?.area_id : undefined);
      const area = areaId ? hass.areas[areaId]?.name : undefined;
      return [
        stateObj.entity_id,
        stateObj.attributes.friendly_name,
        area ? `area: ${area}` : undefined,
      ]
        .filter(Boolean)
        .join(" | ");
    });
  return lines.join("\n");
};

const describeActions = (hass: HomeAssistant): string =>
  Object.entries(hass.services)
    .map(
      ([domain, services]) => `${domain}: ${Object.keys(services).join(", ")}`
    )
    .join("\n");

const describeAreas = (hass: HomeAssistant): string =>
  Object.values(hass.areas)
    .map((area) => `${area.area_id} | ${area.name}`)
    .join("\n");

const configYaml = (config: AutomationConfig): string => {
  const { id: _id, ...rest } = config;
  return dump(rest);
};

const buildInstructions = (request: AutomationAiRequest): string => {
  const { hass, config, prompt, history } = request;
  return [
    "You edit a Home Assistant automation in the automation editor for the user. Apply the user's request to the current automation and return the complete updated automation.",
    "",
    "Rules:",
    "- Return the whole automation as YAML, including the parts you didn't change. Keep unchanged parts exactly as they are, in the same order, so the user only reviews what you changed.",
    "- Use the current syntax: `triggers` with a `trigger` key per trigger, `conditions` with a `condition` key per condition, and `actions` with `action: domain.action_name` for actions.",
    "- Only use entities, areas and actions from the lists below.",
    "- Keep the existing alias and description unless the request changes what the automation does. Give a new automation a short alias and description.",
    "- Don't include an `id`.",
    `- Write the summary in the language with the code "${hass.language}".`,
    "",
    "Example:",
    "```yaml",
    dump({
      alias: "Hallway light on motion",
      description: "Turns on the hallway light when motion is detected.",
      mode: "restart",
      triggers: [
        {
          trigger: "state",
          entity_id: "binary_sensor.hallway_motion",
          to: "on",
        },
      ],
      conditions: [{ condition: "sun", after: "sunset" }],
      actions: [
        {
          action: "light.turn_on",
          target: { entity_id: "light.hallway" },
          data: { brightness_pct: 60 },
        },
      ],
    }).trim(),
    "```",
    "",
    ...(history.length
      ? [
          "Earlier requests in this session. The current automation includes the changes of the ones not marked as declined:",
          ...history.map(
            (turn) =>
              `- Request: ${turn.prompt}\n  Your answer: ${turn.summary}${
                turn.declined
                  ? "\n  The user declined these changes, so try something else if the request is similar."
                  : ""
              }`
          ),
          "",
        ]
      : []),
    "Current automation:",
    "```yaml",
    configYaml(config).trim(),
    "```",
    "",
    "Areas (area_id | name):",
    describeAreas(hass),
    "",
    "Entities (entity_id | name | area):",
    describeEntities(hass),
    "",
    "Actions by domain:",
    describeActions(hass),
    "",
    "Request of the user:",
    prompt,
  ].join("\n");
};

const buildFixInstructions = (
  instructions: string,
  answer: string,
  problems: string[]
): string =>
  [
    instructions,
    "",
    "Your previous answer had these problems:",
    ...problems.map((problem) => `- ${problem}`),
    "",
    "Your previous automation:",
    "```yaml",
    answer.trim(),
    "```",
    "",
    "Fix the problems and return the complete automation again.",
  ].join("\n");

const stripCodeFence = (yaml: string): string =>
  yaml
    .trim()
    .replace(/^```(?:ya?ml)?\s*\n/i, "")
    .replace(/\n```\s*$/, "");

/** Parses and checks a generated automation, returning its problems. */
const checkAutomation = async (
  hass: HomeAssistant,
  yaml: string,
  id: string | undefined
): Promise<{ config?: AutomationConfig; problems: string[] }> => {
  let parsed: unknown;
  try {
    parsed = load(stripCodeFence(yaml));
  } catch (err) {
    return { problems: [`The YAML is invalid: ${(err as Error).message}`] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { problems: ["The YAML is not an automation."] };
  }
  const { id: _id, ...rest } = parsed as AutomationConfig;
  const config = normalizeAutomationConfig({
    ...(id ? { id } : {}),
    ...rest,
  } as AutomationConfig);

  const validation = await validateConfig(hass, {
    triggers: config.triggers ?? [],
    conditions: config.conditions ?? [],
    actions: config.actions ?? [],
  });
  const problems = Object.entries(validation)
    .filter(([, result]) => !result.valid)
    .map(([key, result]) => `${key}: ${result.error}`);
  return { config, problems };
};

const fetchChatLog = async (
  hass: HomeAssistant,
  conversationId: string
): Promise<ChatLog | undefined> => {
  let resolveChatLog!: (chatLog: ChatLog | undefined) => void;
  const chatLog = new Promise<ChatLog | undefined>((resolve) => {
    resolveChatLog = resolve;
  });
  try {
    const unsubscribe = await subscribeChatLog(hass, conversationId, (log) =>
      resolveChatLog(log ?? undefined)
    );
    try {
      return await chatLog;
    } finally {
      unsubscribe();
    }
  } catch {
    // Only admins can read chat logs, and they expire
    return undefined;
  }
};

const chatLogMessages = (chatLog: ChatLog): AutomationAiMessage[] =>
  chatLog.content
    .filter(
      (content) =>
        content.role === "system" ||
        content.role === "user" ||
        content.role === "assistant"
    )
    .map((content) => ({
      role: content.role as AutomationAiMessage["role"],
      content: content.content ?? "",
      thinking:
        content.role === "assistant" ? content.thinking_content : undefined,
    }))
    .filter((message) => message.content || message.thinking);

/**
 * Asks the AI task entity for data generation to change an automation. It
 * checks the answer with the automation validation of the backend and lets the
 * AI fix the problems it finds.
 */
export const runAutomationAi = async (
  request: AutomationAiRequest
): Promise<AutomationAiResult> => {
  const { hass } = request;
  let steps: AutomationAiStep[] = [];
  let messages: AutomationAiMessage[] = [];

  const setStep = (step: AutomationAiStep) => {
    const last = steps[steps.length - 1];
    steps =
      last && last.type === step.type && last.status === "running"
        ? [...steps.slice(0, -1), step]
        : [...steps, step];
    request.onStep(steps);
  };

  const generate = async (
    instructions: string
  ): Promise<GeneratedAutomation> => {
    const result = await generateDataAITask<GeneratedAutomation>(
      hass.callService,
      {
        task_name: "frontend__automation__edit",
        instructions,
        structure: STRUCTURE,
      }
    );
    const chatLog = await fetchChatLog(hass, result.conversation_id);
    messages = [
      ...messages,
      ...(chatLog
        ? chatLogMessages(chatLog)
        : [
            { role: "user" as const, content: instructions },
            {
              role: "assistant" as const,
              content: dump(result.data),
            },
          ]),
    ];
    request.onMessages(messages);
    return result.data;
  };

  setStep({ type: "context", status: "running" });
  const instructions = buildInstructions(request);
  setStep({ type: "context", status: "done" });

  setStep({ type: "generate", status: "running" });
  let answer = await generate(instructions);
  setStep({ type: "generate", status: "done" });

  for (let attempt = 0; ; attempt++) {
    setStep({ type: "validate", status: "running" });
    // eslint-disable-next-line no-await-in-loop
    const { config, problems } = await checkAutomation(
      hass,
      answer.automation_yaml,
      request.config.id
    );
    setStep({
      type: "validate",
      status: problems.length ? "error" : "done",
      problems: problems.length,
    });

    if (config && (!problems.length || attempt >= MAX_FIX_ATTEMPTS)) {
      return { config, summary: answer.summary, problems };
    }
    if (attempt >= MAX_FIX_ATTEMPTS) {
      throw new Error(problems.join("\n"));
    }

    setStep({ type: "fix", status: "running", problems: problems.length });
    // eslint-disable-next-line no-await-in-loop
    answer = await generate(
      buildFixInstructions(instructions, answer.automation_yaml, problems)
    );
    setStep({ type: "fix", status: "done", problems: problems.length });
  }
};
