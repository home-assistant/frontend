import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { Weekday } from "../../data/translation";
import { HomeAssistant } from "../../types";

@customElement("ha-pick-first-weekday-row")
class FirstWeekdayRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.first_weekday.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.first_weekday.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.first_weekday.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.first_weekday}
          @selected=${this._handleFormatSelection}
        >
          ${Object.values(Weekday).map((day) => {
            const value = this.hass.localize(
              `ui.panel.profile.first_weekday.weekdays.${day}`
            );
            return html`
              <mwc-list-item .value=${day}>
                <span>${value}</span>
              </mwc-list-item>
            `;
          })}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev) {
    fireEvent(this, "hass-first-weekday-select", ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-first-weekday-row": FirstWeekdayRow;
  }
}
