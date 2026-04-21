import { mdiContentSave } from "@mdi/js";
import { css, html, nothing, type CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-markdown";
import { fetchBlueprints } from "../../../data/blueprint";
import type { BlueprintScriptConfig } from "../../../data/script";
import { saveFabStyles } from "../automation/styles";
import { HaBlueprintGenericEditor } from "../blueprint/blueprint-generic-editor";

@customElement("blueprint-script-editor")
export class HaBlueprintScriptEditor extends HaBlueprintGenericEditor {
  @property({ attribute: false }) public config!: BlueprintScriptConfig;

  @property({ type: Boolean }) public saving = false;

  @property({ type: Boolean }) public dirty = false;

  protected get _config(): BlueprintScriptConfig {
    return this.config;
  }

  protected render() {
    return html`
      ${this.config.description
        ? html`<ha-markdown
            class="description"
            breaks
            .content=${this.config.description}
          ></ha-markdown>`
        : nothing}
      ${this.renderCard()}

      <ha-button
        slot="fab"
        size="large"
        class=${this.dirty ? "dirty" : ""}
        .disabled=${this.saving}
        @click=${this._saveScript}
      >
        <ha-svg-icon slot="start" .path=${mdiContentSave}></ha-svg-icon>
        ${this.hass.localize("ui.common.save")}
      </ha-button>
    `;
  }

  private _saveScript() {
    fireEvent(this, "save-script");
  }

  protected async _getBlueprints() {
    this._blueprints = await fetchBlueprints(this.hass, "script");
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
        ha-button[slot="fab"] {
          position: fixed;
          --ha-button-box-shadow: var(--ha-box-shadow-l);
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "blueprint-script-editor": HaBlueprintScriptEditor;
  }
}
