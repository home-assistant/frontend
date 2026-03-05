import { html, nothing } from "lit";
import type { HomeAssistant } from "../../../../types";
import type { DataTableColumnData } from "../../../../components/data-table/ha-data-table";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "./expose-assistant-icon";

export function getAssistantsTableColumn<T>(
  localize: LocalizeFunc,
  hass: HomeAssistant,
  availableAssistants: string[],
  entitiesToCheck?: any[],
  supportedEntities?: Record<
    "cloud.google_assistant" | "cloud.alexa" | "conversation",
    string[] | undefined
  >,
  visible?: boolean
): DataTableColumnData<T> {
  return {
    title: localize("ui.panel.config.generic.headers.assistants"),
    type: "flex",
    defaultHidden: !visible,
    sortable: true,
    showNarrow: true,
    minWidth: "160px",
    maxWidth: "160px",
    valueColumn: "assistants_sortable_key",
    template: (entry: any) =>
      html`${entry.assistants.length !== 0
        ? html`<div style="display: flex; gap: var(--ha-space-4);">
            ${availableAssistants.map((vaId) => {
              const supported =
                !supportedEntities?.[vaId] ||
                supportedEntities[vaId].includes(entry.entity_id);
              const manual = entry.manAssistants?.includes(vaId);
              return getAssistantsTableColumnIcon(
                entry.entity_id,
                entry.assistants.includes(vaId),
                vaId,
                hass,
                entitiesToCheck,
                manual,
                !supported
              );
            })}
          </div>`
        : nothing}`,
  };
}

export const getAssistantsTableColumnIcon = (
  id: string,
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
        .id=${id}
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
): string | undefined => {
  let result = 0;
  if (!entityAssistants.length) {
    return undefined;
  }
  const assistantsOrdered = [
    "conversation",
    "cloud.alexa",
    "cloud.google_assistant",
  ];
  assistantsOrdered.forEach((vaId, index) => {
    if (entityAssistants.includes(vaId)) {
      result += 2 ** index;
    }
  });
  if (result === 3) {
    result = 4;
  } else if (result === 4) {
    result = 3;
  }
  return `${result}`;
};
