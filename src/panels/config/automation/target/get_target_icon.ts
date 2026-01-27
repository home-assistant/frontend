import { mdiLabel, mdiTextureBox } from "@mdi/js";
import { html, nothing, type TemplateResult } from "lit";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon";
import "../../../../components/ha-state-icon";
import "../../../../components/ha-svg-icon";
import type { ConfigEntry } from "../../../../data/config_entries";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import type { HomeAssistant } from "../../../../types";

export const getTargetIcon = (
  hass: HomeAssistant,
  targetType: string,
  targetId: string | undefined,
  configEntryLookup: Record<string, ConfigEntry>,
  getLabel?: (id: string) => LabelRegistryEntry | undefined
): TemplateResult | typeof nothing => {
  if (!targetId) {
    return nothing;
  }

  if (targetType === "floor" && hass.floors[targetId]) {
    return html`<ha-floor-icon
      .floor=${hass.floors[targetId]}
    ></ha-floor-icon>`;
  }

  if (targetType === "area") {
    const area = hass.areas[targetId];
    if (area?.icon) {
      return html`<ha-icon .icon=${area.icon}></ha-icon>`;
    }
    return html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`;
  }

  if (targetType === "device" && hass.devices[targetId]) {
    const device = hass.devices[targetId];
    const configEntry = device.primary_config_entry
      ? configEntryLookup[device.primary_config_entry]
      : undefined;
    const domain = configEntry?.domain;

    if (domain) {
      return html`<ha-domain-icon
        .hass=${hass}
        .domain=${domain}
        brand-fallback
      ></ha-domain-icon>`;
    }
  }

  if (targetType === "entity" && hass.states[targetId]) {
    return html`<ha-state-icon
      .hass=${hass}
      .stateObj=${hass.states[targetId]}
    ></ha-state-icon>`;
  }

  if (targetType === "label" && getLabel) {
    const label = getLabel(targetId);
    if (label?.icon) {
      return html`<ha-icon .icon=${label.icon}></ha-icon>`;
    }
    return html`<ha-svg-icon .path=${mdiLabel}></ha-svg-icon>`;
  }

  return nothing;
};
