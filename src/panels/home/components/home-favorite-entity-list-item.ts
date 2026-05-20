import { mdiDelete } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { computeEntityPickerDisplay } from "../../../common/entity/compute_entity_name_display";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/entity/state-badge";
import "../../../components/ha-icon-button";
import "../../../components/ha-settings-row";
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
      <ha-settings-row slim>
        <state-badge
          slot="prefix"
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></state-badge>
        <span slot="heading">${primary}</span>
        ${secondary
          ? html`<span slot="description">${secondary}</span>`
          : nothing}
        <ha-icon-button
          .path=${mdiDelete}
          .label=${this.hass.localize("ui.common.delete")}
          @click=${this._delete}
        ></ha-icon-button>
      </ha-settings-row>
    `;
  }

  private _delete() {
    fireEvent(this, "delete-favorite-entity", { index: this.index });
  }

  static styles = css`
    :host {
      display: block;
    }
    ha-settings-row {
      padding: 0;
      gap: var(--ha-space-3);
      min-height: 40px;
      --settings-row-prefix-display: contents;
      --settings-row-content-display: contents;
      --settings-row-body-padding-top: var(--ha-space-1);
      --settings-row-body-padding-bottom: var(--ha-space-1);
    }
    state-badge {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      --state-icon-color: var(--secondary-text-color);
    }
    [slot="heading"],
    [slot="description"] {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    ha-icon-button {
      --ha-icon-button-size: 40px;
    }
  `;
}
