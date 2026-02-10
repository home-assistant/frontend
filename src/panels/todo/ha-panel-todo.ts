import "@home-assistant/webawesome/dist/components/divider/divider";
import { ResizeController } from "@lit-labs/observers/resize-controller";
import {
  mdiChevronDown,
  mdiCommentProcessingOutline,
  mdiDelete,
  mdiDotsVertical,
  mdiInformationOutline,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { storage } from "../../common/decorators/storage";
import { fireEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import { supportsFeature } from "../../common/entity/supports-feature";
import { navigate } from "../../common/navigate";
import { constructUrlCurrentPath } from "../../common/url/construct-url";
import {
  createSearchParam,
  extractSearchParam,
} from "../../common/url/search-params";
import "../../components/ha-button";
import "../../components/ha-dropdown";
import "../../components/ha-dropdown-item";
import type { HaDropdownItem } from "../../components/ha-dropdown-item";
import "../../components/ha-fab";
import "../../components/ha-icon-button";
import "../../components/ha-list";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-two-pane-top-app-bar-fixed";
import { deleteConfigEntry } from "../../data/config_entries";
import { getExtendedEntityRegistryEntry } from "../../data/entity/entity_registry";
import { fetchIntegrationManifest } from "../../data/integration";
import type { LovelaceCardConfig } from "../../data/lovelace/config/card";
import { TodoListEntityFeature, getTodoLists } from "../../data/todo";
import { showConfigFlowDialog } from "../../dialogs/config-flow/show-dialog-config-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../dialogs/generic/show-dialog-box";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { haStyle } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "../lovelace/cards/hui-card";
import { showTodoItemEditDialog } from "./show-dialog-todo-item-editor";
import type { HaDropdownSelectEvent } from "../../components/ha-dropdown";

@customElement("ha-panel-todo")
class PanelTodo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public mobile = false;

  @state()
  @storage({
    key: "selectedTodoEntity",
    state: true,
  })
  private _entityId?: string;

  private _showPaneController = new ResizeController(this, {
    callback: (entries) => entries[0]?.contentRect.width > 750,
  });

  private _mql?: MediaQueryList;

  private _conversation = memoizeOne((_components) =>
    isComponentLoaded(this.hass, "conversation")
  );

  public connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia(
      "(max-width: 450px), all and (max-height: 500px)"
    );
    this._mql.addListener(this._setIsMobile);
    this.mobile = this._mql.matches;
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeListener(this._setIsMobile!);
    this._mql = undefined;
  }

  private _setIsMobile = (ev: MediaQueryListEvent) => {
    this.mobile = ev.matches;
  };

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (!this.hasUpdated) {
      this.hass.loadFragmentTranslation("lovelace");

      const urlEntityId = extractSearchParam("entity_id");
      if (urlEntityId) {
        this._entityId = urlEntityId;
      } else {
        if (this._entityId && !(this._entityId in this.hass.states)) {
          this._entityId = undefined;
        }
        if (!this._entityId) {
          this._entityId = getTodoLists(this.hass)[0]?.entity_id;
        }
      }
    }

    if (changedProperties.has("_entityId") || !this.hasUpdated) {
      this._setupTodoElement();
    }
  }

  private _setupTodoElement(): void {
    if (!this._entityId) {
      navigate(constructUrlCurrentPath(""), { replace: true });
      return;
    }
    navigate(
      constructUrlCurrentPath(createSearchParam({ entity_id: this._entityId })),
      { replace: true }
    );
  }

  private _cardConfig = memoizeOne(
    (entityId: string) =>
      ({
        type: "todo-list",
        entity: entityId,
      }) as LovelaceCardConfig
  );

  protected render(): TemplateResult {
    const entityRegistryEntry = this._entityId
      ? this.hass.entities[this._entityId]
      : undefined;
    const entityState = this._entityId
      ? this.hass.states[this._entityId]
      : undefined;
    const showPane = this._showPaneController.value ?? !this.narrow;
    const listItems = getTodoLists(this.hass).map(
      (list) =>
        html`<ha-dropdown-item
          @click=${this._setEntityId}
          value=${list.entity_id}
          .selected=${list.entity_id === this._entityId}
        >
          <ha-state-icon
            .stateObj=${list}
            .hass=${this.hass}
            slot="icon"
          ></ha-state-icon
          >${list.name}
        </ha-dropdown-item> `
    );
    return html`
      <ha-two-pane-top-app-bar-fixed
        .pane=${showPane}
        footer
        .narrow=${this.narrow}
      >
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">
          ${!showPane
            ? html`<ha-dropdown class="lists">
                <ha-button slot="trigger">
                  <div>
                    ${this._entityId
                      ? entityState
                        ? computeStateName(entityState)
                        : this._entityId
                      : nothing}
                  </div>
                  <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
                </ha-button>
                ${listItems}
                ${this.hass.user?.is_admin
                  ? html`<wa-divider></wa-divider>
                      <ha-dropdown-item @click=${this._addList}>
                        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
                        ${this.hass.localize("ui.panel.todo.create_list")}
                      </ha-dropdown-item>`
                  : nothing}
              </ha-dropdown>`
            : this.hass.localize("panel.todo")}
        </div>
        <ha-list slot="pane" activatable>${listItems}</ha-list>
        ${showPane && this.hass.user?.is_admin
          ? html`<ha-list-item
              graphic="icon"
              slot="pane-footer"
              @click=${this._addList}
            >
              <ha-svg-icon .path=${mdiPlus} slot="graphic"></ha-svg-icon>
              ${this.hass.localize("ui.panel.todo.create_list")}
            </ha-list-item>`
          : nothing}
        <ha-dropdown
          slot="actionItems"
          @wa-select=${this._handleDropdownSelect}
        >
          <ha-icon-button
            slot="trigger"
            .label=${""}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${this._conversation(this.hass.config.components)
            ? html`<ha-dropdown-item value="info" .disabled=${!this._entityId}>
                <ha-svg-icon .path=${mdiInformationOutline} slot="icon">
                </ha-svg-icon>
                ${this.hass.localize("ui.panel.todo.information")}
              </ha-dropdown-item>`
            : nothing}
          <wa-divider></wa-divider>
          <ha-dropdown-item value="assist">
            <ha-svg-icon .path=${mdiCommentProcessingOutline} slot="icon">
            </ha-svg-icon>
            ${this.hass.localize("ui.panel.todo.assist")}
          </ha-dropdown-item>
          ${entityRegistryEntry?.platform === "local_todo"
            ? html` <wa-divider></wa-divider>
                <ha-dropdown-item
                  value="delete"
                  variant="danger"
                  .disabled=${!this._entityId}
                >
                  <ha-svg-icon .path=${mdiDelete} slot="icon" class="warning">
                  </ha-svg-icon>
                  ${this.hass.localize("ui.panel.todo.delete_list")}
                </ha-dropdown-item>`
            : nothing}
        </ha-dropdown>
        <div id="columns">
          <div class="column">
            ${this._entityId
              ? html`
                  <hui-card
                    .hass=${this.hass}
                    .config=${this._cardConfig(this._entityId)}
                  ></hui-card>
                `
              : nothing}
          </div>
        </div>
        ${entityState &&
        supportsFeature(entityState, TodoListEntityFeature.CREATE_TODO_ITEM)
          ? html`<ha-fab
              .label=${this.hass.localize("ui.panel.todo.add_item")}
              extended
              @click=${this._addItem}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>`
          : nothing}
      </ha-two-pane-top-app-bar-fixed>
    `;
  }

  private async _addList(): Promise<void> {
    showConfigFlowDialog(this, {
      startFlowHandler: "local_todo",
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, "local_todo"),
    });
  }

  private _showMoreInfoDialog(): void {
    if (!this._entityId) {
      return;
    }
    fireEvent(this, "hass-more-info", { entityId: this._entityId });
  }

  private async _deleteList(): Promise<void> {
    if (!this._entityId) {
      return;
    }

    const entityRegistryEntry = await getExtendedEntityRegistryEntry(
      this.hass,
      this._entityId
    );

    if (entityRegistryEntry.platform !== "local_todo") {
      return;
    }

    const entryId = entityRegistryEntry.config_entry_id;

    if (!entryId) {
      return;
    }

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.todo.delete_confirm_title", {
        name:
          this._entityId in this.hass.states
            ? computeStateName(this.hass.states[this._entityId])
            : this._entityId,
      }),
      text: this.hass.localize("ui.panel.todo.delete_confirm_text"),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    const result = await deleteConfigEntry(this.hass, entryId);

    this._entityId = getTodoLists(this.hass)[0]?.entity_id;

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize("ui.panel.todo.restart_confirm"),
      });
    }
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: "last_used" });
  }

  private _addItem() {
    showTodoItemEditDialog(this, { entity: this._entityId! });
  }

  private _handleDropdownSelect(ev: HaDropdownSelectEvent) {
    const action = ev.detail?.item?.value;

    if (!action) {
      return;
    }

    switch (action) {
      case "info":
        this._showMoreInfoDialog();
        break;
      case "assist":
        this._showVoiceCommandDialog();
        break;
      case "delete":
        this._deleteList();
        break;
    }
  }

  private _setEntityId(ev: Event) {
    const item = ev.currentTarget as HaDropdownItem;

    this._entityId = item.value;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        #columns {
          display: flex;
          flex-direction: row;
          justify-content: center;
          margin: 8px;
          padding-bottom: 70px;
        }
        .column {
          flex: 1 0 0;
          max-width: 500px;
          min-width: 0;
        }
        ha-dropdown {
          display: inline-block;
          max-width: 100%;
        }
        ha-dropdown ha-button {
          --ha-font-size-m: var(--ha-font-size-l);
        }
        ha-dropdown ha-button div {
          text-overflow: ellipsis;
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          display: block;
        }
        ha-fab {
          position: fixed;
          right: calc(16px + var(--safe-area-inset-right, 0px));
          bottom: calc(16px + var(--safe-area-inset-bottom, 0px));
          inset-inline-end: calc(16px + var(--safe-area-inset-right, 0px));
          inset-inline-start: initial;
        }

        ha-dropdown.lists ha-dropdown-item {
          max-width: 80vw;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-todo": PanelTodo;
  }
}
