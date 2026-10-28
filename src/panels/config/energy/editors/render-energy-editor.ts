import { html, nothing } from "lit";
import type { HomeAssistant } from "../../../../types";
import type { EnergyEditorConfig } from "./energy-editor";
import "./ha-energy-battery-source-editor";
import "./ha-energy-device-editor";
import "./ha-energy-gas-source-editor";
import "./ha-energy-grid-source-editor";
import "./ha-energy-home-source-editor";
import "./ha-energy-solar-source-editor";
import "./ha-energy-water-device-editor";
import "./ha-energy-water-source-editor";

export const renderEnergyEditor = (
  hass: HomeAssistant,
  config: EnergyEditorConfig
) => {
  switch (config.kind) {
    case "grid":
      return html`<ha-energy-grid-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-grid-source-editor>`;
    case "solar":
      return html`<ha-energy-solar-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-solar-source-editor>`;
    case "home":
      return html`<ha-energy-home-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-home-source-editor>`;
    case "battery":
      return html`<ha-energy-battery-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-battery-source-editor>`;
    case "device":
      return html`<ha-energy-device-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-device-editor>`;
    case "gas":
      return html`<ha-energy-gas-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-gas-source-editor>`;
    case "water":
      return html`<ha-energy-water-source-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-water-source-editor>`;
    case "water_device":
      return html`<ha-energy-water-device-editor
        class="editor"
        .hass=${hass}
        .params=${config.params}
      ></ha-energy-water-device-editor>`;
    default:
      return nothing;
  }
};
