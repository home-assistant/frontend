import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
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

@customElement("ha-pick-number-format-row")
class NumberFormatRow extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public coreUserData: CoreFrontendUserData | null | undefined;

  @internalProperty() private _formats: {
    value: string;
    text: string;
  }[] = [
    {
      value: NumberFormat.auto,
      text: "Auto (use language)",
    },
    {
      value: NumberFormat.comma_decimal,
      text: "1,234,567.89",
    },
    {
      value: NumberFormat.decimal_comma,
      text: "1.234.567,89",
    },
    {
      value: NumberFormat.none,
      text: "None",
    },
  ];

  protected render(): TemplateResult {
    return html`
      <ha-settings-row .narrow=${this.narrow}>
        <span slot="heading">
          Number Format
        </span>
        <span slot="description">
          Choose how numbers are formatted. "Auto" uses the language setting to
          determine the formatting.
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
            ${this._formats.map(
              (format) =>
                html`<paper-item .format=${format.value}
                  >${format.text}</paper-item
                >`
            )}
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

  static get styles(): CSSResult {
    return css`
      a {
        color: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-pick-number-format-row": NumberFormatRow;
  }
}
