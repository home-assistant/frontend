import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-switch";
import "../../components/item/ha-row-item";
import type { CoreFrontendUserData } from "../../data/frontend";
import { saveFrontendUserData } from "../../data/frontend";
import type { HomeAssistant } from "../../types";

@customElement("ha-negative-numeric-state-color-row")
class NegativeNumericStateColorRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public coreUserData?: CoreFrontendUserData | null;

  @state() private _error?: string;

  protected render(): TemplateResult {
    return html`
      ${
        this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""
      }
      <ha-row-item>
        <span slot="headline">
          ${this.hass.localize(
            "ui.panel.profile.negative_numeric_state_color.header"
          )}
        </span>
        <span slot="supporting-text">
          ${this.hass.localize(
            "ui.panel.profile.negative_numeric_state_color.description"
          )}
        </span>
        <ha-switch
          slot="end"
          haptic
          .checked=${this.coreUserData?.colorNegativeNumericStates === true}
          .disabled=${this.coreUserData === undefined}
          @change=${this._toggled}
        ></ha-switch>
      </ha-row-item>
    `;
  }

  private async _toggled(ev: Event) {
    try {
      const checked = (ev.currentTarget as HTMLElement & { checked: boolean })
        .checked;
      await saveFrontendUserData(this.hass.connection, "core", {
        ...this.coreUserData,
        colorNegativeNumericStates: checked,
      });
      this._error = undefined;
    } catch (err: any) {
      this._error = err.message || err;
    }
  }

  static styles = css`
    ha-alert {
      margin: 0 16px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-negative-numeric-state-color-row": NegativeNumericStateColorRow;
  }
}
