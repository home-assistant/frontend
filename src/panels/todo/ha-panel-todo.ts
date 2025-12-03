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
import "../../components/ha-fab";
import "../../components/ha-icon-button";
import "../../components/ha-list";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-two-pane-top-app-bar-fixed";
import { deleteConfigEntry } from "../../data/config_entries";
import { getExtendedEntityRegistryEntry } from "../../data/entity_registry";
import { fetchIntegrationManifest } from "../../data/integration";
import type { LovelaceCardConfig } from "../../data/lovelace/config/card";
import {
  TodoListEntityFeature,
  getTodoLists,
  subscribeItems,
} from "../../data/todo";
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

  private _headerHeight = 56;

  private _summaryItems: Record<string, any[]> = {};

  private _summaryUnsub: (() => void)[] = [];

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
    const computedStyles = getComputedStyle(this);
    this._headerHeight = Number(
      computedStyles.getPropertyValue("--header-height").replace("px", "")
    );
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

      if (urlEntityId === "todo.summary") {
        this._entityId = "todo.summary";
        return;
      }

      if (urlEntityId) {
        this._entityId = urlEntityId;
      } else {
        if (
          this._entityId &&
          this._entityId !== "todo.summary" &&
          !(this._entityId in this.hass.states)
        ) {
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
    if (this._entityId === "todo.summary") {
      navigate(
        constructUrlCurrentPath(
          createSearchParam({ entity_id: "todo.summary" })
        ),
        { replace: true }
      );
      return;
    }
    if (!this._entityId) {
      this._entityId = getTodoLists(this.hass)[0]?.entity_id;
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
    const todoLists = getTodoLists(this.hass);

    const listItems = [
      todoLists.map(
        (list) =>
          html`<ha-list-item
            graphic="icon"
            @click=${this._handleEntityPicked}
            .entityId=${list.entity_id}
            .activated=${list.entity_id === this._entityId}
          >
            <ha-state-icon
              .stateObj=${list}
              .hass=${this.hass}
              slot="graphic"
            ></ha-state-icon>
            ${list.name}
          </ha-list-item>`
      ),
      html`<ha-list-item
        graphic="icon"
        @click=${this._handleEntityPicked}
        data-entity-id="todo.summary"
        .entityId=${"todo.summary"}
        .activated=${this._entityId === "todo.summary"}
      >
        <ha-svg-icon
          slot="graphic"
          .path=${mdiInformationOutline}
        ></ha-svg-icon>
        Summary of Tasks
      </ha-list-item>`,
    ];
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
            ? html`<ha-button-menu
                class="lists"
                activatable
                fixed
                .noAnchor=${this.mobile}
                .y=${this.mobile
                  ? this._headerHeight / 2
                  : this._headerHeight / 4}
                .x=${this.mobile ? 0 : undefined}
              >
                <ha-button slot="trigger">
                  <div>
                    ${this._entityId
                      ? entityState
                        ? computeStateName(entityState)
                        : this._entityId
                      : ""}
                  </div>
                  <ha-svg-icon slot="end" .path=${mdiChevronDown}></ha-svg-icon>
                </ha-button>
                ${listItems}
                ${this.hass.user?.is_admin
                  ? html`<li divider role="separator"></li>
                      <ha-list-item graphic="icon" @click=${this._addList}>
                        <ha-svg-icon
                          .path=${mdiPlus}
                          slot="graphic"
                        ></ha-svg-icon>
                        ${this.hass.localize("ui.panel.todo.create_list")}
                      </ha-list-item>`
                  : nothing}
              </ha-button-menu>`
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
        <ha-button-menu slot="actionItems">
          <ha-icon-button
            slot="trigger"
            .label=${""}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${this._conversation(this.hass.config.components)
            ? html`<ha-list-item
                graphic="icon"
                @click=${this._showMoreInfoDialog}
                .disabled=${!this._entityId}
              >
                <ha-svg-icon .path=${mdiInformationOutline} slot="graphic">
                </ha-svg-icon>
                ${this.hass.localize("ui.panel.todo.information")}
              </ha-list-item>`
            : nothing}
          <li divider role="separator"></li>
          <ha-list-item graphic="icon" @click=${this._showVoiceCommandDialog}>
            <ha-svg-icon .path=${mdiCommentProcessingOutline} slot="graphic">
            </ha-svg-icon>
            ${this.hass.localize("ui.panel.todo.assist")}
          </ha-list-item>
          ${entityRegistryEntry?.platform === "local_todo"
            ? html` <li divider role="separator"></li>
                <ha-list-item
                  graphic="icon"
                  @click=${this._deleteList}
                  class="warning"
                  .disabled=${!this._entityId}
                >
                  <ha-svg-icon
                    .path=${mdiDelete}
                    slot="graphic"
                    class="warning"
                  >
                  </ha-svg-icon>
                  ${this.hass.localize("ui.panel.todo.delete_list")}
                </ha-list-item>`
            : nothing}
        </ha-button-menu>
        <div id="columns">
          <div class="column">
            ${this._entityId === "todo.summary"
              ? this._renderSummary()
              : html`
                  <hui-card
                    .hass=${this.hass}
                    .config=${this._cardConfig(this._entityId!)}
                  ></hui-card>
                `}
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

  private _handleEntityPicked(ev) {
    const picked = ev.currentTarget.dataset.entityId;
    if (picked === "todo.summary") {
      this._entityId = "todo.summary";
      this._subscribeAllLists();
      return;
    }
    this._entityId = ev.currentTarget.entityId;
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

  private async _subscribeAllLists() {
    // Clean up old subscriptions
    this._summaryUnsub.forEach((unsub) => unsub());
    this._summaryUnsub = [];
    this._summaryItems = {};

    const lists = getTodoLists(this.hass);

    const promises = lists.map(async (list) => {
      const entityId = list.entity_id;

      const unsub = await subscribeItems(this.hass, entityId, (update) => {
        this._summaryItems[entityId] = update.items || [];
        this.requestUpdate();
      });

      return unsub;
    });

    // Wait for all subscriptions
    this._summaryUnsub = await Promise.all(promises);
  }

  private _renderSummary() {
    const lists = getTodoLists(this.hass);

    let totalNeeds = 0;
    let totalCompleted = 0;

    // Aggregate all items across all lists
    for (const list of lists) {
      const items = this._summaryItems[list.entity_id] || [];
      totalNeeds += items.filter((i) => i.status === "needs_action").length;
      totalCompleted += items.filter((i) => i.status === "completed").length;
    }

    const total = totalNeeds + totalCompleted;

    return html`
      <ha-card header="Summary of Tasks">
        <div class="dashboard-wrapper">
          <!-- TOTAL -->
          <div class="stat-card">
            <div class="circle-wrapper">
              <div class="ring total"></div>
              <div class="stat-value">${total}</div>
            </div>
            <div class="stat-label">Total Tasks</div>
          </div>

          <!-- NEEDS ACTION -->
          <div class="stat-card">
            <div class="circle-wrapper">
              <div class="ring needs"></div>
              <div class="stat-value">${totalNeeds}</div>
            </div>
            <div class="stat-label">Pending Tasks</div>
          </div>

          <!-- COMPLETED -->
          <div class="stat-card">
            <div class="circle-wrapper">
              <div class="ring completed"></div>
              <div class="stat-value">${totalCompleted}</div>
            </div>
            <div class="stat-label">Completed Tasks</div>
          </div>

          <!-- ANALYTICS PIE CHART -->
          <div class="analytics-card">
            <div class="analytics-title">Analytics</div>

            <!-- PIE CHART SVG -->
            ${(() => {
              const completed = totalCompleted;
              const needs = totalNeeds;
              const remaining = total - completed - needs;

              const totalSegments = completed + needs + remaining;
              const pct = (v) => (v / totalSegments) * 100;

              // stroke-dasharray values for circle segments
              const c = pct(completed);
              const n = pct(needs);
              const r = pct(remaining);

              return html`
                <svg class="pie-chart" viewBox="-3 -3 38 38">
                  <circle
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke="var(--success-color)"
                    stroke-width="4"
                    stroke-dasharray="${c} ${100 - c}"
                    transform="rotate(-90 16 16)"
                  />
                  <circle
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke="var(--error-color)"
                    stroke-width="4"
                    stroke-dasharray="${n} ${100 - n}"
                    transform="rotate(${(c / 100) * 360 - 90} 16 16)"
                  />
                  <circle
                    r="16"
                    cx="16"
                    cy="16"
                    fill="transparent"
                    stroke="var(--primary-color)"
                    stroke-width="4"
                    stroke-dasharray="${r} ${100 - r}"
                    transform="rotate(${((c + n) / 100) * 360 - 90} 16 16)"
                  />
                </svg>
              `;
            })()}

            <!-- LEGEND -->
            <div class="legend">
              <div>
                <span style="background: var(--success-color);"></span>
                Completed Tasks: ${totalCompleted}
              </div>
              <div>
                <span style="background: var(--error-color);"></span> Pending
                Tasks: ${totalNeeds}
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
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
        :host([mobile]) .lists {
          --mdc-menu-min-width: 100vw;
        }
        :host(:not([mobile])) .lists ha-list-item {
          max-width: calc(100vw - 120px);
        }
        :host([mobile]) ha-button-menu {
          --mdc-shape-medium: 0 0 var(--mdc-shape-medium)
            var(--mdc-shape-medium);
        }
        ha-button-menu {
          max-width: 100%;
        }
        ha-button-menu ha-button {
          --ha-font-size-m: var(--ha-font-size-l);
        }
        ha-button-menu ha-button div {
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
        .dashboard-wrapper {
          display: flex;
          justify-content: space-evenly;
          align-items: flex-start;
          padding: 24px 16px 32px;
          flex-wrap: wrap;
          gap: 40px;
        }

        .stat-card,
        .analytics-card {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 16px;
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, 0 2px 6px rgba(0, 0, 0, 0.16));
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 16px;
        }

        .circle-wrapper {
          position: relative;
          width: 120px;
          height: 120px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .stat-value {
          font-size: 34px;
          font-weight: 600;
          color: var(--primary-text-color);
          z-index: 2;
        }

        .stat-label {
          margin-top: 12px;
          font-size: 15px;
          color: var(--secondary-text-color);
          font-weight: 500;
          text-align: center;
        }

        .ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 6px solid transparent;
          animation: fadeIn 0.8s ease-out forwards;
        }

        .ring.total {
          border-color: var(--primary-color);
          opacity: 0.45;
        }
        .ring.needs {
          border-color: var(--error-color);
          opacity: 0.45;
        }
        .ring.completed {
          border-color: var(--success-color);
          opacity: 0.45;
        }

        @keyframes fadeIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .analytics-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--primary-text-color);
        }

        .pie-chart {
          width: 100px;
          height: 100px;
        }

        .legend {
          margin-top: 12px;
          font-size: 13px;
          text-align: left;
          width: 100%;
          padding-left: 20px;
          color: var(--secondary-text-color);
        }

        .legend div {
          display: flex;
          align-items: center;
          margin-bottom: 4px;
        }

        .legend span {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          margin-right: 8px;
          display: inline-block;
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
