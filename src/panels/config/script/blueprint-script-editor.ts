import { html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-alert";
import { BlueprintScriptConfig } from "../../../data/script";
import { fetchBlueprints } from "../../../data/blueprint";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";

@customElement("blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @property({ attribute: false }) public config!: BlueprintScriptConfig;

  protected get _config(): BlueprintScriptConfig {
    return this.config;
  }

  protected render() {
    return html`
      ${this.disabled
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.config.script.editor.read_only")}
            <mwc-button slot="action" @click=${this._duplicate}>
              ${this.hass.localize("ui.panel.config.script.editor.migrate")}
            </mwc-button>
          </ha-alert>`
        : ""}
      ${this.renderCard()}
    `;
  }

  protected async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "script");
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
