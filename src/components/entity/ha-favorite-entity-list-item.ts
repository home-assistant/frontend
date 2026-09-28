import { consume, type ContextType } from "@lit/context";
import { mdiDelete } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityState } from "../../common/decorators/consume-context-entry";
import { computeEntityPickerDisplay } from "../../common/entity/compute_entity_name_display";
import { fireEvent } from "../../common/dom/fire_event";
import "./state-badge";
import "../ha-icon-button";
import "../ha-settings-row";
import {
  internationalizationContext,
  registriesContext,
} from "../../data/context";

declare global {
  interface HASSDomEvents {
    "delete-favorite-entity": { index: number };
  }
  interface HTMLElementTagNameMap {
    "ha-favorite-entity-list-item": HaFavoriteEntityListItem;
  }
}

@customElement("ha-favorite-entity-list-item")
export class HaFavoriteEntityListItem extends LitElement {
  @property({ attribute: "entity-id" }) public entityId!: string;

  @property({ type: Number }) public index = 0;

  @state()
  @consumeEntityState({ entityIdPath: ["entityId"] })
  private _stateObj?: HassEntity;

  @state()
  @consume({ context: registriesContext, subscribe: true })
  private _registries!: ContextType<typeof registriesContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  protected render() {
    const stateObj = this._stateObj;
    const { primary, secondary } = stateObj
      ? computeEntityPickerDisplay(
          {
            ...this._registries,
            language: this._i18n.language,
            translationMetadata: this._i18n.translationMetadata,
          },
          stateObj
        )
      : { primary: this.entityId, secondary: undefined };

    return html`
      <ha-settings-row slim>
        <state-badge slot="prefix" .stateObj=${stateObj}></state-badge>
        <span slot="heading">${primary}</span>
        ${
          secondary
            ? html`<span slot="description">${secondary}</span>`
            : nothing
        }
        <ha-icon-button
          .path=${mdiDelete}
          .label=${this._i18n.localize("ui.common.delete")}
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
