import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";
import {
  LitElement,
  TemplateResult,
  html,
  property,
  css,
  CSSResult,
  customElement,
} from "lit-element";

import { headerFooters } from "./lovelace-cards";
import { fireEvent } from "../../../common/dom/fire_event";

import type { HomeAssistant } from "../../../types";

import "../../../components/ha-paper-dropdown-menu";

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
          ${headerFooters
            .filter((headerFooter) => headerFooter.isHeader)
            .map(
              (headerFooter) =>
                html`
                  <paper-item .itemName=${headerFooter.type}
                    >${this.hass!.localize(
                      `ui.panel.lovelace.editor.header-footer.${headerFooter.type}.name`
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
