import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-md-list-item";
import "../../components/ha-spinner";
import type { HaMdListItem } from "../../components/ha-md-list-item";
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

  @state() private _actions?: EntityAddToActions = [];

  @state() private _loading = true;

  private async _loadActions() {
    const actions: EntityAddToActions = getDefaultAddToActions(
      this.hass,
      this.entityId
    );

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
          actions.concat(
            response.actions.map((action: ExternalEntityAddToAction) => ({
              ...action,
              type: "external",
            }))
          );
        }
      } catch (err: unknown) {
        // eslint-disable-next-line no-console
        console.warn("Failed to fetch add to actions", err);
      }
    }

    this._actions = actions;
  }

  private async _actionSelected(
    ev: HASSDomCurrentTargetEvent<
      HaMdListItem & {
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

    if (!this._actions?.length) {
      return html`
        <ha-alert alert-type="info">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.add_to.no_actions"
          )}
        </ha-alert>
      `;
    }

    return html`
      <div class="actions-list">
        ${this._actions.map(
          (action) => html`
            <ha-md-list-item
              type="button"
              .disabled=${!action.enabled}
              .action=${action}
              @click=${this._actionSelected}
            >
              <ha-icon slot="start" .icon=${action.mdi_icon}></ha-icon>
              <span>${action.name}</span>
              ${action.details
                ? html`<span slot="supporting-text">${action.details}</span>`
                : nothing}
            </ha-md-list-item>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      padding: var(--ha-space-2) var(--ha-space-6) var(--ha-space-6)
        var(--ha-space-6);
    }

    .loading {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: var(--ha-space-8);
    }

    .actions-list {
      display: flex;
      flex-direction: column;
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
