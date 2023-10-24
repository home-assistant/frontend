import { ResizeController } from "@lit-labs/observers/resize-controller";
import "@material/mwc-list";
import { mdiChevronDown, mdiDotsVertical, mdiMicrophone } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { storage } from "../../common/decorators/storage";
import { computeDomain } from "../../common/entity/compute_domain";
import { computeStateName } from "../../common/entity/compute_state_name";
import "../../components/ha-button";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/ha-menu-button";
import "../../components/ha-state-icon";
import "../../components/ha-svg-icon";
import "../../components/ha-two-pane-top-app-bar-fixed";
import { getTodoLists } from "../../data/todo";
import { showVoiceCommandDialog } from "../../dialogs/voice-command-dialog/show-ha-voice-command-dialog";
import { haStyle } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { HuiErrorCard } from "../lovelace/cards/hui-error-card";
import { createCardElement } from "../lovelace/create-element/create-card-element";
import { LovelaceCard } from "../lovelace/types";

@customElement("ha-panel-todo")
class PanelTodo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean, reflect: true }) public mobile = false;

  @state() private _card?: LovelaceCard | HuiErrorCard;

  @storage({
    key: "selectedTodoEntity",
    state: true,
  })
  private _entityId?: string;

  private _headerHeight = 56;

  private _showPaneController = new ResizeController(this, {
    callback: (entries: ResizeObserverEntry[]) =>
      entries[0]?.contentRect.width > 750,
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

    if (!this.hasUpdated && !this._entityId) {
      this._entityId = Object.keys(this.hass.states).find(
        (entityId) => computeDomain(entityId) === "todo"
      );
    } else if (!this.hasUpdated) {
      this._createCard();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (changedProperties.has("_entityId")) {
      this._createCard();
    }

    if (changedProperties.has("hass") && this._card) {
      this._card.hass = this.hass;
    }
  }

  private _createCard(): void {
    if (!this._entityId) {
      this._card = undefined;
      return;
    }
    this._card = createCardElement({
      type: "todo-list",
      entity: this._entityId,
    }) as LovelaceCard;
    this._card.hass = this.hass;
  }

  protected render(): TemplateResult {
    const showPane = this._showPaneController.value ?? !this.narrow;
    const listItems = getTodoLists(this.hass).map(
      (list) =>
        html`<ha-list-item
          graphic="icon"
          @click=${this._handleEntityPicked}
          .entityId=${list.entity_id}
          .activated=${list.entity_id === this._entityId}
        >
          <ha-state-icon .state=${list} slot="graphic"></ha-state-icon
          >${list.name}
        </ha-list-item> `
    );
    return html`
      <ha-two-pane-top-app-bar-fixed .pane=${showPane}>
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
                  ${this._entityId
                    ? computeStateName(this.hass.states[this._entityId])
                    : ""}
                  <ha-svg-icon
                    slot="trailingIcon"
                    .path=${mdiChevronDown}
                  ></ha-svg-icon>
                </ha-button>
                ${listItems}
                <li divider role="separator"></li>
              </ha-button-menu>`
            : "Lists"}
        </div>
        <mwc-list slot="pane" activatable>${listItems}</mwc-list>
        <ha-button-menu slot="actionItems">
          <ha-icon-button
            slot="trigger"
            .label=${""}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${this._conversation(this.hass.config.components)
            ? html`<ha-list-item
                graphic="icon"
                @click=${this._showVoiceCommandDialog}
              >
                <ha-svg-icon .path=${mdiMicrophone} slot="graphic">
                </ha-svg-icon>
                ${this.hass.localize("ui.panel.todo.start_conversation")}
              </ha-list-item>`
            : nothing}
        </ha-button-menu>
        <div id="columns">
          <div class="column">${this._card}</div>
        </div>
      </ha-two-pane-top-app-bar-fixed>
    `;
  }

  private _handleEntityPicked(ev) {
    this._entityId = ev.currentTarget.entityId;
  }

  private _showVoiceCommandDialog(): void {
    showVoiceCommandDialog(this, this.hass, { pipeline_id: "last_used" });
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
        }
        .column {
          flex: 1 0 0;
          max-width: 500px;
          min-width: 0;
        }
        :host([mobile]) .lists {
          --mdc-menu-min-width: 100vw;
        }
        :host([mobile]) ha-button-menu {
          --mdc-shape-medium: 0 0 var(--mdc-shape-medium)
            var(--mdc-shape-medium);
        }
        ha-button-menu ha-button {
          --mdc-theme-primary: currentColor;
          --mdc-typography-button-text-transform: none;
          --mdc-typography-button-font-size: var(
            --mdc-typography-headline6-font-size,
            1.25rem
          );
          --mdc-typography-button-font-weight: var(
            --mdc-typography-headline6-font-weight,
            500
          );
          --mdc-typography-button-letter-spacing: var(
            --mdc-typography-headline6-letter-spacing,
            0.0125em
          );
          --mdc-typography-button-line-height: var(
            --mdc-typography-headline6-line-height,
            2rem
          );
          --button-height: 40px;
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
