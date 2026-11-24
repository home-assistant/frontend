import { dump, load } from "js-yaml";
import type { AITaskStructure } from "../../../../data/ai_task";
import { ensureArray } from "../../../../common/array/ensure-array";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { generateDataAITask } from "../../../../data/ai_task";
import type {
  ConditionDescription,
  ConditionDescriptions,
} from "../../../../data/condition";
import { subscribeConditions } from "../../../../data/condition";
import type {
  TriggerDescription,
  TriggerDescriptions,
} from "../../../../data/trigger";
import { subscribeTriggers } from "../../../../data/trigger";
import type { AutomationConfig } from "../../../../data/automation";
import { normalizeAutomationConfig } from "../../../../data/automation";
import type { ScriptConfig } from "../../../../data/script";
import { normalizeScriptConfig } from "../../../../data/script";
import type { ChatLog } from "../../../../data/chat_log";
import { subscribeChatLog } from "../../../../data/chat_log";
import { validateConfig } from "../../../../data/config";
import type { HomeAssistant } from "../../../../types";

/** What the AI edits, in the automation or the script editor. */
export type AiEditorKind = "automation" | "script";

export type AiEditorConfig = AutomationConfig | ScriptConfig;

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

/** A target the user put into the prompt as `@label`. */
export interface AutomationAiMention {
  label: string;
  /** The target key it belongs to, like `entity_id` or `area_id`. */
  key: string;
  id: string;
}

/** A request the user made in the sheet and what the AI answered. */
export interface AutomationAiTurn {
  prompt: string;
  summary: string;
}

export interface AutomationAiRequest {
  hass: HomeAssistant;
  kind: AiEditorKind;
  /** The config the AI changes. */
  config: AiEditorConfig;
  prompt: string;
  /** Earlier requests of the same session, oldest first. */
  history: AutomationAiTurn[];
  /** Targets the user picked into the prompt. */
  mentions?: AutomationAiMention[];
  onStep: (steps: AutomationAiStep[]) => void;
  onMessages: (messages: AutomationAiMessage[]) => void;
}

export interface AutomationAiResult {
  config: AiEditorConfig;
  summary: string;
  /** Problems the AI could not fix, the user decides whether to keep it. */
  problems: string[];
}

const MAX_FIX_ATTEMPTS = 2;

// Keeps the prompt within what models take for a large home
const MAX_ENTITIES = 1500;

const structure = (kind: AiEditorKind): AITaskStructure => ({
  summary: {
    description:
      "A short message to the user, in their language, saying what you changed and anything they should check. If the request can't be done, say why.",
    required: true,
    selector: { text: { multiline: true } },
  },
  config_yaml: {
    description: `The complete updated ${kind} as YAML, including everything you didn't change.`,
    required: true,
    selector: { text: { multiline: true } },
  },
});

interface GeneratedConfig {
  summary: string;
  config_yaml: string;
}

// What tells an automation and a script apart for the AI
interface KindDescription {
  rules: string[];
  example: Record<string, unknown>;
  /** The parts of the config the backend validates. */
  validate: (
    config: AiEditorConfig
  ) => Partial<Record<"triggers" | "conditions" | "actions", unknown>>;
  normalize: (config: AiEditorConfig) => AiEditorConfig;
  /** Whether the AI needs the trigger platforms. */
  triggers: boolean;
}

const PLATFORM_FIELDS =
  "They take a `target` with `entity_id`, `device_id`, `area_id`, `floor_id` or `label_id`, and their fields go under `options`. Fields marked with * are required, use their default unless the request needs another value.";

const KINDS: Record<AiEditorKind, KindDescription> = {
  automation: {
    rules: [
      "- Use the current syntax: `triggers` with a `trigger` key per trigger, `conditions` with a `condition` key per condition, and `actions` with `action: domain.action_name` for actions.",
      `- Prefer the purpose-specific triggers and conditions listed below, like \`event.received\` or \`light.turned_on\`, over generic \`state\`, \`numeric_state\`, \`template\` or \`device\` ones whenever one fits. ${PLATFORM_FIELDS}`,
      "- Keep the existing alias and description unless the request changes what the automation does. Give a new automation a short alias and description.",
    ],
    example: {
      alias: "Hallway light on motion",
      description: "Turns on the hallway light when motion is detected.",
      mode: "restart",
      triggers: [
        {
          trigger: "event.received",
          target: { device_id: "8d3f0c2a9b7e4c1d" },
          options: { event_type: ["press"] },
        },
      ],
      conditions: [{ condition: "sun", after: "sunset" }],
      actions: [
        {
          action: "light.turn_on",
          target: { area_id: "hallway" },
          data: { brightness_pct: 60 },
        },
      ],
    },
    validate: (config) => {
      const automation = config as AutomationConfig;
      return {
        triggers: automation.triggers ?? [],
        conditions: automation.conditions ?? [],
        actions: automation.actions ?? [],
      };
    },
    normalize: (config) =>
      normalizeAutomationConfig(config as AutomationConfig),
    triggers: true,
  },
  script: {
    rules: [
      "- Use the current syntax: `sequence` with the actions, with `action: domain.action_name` for actions, and `fields` for the inputs the script takes, each with a `name` and a `selector`. Conditions in the sequence have a `condition` key.",
      `- Prefer the purpose-specific conditions listed below over generic \`state\`, \`numeric_state\`, \`template\` or \`device\` ones whenever one fits. ${PLATFORM_FIELDS}`,
      "- Keep the existing alias, description and icon unless the request changes what the script does. Give a new script a short alias and description.",
    ],
    example: {
      alias: "Movie time",
      description: "Dims the living room and closes its blinds.",
      mode: "single",
      fields: {
        brightness: {
          name: "Brightness",
          default: 20,
          selector: {
            number: { min: 0, max: 100, unit_of_measurement: "%" },
          },
        },
      },
      sequence: [
        {
          action: "light.turn_on",
          target: { area_id: "living_room" },
          data: { brightness_pct: "{{ brightness }}" },
        },
        {
          action: "cover.close_cover",
          target: { area_id: "living_room" },
        },
      ],
    },
    validate: (config) => ({
      actions: (config as ScriptConfig).sequence ?? [],
    }),
    normalize: (config) => normalizeScriptConfig(config as ScriptConfig),
    triggers: false,
  },
};

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

