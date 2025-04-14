import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import "../../components/ha-card";
import "../../components/ha-settings-row";
import "../../components/ha-switch";
import type { CoreFrontendUserData } from "../../data/frontend";
import { getOptimisticFrontendUserDataCollection } from "../../data/frontend";
import type { HomeAssistant } from "../../types";

@customElement("ha-entity-id-picker-row")
class EntityIdPickerRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public coreUserData?: CoreFrontendUserData;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading"> Display entity IDs in picker </span>
        <span slot="description">
          Shows the full entity IDs when selecting items
        </span>
        <ha-switch
          .checked=${this.coreUserData && this.coreUserData.showEntityIdPicker}
          .disabled=${this.coreUserData === undefined}
          @change=${this._advancedToggled}
        ></ha-switch>
      </ha-settings-row>
    `;
  }

  private async _advancedToggled(ev) {
    getOptimisticFrontendUserDataCollection(this.hass.connection, "core").save({
      ...this.coreUserData,
      showEntityIdPicker: ev.currentTarget.checked,
    });
  }

  static styles = css`
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-entity-id-picker-row": EntityIdPickerRow;
  }
}
