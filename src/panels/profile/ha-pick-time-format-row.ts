import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { formatTime } from "../../common/datetime/format_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { TimeFormat } from "../../data/translation";
import { HomeAssistant } from "../../types";

@customElement("ha-pick-time-format-row")
class TimeFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    const date = new Date();
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.time_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.time_format.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.time_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.time_format}
          @selected=${this._handleFormatSelection}
          naturalMenuWidth
        >
          ${Object.values(TimeFormat).map((format) => {
            const formattedTime = formatTime(
              date,
              {
                ...this.hass.locale,
                time_format: format,
              },
              this.hass.config
            );
            const value = this.hass.localize(
              `ui.panel.profile.time_format.formats.${format}`
            );
            return html`<mwc-list-item .value=${format} twoline>
              <span>${value}</span>
              <span slot="secondary">${formattedTime}</span>
            </mwc-list-item>`;
          })}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev) {
    fireEvent(this, "hass-time-format-select", ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-time-format-row": TimeFormatRow;
  }
}
