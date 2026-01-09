import { html, nothing } from "lit";
import type { HomeAssistant } from "../../../../types";
import type { DataTableColumnData } from "../../../../components/data-table/ha-data-table";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "./expose-assistant-icon";

export const getAssistantsTableColumn = (
  localize: LocalizeFunc,
  hass: HomeAssistant,
  availableAssistants: string[],
  entitiesToCheck?: any[]
): DataTableColumnData => ({
  title: localize("ui.panel.config.voice_assistants.expose.headers.assistants"),
  type: "flex",
  defaultHidden: true,
  sortable: true,
  minWidth: "160px",
  maxWidth: "160px",
  template: (entry) =>
    entry.assistants.length !== 0
      ? availableAssistants.map((vaKey) => {
          const manual = false;
          const supported = true;
          return getAssistantsTableColumnIcon(
            entry.assistants.includes(vaKey),
            vaKey,
            hass,
            manual,
            !supported,
            entitiesToCheck
          );
        })
      : nothing,
});

export const getAssistantsTableColumnIcon = (
  show: boolean,
  vaKey: string,
  hass: HomeAssistant,
  manual: boolean,
  unsupported: boolean,
  entitiesToCheck?: any[]
) => {
  const preserveSpacing = entitiesToCheck?.some((entry) =>
    entry.assistants.includes(vaKey)
  );
  return show
    ? html`<voice-assistants-expose-assistant-icon
        .assistant=${vaKey}
        .hass=${hass}
        .manual=${manual}
        .unsupported=${unsupported}
      ></voice-assistants-expose-assistant-icon>`
    : preserveSpacing
      ? html`<div style="width: 40px;"></div>`
      : nothing;
};
