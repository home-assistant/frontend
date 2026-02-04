import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { formatNumber } from "../../common/number/format_number";
import "../../components/ha-card";
import "../../components/ha-select";
import "../../components/ha-settings-row";
import { NumberFormat } from "../../data/translation";
import type { HomeAssistant } from "../../types";

@customElement("ha-pick-number-format-row")
class NumberFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.number_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.number_format.description")}
        </span>
        <ha-select
          .label=${this.hass.localize(
            "ui.panel.profile.number_format.dropdown_label"
          )}
          .disabled=${this.hass.locale === undefined}
          .value=${this.hass.locale.number_format}
          @selected=${this._handleFormatSelection}
          .options=${Object.values(NumberFormat).map((format) => {
            const label = this.hass.localize(
              `ui.panel.profile.number_format.formats.${format}`
            );
            return {
              value: format,
              label,
              secondary:
                label.slice(label.length - 2) !== "89"
                  ? formatNumber(1234567.89, {
                      ...this.hass.locale,
                      number_format: format,
                    })
                  : undefined,
            };
          })}
        >
        </ha-select>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev: CustomEvent<{ value: string }>) {
    fireEvent(
      this,
      "hass-number-format-select",
      ev.detail.value as NumberFormat
    );
  }

  static styles = css`
    ha-select {
      display: block;
      width: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-number-format-row": NumberFormatRow;
  }
}
