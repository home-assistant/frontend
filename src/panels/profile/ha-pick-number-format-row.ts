import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../components/ha-card";
import "../../components/ha-paper-dropdown-menu";
import {
  CoreFrontendUserData,
  getOptimisticFrontendUserDataCollection,
  NumberFormat,
} from "../../data/frontend";
import { HomeAssistant } from "../../types";
import "../../components/ha-settings-row";
import { formatNumber } from "../../common/string/format_number";

@customElement("ha-pick-number-format-row")
class NumberFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public coreUserData: CoreFrontendUserData | null | undefined;

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          ${this.hass.localize("ui.panel.profile.number_format.header")}
        </span>
        <span slot="description">
          ${this.hass.localize("ui.panel.profile.number_format.description")}
          ${formatNumber(1234567.89, {
            language: this.hass.language,
            format: this.coreUserData?.numberFormat,
          })}
        </span>
        <ha-paper-dropdown-menu
          label="Number Format"
          dynamic-align
          .disabled=${this.coreUserData === undefined}
        >
          <paper-listbox
            slot="dropdown-content"
            .selected=${this.coreUserData?.numberFormat}
            @iron-select=${this._handleFormatSelection}
            attr-for-selected="format"
          >
            <paper-item .format=${NumberFormat.auto}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.auto"
              )}</paper-item
            >
            <paper-item .format=${NumberFormat.system}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.system"
              )}</paper-item
            >
            <paper-item .format=${NumberFormat.comma_decimal}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.comma_decimal"
              )}</paper-item
            >
            <paper-item .format=${NumberFormat.decimal_comma}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.decimal_comma"
              )}</paper-item
            >
            <paper-item .format=${NumberFormat.space_comma}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.space_comma"
              )}</paper-item
            >
            <paper-item .format=${NumberFormat.none}
              >${this.hass.localize(
                "ui.panel.profile.number_format.formats.none"
              )}</paper-item
            >
          </paper-listbox>
        </ha-paper-dropdown-menu>
      </ha-settings-row>
    `;
  }

  private async _handleFormatSelection(ev: CustomEvent) {
    getOptimisticFrontendUserDataCollection(this.hass.connection, "core").save({
      ...this.coreUserData,
      numberFormat: ev.detail.item.format,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-number-format-row": NumberFormatRow;
  }
}
