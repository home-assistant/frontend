import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-spinner";
import "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import type {
  ExternalEntityAddToAction,
  ExternalEntityAddToActions,
} from "../../external_app/external_messaging";
import { showToast } from "../../util/toast";

import { fireEvent } from "../../common/dom/fire_event";
import type { HomeAssistant } from "../../types";

@customElement("ha-more-info-add-to")
export class HaMoreInfoAddTo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entityId!: string;

  @state() private _externalActions?: ExternalEntityAddToActions = {
    actions: [],
  };

  @state() private _loading = true;

  private async _loadExternalActions() {
    if (this.hass.auth.external?.config.hasEntityAddTo) {
      this._externalActions =
        await this.hass.auth.external?.sendMessage<"entity/add_to/get_actions">(
          {
            type: "entity/add_to/get_actions",
            payload: { entity_id: this.entityId },
          }
        );
    }
  }

  private async _actionSelected(ev: CustomEvent) {
    const action = (ev.currentTarget as any)
      .action as ExternalEntityAddToAction;
    if (!action.enabled) {
      return;
    }

    try {
      await this.hass.auth.external!.fireMessage({
        type: "entity/add_to",
        payload: {
          entity_id: this.entityId,
          app_payload: action.app_payload,
        },
      });
      fireEvent(this, "add-to-action-selected");
    } catch (err: any) {
      showToast(this, {
        message: this.hass.localize(
          "ui.dialogs.more_info_control.add_to.action_failed",
          {
            error: err.message || err,
          }
        ),
      });
    }
  }

  protected async firstUpdated() {
    await this._loadExternalActions();
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

    if (!this._externalActions?.actions.length) {
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
        ${this._externalActions?.actions.map(
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
        )}
      </ha-list-base>
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
