// @ts-ignore
import chipStyles from "@material/chips/dist/mdc.chips.min.css";
import { mdiUnfoldMoreVertical, mdiClose } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  TemplateResult,
  unsafeCSS,
} from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { HomeAssistant } from "../types";
import "@polymer/paper-tooltip/paper-tooltip";
import "./ha-icon-button";
import "./ha-state-icon";
import { fireEvent } from "../common/dom/fire_event";

@customElement("ha-target-chip")
export class HaTargetChip extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public type: "entity_id" | "area_id" | "device_id" = "entity_id";

  @property() public name!: string;

  @property() public iconPath?: string;

  @property({ attribute: false }) public entityState?: HassEntity;

  @property({ type: Boolean }) public canExpand = false;

  @property({ type: Boolean }) public canRemove = false;

  @property({ type: Boolean }) public noClick = false;

  @property({ type: Boolean }) public filled = false;

  protected render(): TemplateResult {
    return html`
      <div
        class="mdc-chip ${classMap({
          [this.type]: true,
          filled: this.filled,
          noClick: this.noClick,
        })}"
      >
        ${this.iconPath
          ? html`<ha-svg-icon
              class="mdc-chip__icon mdc-chip__icon--leading"
              .path=${this.iconPath}
            ></ha-svg-icon>`
          : ""}
        ${this.entityState
          ? html`<ha-state-icon
              class="mdc-chip__icon mdc-chip__icon--leading"
              .state=${this.entityState}
            ></ha-state-icon>`
          : ""}
        ${this.noClick ? "" : html`<div class="mdc-chip__ripple"></div>`}
        <span role="gridcell">
          <span role="button" tabindex="0" class="mdc-chip__primary-action">
            <span class="mdc-chip__text">${this.name}</span>
          </span>
        </span>
        ${this.canExpand && this.type !== "entity_id"
          ? html`<span role="gridcell">
              <ha-icon-button
                class="expand-btn mdc-chip__icon mdc-chip__icon--trailing"
                tabindex="-1"
                role="button"
                .label=${this.hass.localize(
                  "ui.components.target-picker.expand"
                )}
                .path=${mdiUnfoldMoreVertical}
                hideTooltip
                .id=${this.id}
                .type=${this.type}
                @click=${this._handleExpand}
              ></ha-icon-button>
              <paper-tooltip class="expand" animation-delay="0"
                >${this.hass.localize(
                  `ui.components.target-picker.expand_${this.type}`
                )}</paper-tooltip
              >
            </span>`
          : ""}
        ${this.canRemove
          ? html` <span role="gridcell">
              <ha-icon-button
                class="mdc-chip__icon mdc-chip__icon--trailing"
                tabindex="-1"
                role="button"
                .label=${this.hass.localize(
                  "ui.components.target-picker.remove"
                )}
                .path=${mdiClose}
                hideTooltip
                .id=${this.id}
                .type=${this.type}
                @click=${this._handleRemove}
              ></ha-icon-button>
              <paper-tooltip animation-delay="0"
                >${this.hass.localize(
                  `ui.components.target-picker.remove_${this.type}`
                )}</paper-tooltip
              >
            </span>`
          : ""}
      </div>
    `;
  }

  private _handleExpand(ev) {
    const target = ev.currentTarget as any;
    fireEvent(this, "target-expand", { type: target.type, id: target.id });
  }

  private _handleRemove(ev) {
    const target = ev.currentTarget as any;
    fireEvent(this, "target-remove", { type: target.type, id: target.id });
  }

  static get styles(): CSSResultGroup {
    return css`
      ${unsafeCSS(chipStyles)}
      .mdc-chip {
        color: var(--primary-text-color);
      }
      .mdc-chip.filled {
        color: rgba(0, 0, 0, 0.87);
      }
      .mdc-chip.noClick {
        cursor: default;
      }
      .mdc-chip ha-icon-button {
        --mdc-icon-button-size: 24px;
        display: flex;
        align-items: center;
        outline: none;
      }
      .mdc-chip ha-icon-button ha-svg-icon {
        border-radius: 50%;
        background: var(--secondary-text-color);
      }
      .mdc-chip__icon.mdc-chip__icon--trailing {
        width: 16px;
        height: 16px;
        --mdc-icon-size: 14px;
        color: var(--secondary-text-color);
        margin-inline-start: 4px !important;
        margin-inline-end: -4px !important;
        direction: var(--direction);
      }
      .mdc-chip__icon--leading {
        display: flex;
        align-items: center;
        justify-content: center;
        --mdc-icon-size: 20px;
        border-radius: 50%;
        padding: 6px;
        margin-left: -14px !important;
        margin-inline-start: -14px !important;
        margin-inline-end: 4px !important;
        direction: var(--direction);
      }
      .expand-btn {
        margin-right: 0;
      }
      .mdc-chip.area_id:not(.filled) {
        border: 2px solid #fed6a4;
        background: var(--card-background-color);
      }
      .mdc-chip.area_id:not(.filled) .mdc-chip__icon--leading,
      .mdc-chip.area_id.filled {
        background: #fed6a4;
      }
      .mdc-chip.device_id:not(.filled) {
        border: 2px solid #a8e1fb;
        background: var(--card-background-color);
      }
      .mdc-chip.device_id:not(.filled) .mdc-chip__icon--leading,
      .mdc-chip.device_id.filled {
        background: #a8e1fb;
      }
      .mdc-chip.entity_id:not(.filled) {
        border: 2px solid #d2e7b9;
        background: var(--card-background-color);
      }
      .mdc-chip.entity_id:not(.filled) .mdc-chip__icon--leading,
      .mdc-chip.entity_id.filled {
        background: #d2e7b9;
      }
      .mdc-chip:hover {
        z-index: 5;
      }
      :host([disabled]) .mdc-chip {
        opacity: var(--light-disabled-opacity);
        pointer-events: none;
      }
    `;
  }
}

declare global {
  interface HASSDomEvents {
    "target-expand": { type: "area_id" | "device_id"; id: string };
    "target-remove": {
      type: "entity_id" | "area_id" | "device_id";
      id: string;
    };
  }
  interface HTMLElementTagNameMap {
    "ha-target-chip": HaTargetChip;
  }
}
