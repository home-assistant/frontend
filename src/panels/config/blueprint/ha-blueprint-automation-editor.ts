import { customElement, state } from "lit/decorators";
import { html, nothing } from "lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { HaBlueprintGenericEditor } from "./ha-blueprint-generic-editor";
import type {
  AutomationBlueprint,
  BlueprintConfig,
} from "../../../data/blueprint";
import "../automation/manual-automation-editor";

@customElement("ha-blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends HaBlueprintGenericEditor {
  @state() protected _config: AutomationBlueprint | undefined;

  public static defaultConfig: BlueprintConfig = {
    blueprint: {
      name: "New blueprint",
      domain: "automation",
      input: {},
    },
    triggers: [],
    conditions: [],
    actions: [],
  };

  protected getDefaultConfig(): BlueprintConfig {
    return HaBlueprintAutomationEditor.defaultConfig;
  }

  protected checkValidation(): Promise<void> {
    return Promise.resolve(undefined);
  }

  protected normalizeBlueprintConfig(
    config: Partial<BlueprintConfig>
  ): BlueprintConfig {
    // TODO: Fix this method
    // config = migrateBlueprintConfig(config);

    // Normalize data: ensure triggers, actions and conditions are lists
    // Happens when people copy paste their automations into the config
    for (const key of ["triggers", "conditions", "actions"]) {
      const value = config[key];
      if (value && !Array.isArray(value)) {
        config[key] = [value];
      }
    }

    return config as BlueprintConfig;
  }

  protected renderHeader() {
    return nothing;
  }

  protected renderEditor(stateObj: HassEntity | undefined) {
    if (!this._config) {
      return nothing;
    }

    return html`
      <manual-automation-editor
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .stateObj=${stateObj}
        .config=${this._config}
        .disabled=${Boolean(this._readOnly)}
        @value-changed=${this._valueChanged}
      ></manual-automation-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
