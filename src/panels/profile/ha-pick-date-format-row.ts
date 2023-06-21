import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateNumeric } from "../../common/datetime/format_date";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { DateFormat } from "../../data/translation";
import { HomeAssistant } from "../../types";

@customElement("ha-pick-date-format-row")
class DateFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    const date = new Date();
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.date_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.date_format.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.date_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.date_format}
          @selected=${this._handleFormatSelection}
          naturalMenuWidth
        >
          ${Object.values(DateFormat).map((format) => {
            const formattedDate = formatDateNumeric(
              date,
              {
                ...this.hass.locale,
                date_format: format,
              },
              this.hass.config
            );
            const value = this.hass.localize(
              `ui.panel.profile.date_format.formats.${format}`
            );
            return html`<mwc-list-item .value=${format} twoline>
              <span>${value}</span>
              <span slot="secondary">${formattedDate}</span>
            </mwc-list-item>`;
          })}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev) {
    fireEvent(this, "hass-date-format-select", ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-date-format-row": DateFormatRow;
  }
}
