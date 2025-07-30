import type { HassEntity } from "home-assistant-js-websocket";
import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import type { BlueprintAutomationConfig } from "../../../data/automation";
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
      ${this.stateObj?.state === "off"
        ? html`
            <ha-alert alert-type="info">
              ${this.hass.localize(
                "ui.panel.config.automation.editor.disabled"
              )}
              <ha-button
                appearance="plain"
                size="small"
                slot="action"
                @click=${this._enable}
              >
                ${this.hass.localize(
                  "ui.panel.config.automation.editor.enable"
                )}
              </ha-button>
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
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
