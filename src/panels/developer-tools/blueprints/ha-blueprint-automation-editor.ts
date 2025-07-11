import { customElement, state } from "lit/decorators";
import { html, nothing } from "lit";
import { HaBlueprintGenericEditor } from "./ha-blueprint-generic-editor";
import type {
  AutomationBlueprint,
  Blueprint,
  BlueprintDomain,
} from "../../../data/blueprint";
import "../../config/automation/manual-automation-editor";

@customElement("ha-blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends HaBlueprintGenericEditor {
  @state() protected _blueprint: AutomationBlueprint | undefined;

  public static defaultConfig: Blueprint = {
    metadata: {
      name: "New blueprint",
      domain: "automation",
      input: {},
    },
    triggers: [],
    conditions: [],
    actions: [],
  };

  protected _domain: BlueprintDomain = "automation";

  protected getDefaultBlueprint(): Blueprint {
    return HaBlueprintAutomationEditor.defaultConfig;
  }

  protected normalizeBlueprint(config: Partial<Blueprint>): Blueprint {
    // Normalize data: ensure triggers, actions and conditions are lists
    // Happens when people copy paste their automations into the config
    for (const key of ["triggers", "conditions", "actions"]) {
      const value = config[key];
      if (value && !Array.isArray(value)) {
        config[key] = [value];
      }
    }

    if (config.blueprint) {
      config.metadata = config.blueprint;
    }

    return config as Blueprint;
  }

  protected renderHeader() {
    return nothing;
  }

  protected renderEditor() {
    if (!this._blueprint) {
      return nothing;
    }

    return html`
      <manual-automation-editor
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .config=${this._blueprint}
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
