import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-icon";
import "../../components/ha-list-item";
import "../../components/ha-spinner";
import type {
  ExternalEntityAddToActions,
  ExternalEntityAddToAction,
} from "../../external_app/external_messaging";

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
    if (this.hass.auth.external?.config.hasAddTo) {
      this._externalActions =
        await this.hass.auth.external?.sendMessage<"entity/add_to/get_actions">(
          {
            type: "entity/add_to/get_actions",
            payload: { entity_id: this.entityId! },
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
    } catch (err: any) {
      // TODO
      // Error handling - could show an alert here if needed
      // eslint-disable-next-line no-console
      console.error("Failed to send action to external app", err);
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
      <div class="actions-list">
        ${this._externalActions.actions.map(
          (action) => html`
            <ha-list-item
              graphic="icon"
              .disabled=${!action.enabled}
              .action=${action}
              .twoline=${!!action.details}
              @click=${this._actionSelected}
            >
              <span>${action.name}</span>
              ${action.details
                ? html`<span slot="secondary">${action.details}</span>`
                : nothing}
              <ha-icon slot="graphic" .icon=${action.mdi_icon}></ha-icon>
            </ha-list-item>
          `
        )}
      </div>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 200px; // TODO what should we use?
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

    ha-list-item {
      cursor: pointer;
    }

    ha-list-item[disabled] {
      cursor: not-allowed;
      opacity: 0.5;
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
}
