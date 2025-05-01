import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { HaBlueprintGenericEditor } from "./ha-blueprint-generic-editor";
import type {
  Blueprint,
  BlueprintDomain,
  ScriptBlueprint,
} from "../../../data/blueprint";
import "../script/manual-script-editor";

@customElement("ha-blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @state() protected _blueprint: ScriptBlueprint | undefined;

  public static defaultConfig: Blueprint = {
    blueprint: {
      name: "New blueprint",
      domain: "script",
      input: {},
    },
    alias: "",
    sequence: [],
  };

  protected _domain: BlueprintDomain = "script";

  protected getDefaultBlueprint(): Blueprint {
    return HaBlueprintScriptEditor.defaultConfig;
  }

  public normalizeBlueprint(config: Partial<Blueprint>): Blueprint {
    // TODO: Implement this? Is it needed?
    if (config.blueprint) {
      config.metadata = config.blueprint;
    }

    return config as Blueprint;
  }

  public async checkValidation(): Promise<void> {
    // Ignore empty method
  }

  protected renderHeader() {
    return nothing;
  }

  protected renderEditor() {
    return html`
      <manual-script-editor
        .hass=${this.hass}
        .narrow=${this.narrow}
        .isWide=${this.isWide}
        .config=${this._blueprint}
        .disabled=${this._readOnly}
        @value-changed=${this._valueChanged}
      ></manual-script-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
