import { mdiDelete } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { computeEntityPickerDisplay } from "../../../common/entity/compute_entity_name_display";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/state-badge";
import "../../../components/ha-icon-button";
import type { HomeAssistant } from "../../../types";

declare global {
  interface HASSDomEvents {
    "delete-favorite-entity": { index: number };
  }
  interface HTMLElementTagNameMap {
    "home-favorite-entity-list-item": HomeFavoriteEntityListItem;
  }
}

@customElement("home-favorite-entity-list-item")
export class HomeFavoriteEntityListItem extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "entity-id" }) public entityId!: string;

  @property({ type: Number }) public index = 0;

  protected render() {
    const stateObj = this.hass.states[this.entityId];
    const { primary, secondary } = stateObj
      ? computeEntityPickerDisplay(this.hass, stateObj)
      : { primary: this.entityId, secondary: undefined };

    return html`
      <state-badge .hass=${this.hass} .stateObj=${stateObj}></state-badge>
      <div class="text">
        <span class="primary">${primary}</span>
        ${secondary
          ? html`<span class="secondary">${secondary}</span>`
          : nothing}
      </div>
      <ha-icon-button
        .path=${mdiDelete}
        .label=${this.hass.localize("ui.common.delete")}
        @click=${this._delete}
      ></ha-icon-button>
    `;
  }

  private _delete() {
    fireEvent(this, "delete-favorite-entity", { index: this.index });
  }

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--ha-space-3);
    }
    state-badge {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      --state-icon-color: var(--secondary-text-color);
    }
    .text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .primary,
    .secondary {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .primary {
      font-size: 14px;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    ha-icon-button {
      --ha-icon-button-size: 40px;
    }
  `;
}
