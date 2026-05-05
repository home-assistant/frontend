import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-spinner";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import type { ExternalEntityAddToAction } from "../../external_app/external_messaging";
import { showToast } from "../../util/toast";

import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";
import {
  DEFAULT_ACTION_DEFS,
  defaultActionHandler,
  getDefaultAddToActions,
  type EntityAddToAction,
  type EntityAddToActions,
} from "./const";

@customElement("ha-more-info-add-to")
export class HaMoreInfoAddTo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _defaultActions: EntityAddToActions = [];

  @state() private _externalActions: ExternalEntityAddToAction[] = [];

  @state() private _loading = true;

  private async _loadActions() {
    this._defaultActions = getDefaultAddToActions(this.hass, this.entityId);
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
          this._externalActions = response.actions.map(
            (action: ExternalEntityAddToAction) => ({
              ...action,
              type: "external",
            })
          );
        }
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.warn("Failed to fetch add to actions", err);
      }
    }
  }

  private async _actionSelected(
    ev: HASSDomCurrentTargetEvent<
      HaListItemButton & {
        action: EntityAddToAction | ExternalEntityAddToAction;
      }
    >
  ) {
    const action = ev.currentTarget.action;
    if (!action.enabled) {
      return;
    }

    if (action.type === "external" && "app_payload" in action) {
      try {
        this.hass.auth.external!.fireMessage({
          type: "entity/add_to",
          payload: {
            entity_id: this.entityId,
            app_payload: action.app_payload,
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

    const key = DEFAULT_ACTION_DEFS.find(
      (def) => def.icon === action.mdi_icon
    )?.translation_key;
    if (!key) {
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.more_info_control.add_to.action_failed",
          {
            error: "Unknown action",
          }
        ),
      });
      return;
    }

    defaultActionHandler(key);
  }

  private _renderActionItems(
    actions: (EntityAddToAction | ExternalEntityAddToAction)[]
  ) {
    return actions.map(
      (action) => html`
        <ha-list-item-button
          .disabled=${!action.enabled}
          .action=${action}
          @click=${this._actionSelected}
        >
          <ha-icon slot="start" .icon=${action.mdi_icon}></ha-icon>
          <span slot="headline">${action.name}</span>
          ${action.details
            ? html`<span slot="supporting-text">${action.details}</span>`
            : nothing}
        </ha-list-item-button>
      `
    );
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
        ${this._renderActionItems(this._defaultActions)}
      </ha-list-base>
      ${this._externalActions.length
        ? html`
            <h2 class="section-title">
              ${this.hass.localize(
                "ui.dialogs.more_info_control.add_to.app_actions"
              )}
            </h2>
            <ha-list-base>
              ${this._renderActionItems(this._externalActions)}
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
