import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-card";
import "../../components/ha-md-list-item";
import "../../components/ha-switch";
import type { CoreFrontendUserData } from "../../data/frontend";
import { saveFrontendUserData } from "../../data/frontend";
import type { HomeAssistant } from "../../types";

@customElement("ha-entity-id-picker-row")
class EntityIdPickerRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public coreUserData?: CoreFrontendUserData;

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`${this._error
        ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
        : nothing}
      <ha-md-list-item>
        <span slot="headline"
          >${this.hass.localize(
            "ui.panel.profile.entity_id_picker.title"
          )}</span
        >
        <span slot="supporting-text"
          >${this.hass.localize(
            "ui.panel.profile.entity_id_picker.description"
          )}</span
        >
        <ha-switch
          slot="end"
          .checked=${!!this.coreUserData &&
          !!this.coreUserData.showEntityIdPicker}
          .disabled=${this.coreUserData === undefined}
          @change=${this._toggled}
        ></ha-switch>
      </ha-md-list-item>`;
  }

  private async _toggled(ev) {
    try {
      saveFrontendUserData(this.hass.connection, "core", {
        ...this.coreUserData,
        showEntityIdPicker: ev.currentTarget.checked,
      });
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
    ha-alert {
      margin: 0 16px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-picker-row": EntityIdPickerRow;
  }
}
