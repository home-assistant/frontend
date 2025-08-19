import { mdiContentSave } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import type { BlueprintAutomationConfig } from "../../../data/automation";
import { fetchBlueprints } from "../../../data/blueprint";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";
import { saveFabStyles } from "./styles";

@customElement("blueprint-automation-editor")
export class HaBlueprintAutomationEditor extends HaBlueprintGenericEditor {
  @property({ attribute: false }) public config!: BlueprintAutomationConfig;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @property({ type: Boolean }) public saving = false;

  @property({ type: Boolean }) public dirty = false;

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

      <ha-fab
        slot="fab"
        class=${this.dirty ? "dirty" : ""}
        .label=${this.hass.localize("ui.panel.config.automation.editor.save")}
        .disabled=${this.saving}
        extended
        @click=${this._saveAutomation}
      >
        <ha-svg-icon slot="icon" .path=${mdiContentSave}></ha-svg-icon>
      </ha-fab>
    `;
  }

  private _saveAutomation() {
    fireEvent(this, "save-automation");
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

  static get styles(): CSSResultGroup {
    return [
      HaBlueprintGenericEditor.styles,
      saveFabStyles,
      css`
        :host {
          position: relative;
          height: 100%;
          min-height: calc(100vh - 85px);
          min-height: calc(100dvh - 85px);
        }
        ha-fab {
          position: fixed;
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
