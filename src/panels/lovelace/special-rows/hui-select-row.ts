import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import "@polymer/paper-checkbox/paper-checkbox";
// Not duplicate import, it's for typing
// tslint:disable-next-line
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
import "../components/hui-generic-entity-row";
import { EntityRow, EntityConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-icon";
import { fireEvent } from "../../../common/dom/fire_event";

@customElement("hui-select-row")
class HuiSelectRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        <paper-checkbox
          @click=${this._stopPropagation}
          @change=${this._handleSelect}
        ></paper-checkbox>
      </hui-generic-entity-row>
    `;
  }

  private _handleSelect(ev): void {
    const checkbox = ev.currentTarget as PaperCheckboxElement;
    fireEvent(this, "entity-selection-changed", {
      entity: this._config!.entity,
      selected: checkbox.checked,
    });
  }

  private _stopPropagation(ev): void {
    ev.stopPropagation();
  }

  static get styles(): CSSResult {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-select-row": HuiSelectRow;
  }
}
