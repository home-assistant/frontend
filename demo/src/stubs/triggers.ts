import type { TriggerDescriptions } from "../../../src/data/trigger";

// Integration-provided triggers the demo serves to the automation editor.
// `event.received` is here because it is how an automation reacts to an event
// entity, such as the infrared command entity of an infrared receiver: the
// editor can only offer it when the backend describes it. Copied from the
// event integration's `triggers.yaml`.
export const demoTriggers: TriggerDescriptions = {
  "event.received": {
    target: { entity: { domain: "event" } },
    fields: {
      event_type: {
        required: true,
        context: { filter_target: "target" },
        selector: {
          state: {
            attribute: "event_type",
            hide_states: ["unavailable", "unknown"],
            multiple: true,
          },
        },
      },
    },
  },
};

// The strings the editor looks up for the triggers above, from the event
// integration's `strings.json`.
export const demoTriggerTranslations: Record<string, string> = {
  "component.event.triggers.received.name": "Event received",
  "component.event.triggers.received.description":
    "Triggers when one or more event entities receive a matching event.",
  "component.event.triggers.received.fields.event_type.name": "Event type",
  "component.event.triggers.received.fields.event_type.description":
    "The event types to trigger on.",
};
