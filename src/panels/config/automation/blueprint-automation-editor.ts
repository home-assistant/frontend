import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-alert";
import { BlueprintAutomationConfig } from "../../../data/automation";
import { fetchBlueprints } from "../../../data/blueprint";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";

@customElement("blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends HaBlueprintGenericEditor {
  @property({ attribute: false }) public config!: BlueprintAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  protected get _config(): BlueprintAutomationConfig {
    return this.config;
  }

  protected render() {
    return html`
      ${this.disabled
        ? html`<ha-alert alert-type="warning">
            ${this.hass.localize("ui.panel.config.automation.editor.read_only")}
            <mwc-button slot="action" @click=${this._duplicate}>
              ${this.hass.localize("ui.panel.config.automation.editor.migrate")}
            </mwc-button>
          </ha-alert>`
        : ""}
      ${this.stateObj?.state === "off"
        ? html`
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
              <mwc-button slot="action" @click=${this._enable}>
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.enable"
                )}
              </mwc-button>
            </ha-alert>
          `
        : ""}
      ${this.config.description
        ? html`<p class="description">${this.config.description}</p>`
        : ""}
      ${this.renderCard()}
    `;
  }

  protected async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "automation");
  }

  private async _enable(): Promise<void> {
    if (!this.hass || !this.stateObj) {
      return;
    }
    await this.hass.callService("automation", "turn_on", {
      entity_id: this.stateObj.entity_id,
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