const configYaml = (config: AiEditorConfig): string => {
  // Only automations have an id in their config
  const { id: _id, ...rest } = config as AutomationConfig;
  return dump(rest);
};

const MAX_DEVICES = 500;

// Keeps the list of a field's choices short
const MAX_FIELD_OPTIONS = 12;

const describeDevices = (hass: HomeAssistant): string =>
  Object.values(hass.devices)
    .slice(0, MAX_DEVICES)
    .map((device) => {
      const area = device.area_id
        ? hass.areas[device.area_id]?.name
        : undefined;
      return [
        device.id,
        computeDeviceName(device) ?? device.id,
        area ? `area: ${area}` : undefined,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");

type PlatformDescriptions = Record<
  string,
  TriggerDescription | ConditionDescription
>;

const describeTarget = (target: TriggerDescription["target"]): string => {
  const domains = ensureArray(target?.entity ?? [])
    .flatMap((filter) => ensureArray(filter.domain ?? []))
    .filter((domain, index, all) => all.indexOf(domain) === index);
  return domains.length ? `target (${domains.join(", ")})` : "target";
};

const describeField = (
  name: string,
  field: TriggerDescription["fields"][string]
): string => {
  const selector = field.selector ?? {};
  const type = Object.keys(selector)[0];
  const select = "select" in selector ? selector.select : undefined;
  const choices = select?.options
    ?.slice(0, MAX_FIELD_OPTIONS)
    .map((option) => (typeof option === "string" ? option : option.value));
  const details = [
    choices?.length ? choices.join("|") : type,
    field.default !== undefined
      ? `default: ${JSON.stringify(field.default)}`
      : undefined,
  ].filter(Boolean);
  return `${name}${field.required ? "*" : ""}${
    details.length ? ` (${details.join(", ")})` : ""
  }`;
};

/**
 * The trigger or condition platforms, for the domains of the home and the
 * ones without a domain, like `state`.
 */
const describePlatforms = (
  hass: HomeAssistant,
  descriptions: PlatformDescriptions
): string => {
  const domains = new Set(Object.keys(hass.states).map(computeDomain));
  return Object.entries(descriptions)
    .filter(([key]) => !key.includes(".") || domains.has(computeDomain(key)))
    .map(([key, description]) => {
      const fields = Object.entries(description.fields ?? {}).map(
        ([name, field]) => describeField(name, field)
      );
      return [
        `- ${key}`,
        description.target ? describeTarget(description.target) : undefined,
        fields.length ? `options: ${fields.join(", ")}` : undefined,
      ]
        .filter(Boolean)
        .join("; ");
    })
    .join("\n");
};

// Reads the first message of a subscription, or nothing if the backend
// doesn't support it
const firstMessage = async <T>(
  subscribe: (callback: (value: T) => void) => Promise<() => void>
): Promise<T | undefined> => {
  let resolveValue!: (value: T | undefined) => void;
  const value = new Promise<T | undefined>((resolve) => {
    resolveValue = resolve;
  });
  try {
    const unsubscribe = await subscribe(resolveValue);
    try {
      return await value;
    } finally {
      unsubscribe();
    }
  } catch {
    return undefined;
  }
};

interface AutomationAiContext {
  triggers?: TriggerDescriptions;
  conditions?: ConditionDescriptions;
}

const fetchContext = async (
  hass: HomeAssistant,
  kind: AiEditorKind
): Promise<AutomationAiContext> => {
  const [triggers, conditions] = await Promise.all([
    KINDS[kind].triggers
      ? firstMessage<TriggerDescriptions>((callback) =>
          subscribeTriggers(hass.connection, callback)
        )
      : undefined,
    firstMessage<ConditionDescriptions>((callback) =>
      subscribeConditions(hass.connection, callback)
    ),
  ]);
  return { triggers, conditions };
};

const buildInstructions = (
  request: AutomationAiRequest,
  context: AutomationAiContext
): string => {
  const { hass, kind, config, prompt, history, mentions } = request;
  const [syntax, platforms, keep] = KINDS[kind].rules;
  return [
    `You edit a Home Assistant ${kind} in the ${kind} editor for the user. Apply the user's request to the current ${kind} and return the complete updated ${kind}.`,
    "",
    "Rules:",
    `- Return the whole ${kind} as YAML, including the parts you didn't change. Keep unchanged parts exactly as they are, in the same order, so the user only reviews what you changed.`,
    syntax,
    "- Only use entities, devices, areas and actions from the lists below.",
    platforms,
    "- When the user refers to a device, area, floor or label, put it in the `target` instead of listing its entities.",
    keep,
    "- Don't include an `id`.",
    `- Write the summary in the language with the code "${hass.language}".`,
    "",
    "Example:",
    "```yaml",
    dump(KINDS[kind].example).trim(),
    "```",
    "",
    ...(history.length
      ? [
          `Earlier requests in this session, which the current ${kind} already includes, unless the user changed it since:`,
          ...history.map(
            (turn) =>
              `- Request: ${turn.prompt}\n  Your answer: ${turn.summary}`
          ),
          "",
        ]
      : []),
    `Current ${kind}:`,
    "```yaml",
    configYaml(config).trim(),
    "```",
    "",
    "Areas (area_id | name):",
    describeAreas(hass),
    "",
    "Devices (device_id | name | area):",
    describeDevices(hass),
    "",
    "Entities (entity_id | name | area):",
    describeEntities(hass),
    "",
    ...(context.triggers
      ? [
          "Purpose-specific triggers:",
          describePlatforms(hass, context.triggers),
          "",
        ]
      : []),
    ...(context.conditions
      ? [
          "Purpose-specific conditions:",
          describePlatforms(hass, context.conditions),
          "",
        ]
      : []),
    "Actions by domain:",
    describeActions(hass),
    "",
    ...(mentions?.length
      ? [
          "Targets the user referenced in the request with @:",
          ...mentions.map(
            (mention) => `- @${mention.label}: ${mention.key} ${mention.id}`
          ),
          "",
        ]
      : []),
    "Request of the user:",
    prompt,
  ].join("\n");
};

const buildFixInstructions = (
  kind: AiEditorKind,
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
    `Your previous ${kind}:`,
    "```yaml",
    answer.trim(),
    "```",
    "",
    `Fix the problems and return the complete ${kind} again.`,
  ].join("\n");

const stripCodeFence = (yaml: string): string =>
  yaml
    .trim()
    .replace(/^```(?:ya?ml)?\s*\n/i, "")
    .replace(/\n```\s*$/, "");

/** Parses and checks a generated config, returning its problems. */
const checkConfig = async (
  hass: HomeAssistant,
  kind: AiEditorKind,
  yaml: string,
  id: string | undefined
): Promise<{ config?: AiEditorConfig; problems: string[] }> => {
  let parsed: unknown;
  try {
    parsed = load(stripCodeFence(yaml));
  } catch (err) {
    return { problems: [`The YAML is invalid: ${(err as Error).message}`] };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { problems: [`The YAML is not a ${kind}.`] };
  }
  const { id: _id, ...rest } = parsed as AutomationConfig;
  const config = KINDS[kind].normalize({
    ...(id ? { id } : {}),
    ...rest,
  } as AiEditorConfig);

  const validation = await validateConfig(hass, KINDS[kind].validate(config));
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
 * Asks the AI task entity for data generation to change an automation or a
 * script. It checks the answer with the validation of the backend and lets
 * the AI fix the problems it finds.
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

  const generate = async (instructions: string): Promise<GeneratedConfig> => {
    const result = await generateDataAITask<GeneratedConfig>(hass.callService, {
      task_name: `frontend__${request.kind}__edit`,
      instructions,
      structure: structure(request.kind),
    });
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
  const instructions = buildInstructions(
    request,
    await fetchContext(hass, request.kind)
  );
  setStep({ type: "context", status: "done" });

  setStep({ type: "generate", status: "running" });
  let answer = await generate(instructions);
  setStep({ type: "generate", status: "done" });

  for (let attempt = 0; ; attempt++) {
    setStep({ type: "validate", status: "running" });
    // eslint-disable-next-line no-await-in-loop
    const { config, problems } = await checkConfig(
      hass,
      request.kind,
      answer.config_yaml,
      (request.config as AutomationConfig).id
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
      buildFixInstructions(
        request.kind,
        instructions,
        answer.config_yaml,
        problems
      )
    );
    setStep({ type: "fix", status: "done", problems: problems.length });
  }
};
