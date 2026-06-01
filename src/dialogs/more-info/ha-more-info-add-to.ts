import { consume, type ContextType } from "@lit/context";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { transform } from "../../common/decorators/transform";
import "../../components/ha-alert";
import "../../components/ha-spinner";
import { showToast } from "../../util/toast";

import { fireEvent } from "../../common/dom/fire_event";
import { configContext, internationalizationContext } from "../../data/context";
import "../add-to/ha-add-to-action-list";
import type {
  AddToActionListActionSelectedEvent,
  AddToActionListSection,
} from "../add-to/ha-add-to-action-list";
import {
  type EntityAddToAction,
  type EntityAddToActions,
  addToActionHandler,
  getDefaultAddToActions,
} from "../add-to/add-to";

@customElement("ha-more-info-add-to")
export class HaMoreInfoAddTo extends LitElement {
  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<
    ContextType<typeof configContext>,
    ContextType<typeof configContext>["auth"]["external"]
  >({
    transformer: ({ auth }) => auth.external,
  })
  private _external?: ContextType<typeof configContext>["auth"]["external"];

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @property({ attribute: false }) public entityId!: string;

  @state() private _defaultActions: EntityAddToActions = [];

  @state() private _externalActions: EntityAddToActions = [];

  @state() private _loading = true;

  private async _loadActions() {
    this._defaultActions = getDefaultAddToActions();
    this._externalActions = [];

    if (this._external?.config.hasEntityAddTo) {
      try {
        const response =
          await this._external.sendMessage<"entity/add_to/get_actions">({
            type: "entity/add_to/get_actions",
            payload: { entity_id: this.entityId },
          });
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

  private async _actionSelected(
    ev: AddToActionListActionSelectedEvent<EntityAddToAction>
  ) {
    const { action } = ev.detail;
    if (!action.enabled) {
      return;
    }

    if (action.type === "external") {
      try {
        if (!action.payload) {
          throw new Error("Missing external action payload");
        }
        if (!this._external) {
          throw new Error("Missing external app connection");
        }
        this._external.fireMessage({
          type: "entity/add_to",
          payload: {
            entity_id: this.entityId,
            app_payload: action.payload,
          },
        });
        fireEvent(this, "add-to-action-selected");
      } catch (err: unknown) {
        showToast(this, {
          message: this._i18n.localize(
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
          ${this._i18n.localize(
            "ui.dialogs.more_info_control.add_to.no_actions"
          )}
        </ha-alert>
      `;
    }

    const automationActions = this._defaultActions.filter(
      (action) => action.type === "default" && action.key !== "script_action"
    );
    const scriptActions = this._defaultActions.filter(
      (action) => action.type === "default" && action.key === "script_action"
    );

    const sections: AddToActionListSection<EntityAddToAction>[] = [
      {
        titleKey: "ui.panel.config.devices.automation.automations_heading",
        actions: automationActions,
      },
      {
        titleKey: "ui.panel.config.devices.script.scripts_heading",
        actions: scriptActions,
      },
      {
        titleKey: "ui.dialogs.more_info_control.add_to.app_actions",
        actions: this._externalActions,
      },
    ];

    return html`
      <ha-add-to-action-list
        .sections=${sections}
        @add-to-list-action-selected=${this._actionSelected}
      ></ha-add-to-action-list>
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
