import type { AutomationAiMention } from "./automation-ai-agent";

// A mention is kept in the text as `@[label](key:id)` and shown as a chip
export const MENTION_SOURCE = String.raw`@\[([^\]\n]*)\]\(([a-z_]+):([^)\n]+)\)`;

/** The text of a mention in the prompt. */
export const mentionText = (mention: AutomationAiMention) =>
  `@[${mention.label.replace(/[[\]\n]/g, "")}](${mention.key}:${mention.id})`;

/** The mentions in a prompt, each one once. */
export const promptMentions = (prompt: string): AutomationAiMention[] => {
  const mentions = new Map<string, AutomationAiMention>();
  for (const match of prompt.matchAll(new RegExp(MENTION_SOURCE, "g"))) {
    mentions.set(`${match[2]}:${match[3]}`, {
      label: match[1],
      key: match[2],
      id: match[3],
    });
  }
  return [...mentions.values()];
};

/** A prompt with its mentions as `@label`, as people and the AI read it. */
export const promptText = (prompt: string) =>
  prompt.replace(new RegExp(MENTION_SOURCE, "g"), "@$1");

/** A prompt split into text and mentions, to show it. */
export const promptParts = (prompt: string) => {
  const parts: (string | AutomationAiMention)[] = [];
  let index = 0;
  for (const match of prompt.matchAll(new RegExp(MENTION_SOURCE, "g"))) {
    parts.push(prompt.slice(index, match.index));
    parts.push({ label: match[1], key: match[2], id: match[3] });
    index = match.index + match[0].length;
  }
  parts.push(prompt.slice(index));
  return parts.filter((part) => part !== "");
};
