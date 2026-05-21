import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-spinner";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import "../../panels/config/automation/target/ha-automation-target-badge";
import { showToast } from "../../util/toast";

import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import {
  type AddToActionKey,
  type EntityAddToActions,
  addToActionHandler,
  getDefaultAddToActions,
  getAddToActionLabelParts,
} from "./add-to";

@customElement("ha-more-info-add-to")
export class HaMoreInfoAddTo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _defaultActions: EntityAddToActions = [];

  @state() private _externalActions: EntityAddToActions = [];

  @state() private _loading = true;

  private async _loadActions() {
    this._defaultActions = getDefaultAddToActions(
      this.hass.states,
      this.hass.localize,
      this.hass.formatEntityName,
      this.entityId
    );
    this._externalActions = [];

    if (this.hass.auth.external?.config.hasEntityAddTo) {
      try {
        const response =
          await this.hass.auth.external?.sendMessage<"entity/add_to/get_actions">(
            {
              type: "entity/add_to/get_actions",
              payload: { entity_id: this.entityId },
            }
          );
        if (response?.actions) {
          this._externalActions = response.actions.map((action) => ({
            type: "external",
            enabled: action.enabled,
            name: action.name,
            description: action.details,
            icon: action.mdi_icon,
            payload: action.app_payload,
          }));
        }
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.warn("Failed to fetch add to actions", err);
      }
    }
  }

  private async _actionSelected(ev: Event) {
    const item = ev.currentTarget as HTMLElement;
    const actions =
      item.dataset.actionSource === "external"
        ? this._externalActions
        : this._defaultActions;
    const action = actions[Number(item.dataset.actionIndex)];

    if (!action) {
      return;
    }

    if (!action.enabled) {
      return;
    }

    if (action.type === "external") {
      try {
        if (!action.payload) {
          throw new Error("Missing external action payload");
        }
        this.hass.auth.external!.fireMessage({
          type: "entity/add_to",
          payload: {
            entity_id: this.entityId,
            app_payload: action.payload,
          },
        });
        fireEvent(this, "add-to-action-selected");
      } catch (err: unknown) {
        showToast(this, {
          message: this.hass.localize(
            "ui.dialogs.more_info_control.add_to.action_failed",
            {
              error: err instanceof Error ? err.message : String(err),
            }
          ),
        });
      }
      return;
    }

    if (action.type !== "default") {
      return;
    }

    addToActionHandler(action.key, { entity_id: this.entityId });
  }

  private _renderActionItems(
    actions: EntityAddToActions,
    source: "default" | "external"
  ) {
    return actions.map(
      (action, index) => html`
        <ha-list-item-button
          aria-label=${action.name}
          data-action-index=${index}
          data-action-source=${source}
          .disabled=${!action.enabled}
          @click=${this._actionSelected}
        >
          <ha-icon slot="start" .icon=${action.icon}></ha-icon>
          <span slot="headline" class="action-label">
            ${action.type === "default"
              ? this._renderDefaultActionLabel(action.key)
              : action.name}
          </span>
          ${action.description
            ? html`<span slot="supporting-text">${action.description}</span>`
            : nothing}
        </ha-list-item-button>
      `
    );
  }

  private _renderDefaultActionLabel(key: AddToActionKey) {
    const [beforeTarget, afterTarget] = getAddToActionLabelParts(
      this.hass.localize,
      key
    );

    return html`${beforeTarget}${this._renderTarget()}${afterTarget}`;
  }

  private _renderTarget() {
    return html`<ha-automation-target-badge
      target-type="entity"
      .targetId=${this.entityId}
      .label=${this._targetLabel}
    ></ha-automation-target-badge>`;
  }

  private get _targetLabel(): string {
    const stateObj = this.hass.states[this.entityId];
    return stateObj
      ? this.hass.formatEntityName(stateObj, undefined)
      : this.entityId;
  }

  protected async firstUpdated() {
    await this._loadActions();
    this._loading = false;
  }

  protected render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    if (!this._defaultActions.length && !this._externalActions.length) {
      return html`
        <ha-alert alert-type="info">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.add_to.no_actions"
          )}
        </ha-alert>
      `;
    }

    return html`
      <ha-list-base>
        ${this._renderActionItems(this._defaultActions, "default")}
      </ha-list-base>
      ${this._externalActions.length
        ? html`
            <h2 class="section-title">
              ${this.hass.localize(
                "ui.dialogs.more_info_control.add_to.app_actions"
              )}
            </h2>
            <ha-list-base>
              ${this._renderActionItems(this._externalActions, "external")}
            </ha-list-base>
          `
        : nothing}
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--ha-space-3) 0 var(--ha-space-4);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--ha-space-8);
    }

    .section-title {
      padding: 0 var(--ha-space-6);
      margin: var(--ha-space-4) 0 var(--ha-space-1);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-medium);
      line-height: var(--ha-line-height-normal);
      color: var(--secondary-text-color);
    }

    ha-icon {
      display: flex;
      align-items: center;
    }

    .action-label {
      display: inline-flex;
      align-items: center;
      gap: var(--ha-space-1);
      flex-wrap: wrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-add-to": HaMoreInfoAddTo;
  }

  interface HASSDomEvents {
    "add-to-action-selected": undefined;
  }
}
