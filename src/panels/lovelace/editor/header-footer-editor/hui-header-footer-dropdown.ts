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
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-paper-dropdown-menu";
import type { HomeAssistant } from "../../../../types";
import { footerElements, headerElements } from "../lovelace-headerfooters";

@customElement("hui-header-footer-dropdown")
export class HuiHeaderFooterDropdown extends LitElement {
  public hass!: HomeAssistant;

  @property() public configValue!: string;

  @property() public value?: string;

  protected render(): TemplateResult {
    return html`
      <ha-paper-dropdown-menu
        label-float
        dynamic-align
        .label=${this.hass.localize(
          `ui.panel.lovelace.editor.header-footer.${this.configValue}`
        )}
      >
        <paper-listbox
          slot="dropdown-content"
          attr-for-selected="item-name"
          .selected=${this.value}
          @selected-changed=${this._headerFooterChanged}
        >
          <paper-item></paper-item>
          ${this.configValue === "header"
            ? headerElements
            : footerElements.map(
                (headerFooter) =>
                  html`
                    <paper-item .itemName=${headerFooter}
                      >${this.hass!.localize(
                        `ui.panel.lovelace.editor.header-footer.types.${headerFooter}.name`
                      )}</paper-item
                    >
                  `
              )}
        </paper-listbox>
      </ha-paper-dropdown-menu>
    `;
  }

  private _headerFooterChanged(ev: CustomEvent): void {
    this.value = ev.detail.value ?? undefined;
    fireEvent(this, "change");
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
      }
      ha-paper-dropdown-menu {
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-header-footer-dropdown": HuiHeaderFooterDropdown;
  }
}
