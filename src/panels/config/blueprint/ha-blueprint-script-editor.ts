import { html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { HaBlueprintGenericEditor } from "./ha-blueprint-generic-editor";
import type {
  BlueprintConfig,
  BlueprintDomain,
  ScriptBlueprint,
} from "../../../data/blueprint";
import "../script/manual-script-editor";

@customElement("ha-blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @state() protected _config: ScriptBlueprint | undefined;

  public static defaultConfig: BlueprintConfig = {
    blueprint: {
      name: "New blueprint",
      domain: "script",
      input: {},
    },
    alias: "",
    sequence: [],
  };

  protected _domain: BlueprintDomain = "script";

  protected getDefaultConfig(): BlueprintConfig {
    return HaBlueprintScriptEditor.defaultConfig;
  }

  public normalizeBlueprintConfig(
    config: Partial<BlueprintConfig>
  ): BlueprintConfig {
    // TODO: Implement this? Is it needed?
    return config as BlueprintConfig;
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
        .config=${this._config}
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
