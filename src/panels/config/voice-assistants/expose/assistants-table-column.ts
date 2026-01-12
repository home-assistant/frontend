import { html, nothing } from "lit";
import type { HomeAssistant } from "../../../../types";
import type { DataTableColumnData } from "../../../../components/data-table/ha-data-table";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "./expose-assistant-icon";

export const getAssistantsTableColumn = (
  localize: LocalizeFunc,
  hass: HomeAssistant,
  availableAssistants: string[],
  entitiesToCheck?: any[],
  supportedEntities?: Record<
    "cloud.google_assistant" | "cloud.alexa" | "conversation",
    string[] | undefined
  >
): DataTableColumnData => ({
  title: localize("ui.panel.config.voice_assistants.expose.headers.assistants"),
  type: "flex",
  defaultHidden: true,
  sortable: true,
  minWidth: "160px",
  maxWidth: "160px",
  valueColumn: "assistants_sortable_key",
  template: (entry) =>
    html`${entry.assistants.length !== 0
      ? availableAssistants.map((vaId) => {
          const supported =
            !supportedEntities?.[vaId] ||
            supportedEntities[vaId].includes(entry.entity_id);
          const manual = entry.manAssistants?.includes(vaId);
          return getAssistantsTableColumnIcon(
            entry.assistants.includes(vaId),
            vaId,
            hass,
            entitiesToCheck,
            manual,
            !supported
          );
        })
      : nothing}`,
});

export const getAssistantsTableColumnIcon = (
  show: boolean,
  vaId: string,
  hass: HomeAssistant,
  entitiesToCheck?: any[],
  manual?: boolean,
  unsupported?: boolean
) => {
  const preserveSpacing = entitiesToCheck?.some((entry) =>
    entry.assistants!.includes(vaId)
  );
  return show
    ? html`<voice-assistants-expose-assistant-icon
        .assistant=${vaId}
        .hass=${hass}
        .manual=${manual ?? false}
        .unsupported=${unsupported ?? false}
      ></voice-assistants-expose-assistant-icon>`
    : preserveSpacing
      ? html`<div style="width: 40px;"></div>`
      : nothing;
};

export const getAssistantsSortableKey = (
  entityAssistants: string[]
): number | undefined => {
  let result = 0;
  if (!entityAssistants.length) return undefined;
  const assistantsOrdered = [
    "conversation",
    "cloud.alexa",
    "cloud.google_assistant",
  ];
  assistantsOrdered.forEach((vaId) => {
    if (entityAssistants.includes(vaId)) {
      const weight = assistantsOrdered.indexOf(vaId);
      result += 2 ** weight;
    }
  });
  if (result === 3) result = 4;
  else if (result === 4) result = 3;
  return result;
};
