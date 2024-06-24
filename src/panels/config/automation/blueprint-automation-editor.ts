import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-alert";
import {
  BlueprintAutomationConfig,
  showAutomationEditor,
} from "../../../data/automation";
import { fetchBlueprints, substituteBlueprint } from "../../../data/blueprint";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";
import "../../../components/ha-markdown";

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
        : nothing}
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
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : nothing}
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

  private async _substituteBlueprint(): Promise<void> {
    const substitute = await substituteBlueprint(
      this.hass,
      "automation",
      this.config.use_blueprint.path,
      this.config.use_blueprint.input || {}
    );
    showAutomationEditor({
      alias: this.config.alias,
      description: `${this.config.description ? this.config.description : this._blueprint?.metadata.description} (Originated from blueprint ${this._blueprint?.metadata.name})`,
      ...substitute.substituted_config,
    });
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
