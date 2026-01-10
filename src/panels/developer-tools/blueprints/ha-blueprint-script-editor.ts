import { html } from "lit";
import { customElement, state } from "lit/decorators";
import { HaBlueprintGenericEditor } from "./ha-blueprint-generic-editor";
import type {
  Blueprint,
  BlueprintDomain,
  ScriptBlueprint,
} from "../../../data/blueprint";
import "../../config/script/manual-script-editor";

@customElement("ha-blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @state() protected _blueprint: ScriptBlueprint | undefined;

  public static defaultConfig: Blueprint = {
    metadata: {
      name: "",
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
    if (config.blueprint) {
      config.metadata = config.blueprint;
    }

    return config as Blueprint;
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
        @resize-sidebar=${this._resizeSidebar}
        @open-sidebar=${this._openSidebar}
        @close-sidebar=${this._closeSidebar}
      ></manual-script-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
