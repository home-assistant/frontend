import "@material/mwc-list/mwc-list-item";
import { html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { formatDateTimeNumeric } from "../../common/datetime/format_date_time";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { TimeZone } from "../../data/translation";
import { HomeAssistant } from "../../types";

@customElement("ha-pick-time-zone-row")
class TimeZoneRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  protected render(): TemplateResult {
    const date = new Date();
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.time_zone.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.time_zone.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.time_zone.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.time_zone}
          @selected=${this._handleFormatSelection}
          naturalMenuWidth
        >
          ${Object.values(TimeZone).map((format) => {
            const formattedTime = formatDateTimeNumeric(
              date,
              {
                ...this.hass.locale,
                time_zone: format,
              },
              this.hass.config
            );
            return html`<mwc-list-item .value=${format} twoline>
              <span
                >${this.hass.localize(
                  `ui.panel.profile.time_zone.options.${format}`,
                  {
                    timezone: (format === "server"
                      ? this.hass.config.time_zone
                      : Intl.DateTimeFormat?.().resolvedOptions?.().timeZone ||
                        ""
                    ).replace("_", " "),
                  }
                )}</span
              >
              <span slot="secondary">${formattedTime}</span>
            </mwc-list-item>`;
          })}
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev) {
    fireEvent(this, "hass-time-zone-select", ev.target.value);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-time-zone-row": TimeZoneRow;
  }
}
