import { mdiPencil, mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/ha-ripple";
import "../../../components/ha-sortable";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type {
  LovelaceViewConfig,
  LovelaceViewHeaderConfig,
} from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import type { HuiCard } from "../cards/hui-card";
import "../components/hui-badge-edit-mode";
import { replaceView } from "../editor/config-util";
import { showEditViewHeaderDialog } from "../editor/view-header/show-edit-view-header-dialog";
import type { Lovelace } from "../types";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import { DragScrollController } from "../../../common/controllers/drag-scroll-controller";

export const DEFAULT_VIEW_HEADER_LAYOUT = "center";
export const DEFAULT_VIEW_HEADER_BADGES_POSITION = "bottom";
export const DEFAULT_VIEW_HEADER_BADGES_WRAP = "wrap";

@customElement("hui-view-header")
export class HuiViewHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public card?: HuiCard;

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  @property({ attribute: false }) public viewIndex!: number;

  private _checkHidden() {
    const allHidden =
      !this.card &&
      !this.lovelace.editMode &&
      this.badges.every((badges) => badges.hidden);
    this.toggleAttribute("hidden", allHidden);
  }

  private _badgeVisibilityChanged = () => {
    this._checkHidden();
  };

  private _dragScrollController = new DragScrollController(this, {
    selector: ".scroll",
    enabled: false,
  });

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(
      "badge-visibility-changed",
      this._badgeVisibilityChanged
    );
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener(
      "badge-visibility-changed",
      this._badgeVisibilityChanged
    );
  }

  willUpdate(changedProperties: PropertyValues<typeof this>): void {
    if (
      changedProperties.has("badges") ||
      changedProperties.has("lovelace") ||
      changedProperties.has("card")
    ) {
      this._checkHidden();
    }

    if (changedProperties.has("config") || changedProperties.has("lovelace")) {
      this._dragScrollController.enabled =
        !this.lovelace.editMode && this.config?.badges_wrap === "scroll";
    }

    if (changedProperties.has("config")) {
      if (this.config?.card) {
        this.card = this._createCardElement(this.config.card);
      } else {
        this.card = undefined;
      }
      this._checkHidden();
      return;
    }

    if (this.card) {
      if (changedProperties.has("hass")) {
        this.card.hass = this.hass;
      }
      if (changedProperties.has("lovelace")) {
        this.card.preview = this.lovelace.editMode;
      }
    }
  }

  private _createCardElement(cardConfig: LovelaceCardConfig) {
    const element = document.createElement("hui-card");
    element.hass = this.hass;
    element.preview = this.lovelace.editMode;
    element.config = cardConfig;
    element.load();
    return element;
  }

  private _addCard() {
    const cardConfig: LovelaceCardConfig = {
      type: "markdown",
      text_only: true,
      content: this.hass.localize(
        "ui.panel.lovelace.editor.edit_view_header.default_title",
        { user: "{{ user }}" }
      ),
    };

    showEditCardDialog(this, {
      cardConfig,
      lovelaceConfig: this.lovelace.config,
      saveCardConfig: (newCardConfig: LovelaceCardConfig) => {
        const newConfig = { ...this.config };
        newConfig.card = newCardConfig;
        this._saveHeaderConfig(newConfig);
      },
      isNew: true,
    });
  }

  private _deleteCard(ev) {
    ev.stopPropagation();
    const newConfig = { ...this.config };
    delete newConfig.card;
    this._saveHeaderConfig(newConfig);
  }

  private _editCard(ev) {
    ev.stopPropagation();
    const cardConfig = this.config!.card;

    if (!cardConfig) {
      return;
    }

    showEditCardDialog(this, {
      cardConfig,
      lovelaceConfig: this.lovelace.config,
      saveCardConfig: (newCardConfig: LovelaceCardConfig) => {
        const newConfig = { ...this.config };
        newConfig.card = newCardConfig;
        this._saveHeaderConfig(newConfig);
      },
    });
  }

  private _saveHeaderConfig(headerConfig: LovelaceViewHeaderConfig) {
    const viewConfig = this.lovelace.config.views[
      this.viewIndex
    ] as LovelaceViewConfig;

    const config = { ...viewConfig };
    config.header = headerConfig;

    const updatedConfig = replaceView(
      this.hass,
      this.lovelace.config,
      this.viewIndex,
      config
    );
    this.lovelace.saveConfig(updatedConfig);
  }

  private _configure = () => {
    showEditViewHeaderDialog(this, {
      config: this.config!,
      saveConfig: (config: LovelaceViewHeaderConfig) => {
        this._saveHeaderConfig(config);
      },
    });
  };

  render() {
    if (!this.lovelace) return nothing;

    const editMode = Boolean(this.lovelace?.editMode);

    const card = this.card;

    const layout = this.config?.layout ?? DEFAULT_VIEW_HEADER_LAYOUT;
    const badgesPosition =
      this.config?.badges_position ?? DEFAULT_VIEW_HEADER_BADGES_POSITION;
    const badgesWrap =
      this.config?.badges_wrap ?? DEFAULT_VIEW_HEADER_BADGES_WRAP;
    const badgeDragging = this._dragScrollController.scrolling
      ? "dragging"
      : "";

    const hasHeading = card !== undefined;
    const hasBadges = this.badges.length > 0;

    return html`
      ${editMode
        ? html`
            <div class="actions-container">
              <div class="actions">
                <ha-icon-button
                  .label=${this.hass.localize("ui.common.edit")}
                  @click=${this._configure}
                  .path=${mdiPencil}
                ></ha-icon-button>
              </div>
            </div>
          `
        : nothing}
      <div class="container ${editMode ? "edit-mode" : ""}">
        <div
          class="layout ${classMap({
            [layout]: true,
            [`badges-${badgesPosition}`]: true,
            [`badges-${badgesWrap}`]: true,
            "has-heading": hasHeading,
            "has-badges": hasBadges,
          })}"
        >
          ${card || editMode
            ? html`
                <div class="heading">
                  ${editMode
                    ? card
                      ? html`
                          <hui-card-edit-mode
                            @ll-edit-card=${this._editCard}
                            @ll-delete-card=${this._deleteCard}
                            .hass=${this.hass}
                            .lovelace=${this.lovelace!}
                            .path=${[0]}
                            no-duplicate
                            no-move
                          >
                            ${card}
                          </hui-card-edit-mode>
                        `
                      : html`
                          <button class="add" @click=${this._addCard}>
                            <ha-ripple></ha-ripple>
                            <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                            ${this.hass.localize(
                              "ui.panel.lovelace.editor.edit_view_header.add_title"
                            )}
                          </button>
                        `
                    : card}
                </div>
              `
            : nothing}
          ${this.lovelace && (editMode || this.badges.length > 0)
            ? html`
                <div
                  class="badges ${badgesPosition} ${badgesWrap} ${badgeDragging}"
                >
                  <hui-view-badges
                    .badges=${this.badges}
                    .hass=${this.hass}
                    .lovelace=${this.lovelace!}
                    .viewIndex=${this.viewIndex!}
                    .showAddLabel=${this.badges.length === 0}
                  ></hui-view-badges>
                </div>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  static styles = css`
    :host([hidden]) {
      display: none !important;
    }

    .container {
      position: relative;
    }

    .actions-container {
      position: relative;
      height: 34px;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }

    .actions {
      z-index: 1;
      position: absolute;
      height: 36px;
      bottom: -2px;
      right: 0;
      inset-inline-end: 0;
      inset-inline-start: initial;
      opacity: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s ease-in-out;
      border-radius: var(--ha-card-border-radius, 12px);
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
      background: var(--secondary-background-color);
      --mdc-icon-button-size: 36px;
      --mdc-icon-size: 20px;
      color: var(--primary-text-color);
    }

    .layout {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 24px 8px;
      --spacing: 24px;
    }

    .layout.has-heading {
      margin-top: var(--spacing);
    }

    .heading {
      position: relative;
      flex: 1;
      width: 100%;
      max-width: 700px;
      display: flex;
    }

    .heading > * {
      width: 100%;
      height: 100%;
    }

    .badges {
      position: relative;
      flex: 1;
      display: flex;
    }

    .container:not(.edit-mode) .badges.scroll {
      overflow: auto;
      max-width: 100%;
      scrollbar-color: var(--scrollbar-thumb-color) transparent;
      scrollbar-width: none;
      mask-image: linear-gradient(
        90deg,
        transparent 0%,
        black 16px,
        black calc(100% - 16px),
        transparent 100%
      );
    }

    hui-view-badges {
      width: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      --badges-aligmnent: flex-start;
    }

    /* Layout */
    .layout {
      align-items: flex-start;
    }

    .layout.center {
      align-items: center;
    }

    .layout .heading {
      --card-text-align: start;
    }

    .layout.center .heading {
      --card-text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .layout.center hui-view-badges {
      --badges-aligmnent: center;
    }

    .container:not(.edit-mode) .layout.badges-scroll hui-view-badges {
      --badges-wrap: nowrap;
      --badges-aligmnent: flex-start;
      --badge-padding: 16px;
    }

    .container:not(.edit-mode) .layout.center.badges-scroll hui-view-badges {
      --badges-aligmnent: space-around;
    }

    @media (min-width: 768px) {
      .layout.responsive.has-heading {
        flex-direction: row;
        align-items: flex-end;
      }
      .layout.responsive.has-heading .badges.scroll {
        mask-image: none;
        padding: 0;
      }
      .container:not(.edit-mode)
        .layout.responsive.badges-scroll.has-heading
        hui-view-badges {
        --badges-wrap: wrap;
        --badges-aligmnent: flex-end;
        --badge-padding: 0;
      }
      .layout.responsive.has-heading hui-view-badges {
        --badges-aligmnent: flex-end;
      }
    }

    .layout.badges-top {
      flex-direction: column-reverse;
    }

    .layout.badges-top.has-badges {
      margin-top: 0;
    }

    @media (min-width: 768px) {
      .layout.responsive.badges-top.has-heading {
        flex-direction: row;
        align-items: flex-start;
        margin-top: var(--spacing);
      }
    }

    .container.edit-mode {
      padding: 8px;
      border-radius: var(--ha-card-border-radius, 12px);
      border: 2px dashed var(--divider-color);
      border-start-end-radius: 0;
    }

    .container.edit-mode .content {
      min-height: 36px;
    }

    .add {
      position: relative;
      display: flex;
      flex-direction: row;
      align-items: center;
      outline: none;
      gap: 8px;
      height: 36px;
      padding: 6px 20px 6px 20px;
      box-sizing: border-box;
      width: auto;
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: transparent;
      border-width: 2px;
      border-style: dashed;
      border-color: var(--primary-color);
      --mdc-icon-size: 18px;
      cursor: pointer;
      font-size: var(--ha-font-size-m);
      color: var(--primary-text-color);
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
    }

    .add:focus {
      border-style: solid;
    }

    .dragging {
      pointer-events: none;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header": HuiViewHeader;
  }
}
