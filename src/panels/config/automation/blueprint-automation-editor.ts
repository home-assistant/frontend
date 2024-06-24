import "@material/mwc-button/mwc-button";
import { HassEntity } from "home-assistant-js-websocket";
import { html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../common/navigate";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-alert";
import "../../../components/ha-markdown";
import {
  BlueprintAutomationConfig,
  normalizeAutomationConfig,
  showAutomationEditor,
} from "../../../data/automation";
import { fetchBlueprints, substituteBlueprint } from "../../../data/blueprint";
import { showConfirmationDialog } from "../../lovelace/custom-card-helpers";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";
import "./manual-automation-editor";

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

  public async substituteBlueprint(): Promise<void> {
    try {
      const substitute = await substituteBlueprint(
        this.hass,
        "automation",
        this.config.use_blueprint.path,
        this.config.use_blueprint.input || {}
      );

      const config = normalizeAutomationConfig(substitute.substituted_config);

      const convert = await showConfirmationDialog(this, {
        title: "Take control of blueprint automation",
        text: html`<manual-automation-editor
          .hass=${this.hass}
          disabled
          .config=${config}
        ></manual-automation-editor>`,
        confirmText: "Create automation",
      });

      if (convert) {
        if (this.dirty) {
          const confirmed = await showConfirmationDialog(this, {
            title: "Unsaved changes",
            text: "You have unsaved changes. Do you want to continue and lose these changes?",
            confirmText: "Continue",
          });
          if (!confirmed) {
            return;
          }
        }
        while (
          location.pathname === "/config/automation/edit/new" &&
          history.length > 1
        ) {
          history.back();
          // eslint-disable-next-line no-await-in-loop
          await nextRender();
        }
        if (location.pathname === "/config/automation/edit/new") {
          navigate("/config/automation");
          await nextRender();
        }
        showAutomationEditor({
          alias: this.config.alias,
          description: `${this.config.description ? this.config.description : this._blueprint && "metadata" in this._blueprint ? this._blueprint.metadata.description : ""}${this._blueprint && "metadata" in this._blueprint ? `(Originated from blueprint ${this._blueprint?.metadata.name})` : ""}`,
          ...substitute.substituted_config,
        });
      }
    } catch (err: any) {
      alert(`Failed to substitute blueprint: ${err.message}`);
    }
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-automation-editor": HaBlueprintAutomationEditor;
  }
}
