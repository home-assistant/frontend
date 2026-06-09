import { consume, type ContextType } from "@lit/context";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../components/ha-alert";
import "../../components/ha-spinner";
import { showToast } from "../../util/toast";

import { fireEvent } from "../../common/dom/fire_event";
import { apiContext, configContext } from "../../data/context";
import { addEntityToGroup, fetchGroupsForEntity } from "../../data/group";
import "../add-to/ha-add-to-action-list";
import type {
  AddToActionListItem,
  AddToActionListActionSelectedEvent,
  AddToActionListSection,
} from "../add-to/ha-add-to-action-list";
import {
  type EntityAddToAction,
  type EntityAddToActions,
  addToActionHandler,
  getDefaultAddToActions,
} from "../add-to/add-to";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../../common/translations/localize";

type GroupAddToAction = AddToActionListItem & {
  type: "group";
  entryId: string;
};

type MoreInfoAddToAction = EntityAddToAction | GroupAddToAction;

@customElement("ha-more-info-add-to")
export class HaMoreInfoAddTo extends LitElement {
  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api?: ContextType<typeof apiContext>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _config?: ContextType<typeof configContext>;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @property({ attribute: false }) public entityId!: string;

  @state() private _defaultActions: EntityAddToActions = [];

  @state() private _externalActions: EntityAddToActions = [];

  @state() private _groupActions: GroupAddToAction[] = [];

  @state() private _showGroupActions = false;

  @state() private _loading = true;

  private async _loadActions() {
    this._defaultActions = getDefaultAddToActions();
    this._externalActions = [];
    this._groupActions = [];
    this._showGroupActions = false;

    if (this._api) {
      try {
        const response = await fetchGroupsForEntity(
          this._api.callWS,
          this.entityId
        );
        this._showGroupActions = response.group_type !== null;
        this._groupActions = response.groups.map((group) => ({
          type: "group",
          entryId: group.entry_id,
          enabled: true,
          name: group.name,
          icon: "mdi:google-circles-communities",
        }));
      } catch (_err: unknown) {
        // The backend endpoint may be unavailable when the frontend is newer than Core.
      }
    }

    if (this._config?.auth.external?.config.hasEntityAddTo) {
      try {
        const response =
          await this._config.auth.external.sendMessage<"entity/add_to/get_actions">(
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

  private async _actionSelected(
    ev: AddToActionListActionSelectedEvent<MoreInfoAddToAction>
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
        if (!this._config?.auth.external) {
          throw new Error("Missing external app connection");
        }
        this._config.auth.external.fireMessage({
          type: "entity/add_to",
          payload: {
            entity_id: this.entityId,
            app_payload: action.payload,
          },
        });
        fireEvent(this, "add-to-action-selected");
      } catch (err: unknown) {
        showToast(this, {
          message: this._localize(
            "ui.dialogs.more_info_control.add_to.action_failed",
            {
              error: err instanceof Error ? err.message : String(err),
            }
          ),
        });
      }
      return;
    }

    if (action.type === "group") {
      try {
        if (!this._api) {
          throw new Error("Missing API connection");
        }
        await addEntityToGroup(this._api.callWS, action.entryId, this.entityId);
        showToast(this, {
          message: this._localize(
            "ui.dialogs.more_info_control.add_to.added_to_group",
            { group: action.name }
          ),
        });
        fireEvent(this, "add-to-action-selected");
      } catch (err: unknown) {
        showToast(this, {
          message: this._localize(
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

    if (
      !this._groupActions.length &&
      !this._defaultActions.length &&
      !this._externalActions.length
    ) {
      return html`
        <ha-alert alert-type="info">
          ${this._localize("ui.dialogs.more_info_control.add_to.no_actions")}
        </ha-alert>
      `;
    }

    const automationActions = this._defaultActions.filter(
      (action) => action.type === "default" && action.key !== "script_action"
    );
    const scriptActions = this._defaultActions.filter(
      (action) => action.type === "default" && action.key === "script_action"
    );

    const sections: AddToActionListSection<MoreInfoAddToAction>[] = [
      {
        titleKey: "ui.dialogs.more_info_control.add_to.automations_heading",
        actions: automationActions,
      },
      {
        titleKey: "ui.dialogs.more_info_control.add_to.scripts_heading",
        actions: scriptActions,
      },
      {
        titleKey: "ui.dialogs.more_info_control.add_to.app_actions",
        actions: this._externalActions,
      },
    ];

    if (this._showGroupActions) {
      sections.push({
        titleKey: "ui.dialogs.more_info_control.add_to.groups_heading",
        actions: this._groupActions,
        emptyKey: "ui.dialogs.more_info_control.add_to.no_groups",
      });
    }

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
