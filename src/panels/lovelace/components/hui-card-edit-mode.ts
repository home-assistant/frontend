import "@material/mwc-button";
import {
  mdiContentCopy,
  mdiContentCut,
  mdiCursorMove,
  mdiDelete,
  mdiDotsVertical,
  mdiPencil,
  mdiPlusCircleMultipleOutline,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import type { LovelaceCardPath } from "../editor/lovelace-path";
import {
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "../editor/lovelace-path";
import type { Lovelace } from "../types";

@customElement("hui-card-edit-mode")
export class HuiCardEditMode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Array }) public path!: LovelaceCardPath;

  @property({ type: Boolean, attribute: "hidden-overlay" })
  public hiddenOverlay = false;

  @property({ type: Boolean, attribute: "no-edit" })
  public noEdit = false;

  @property({ type: Boolean, attribute: "no-duplicate" })
  public noDuplicate = false;

  @state()
  public _menuOpened: boolean = false;

  @state()
  public _hover: boolean = false;

  @state()
  public _focused: boolean = false;

  @storage({
    key: "dashboardCardClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  private get _cards() {
    const containerPath = getLovelaceContainerPath(this.path!);
    return findLovelaceItems("cards", this.lovelace!.config, containerPath)!;
  }

  private _touchStarted = false;

  protected firstUpdated(): void {
    this.addEventListener("focus", () => {
      this._focused = true;
    });
    this.addEventListener("blur", () => {
      this._focused = false;
    });
    this.addEventListener("touchstart", () => {
      this._touchStarted = true;
    });
    this.addEventListener("touchend", () => {
      setTimeout(() => {
        this._touchStarted = false;
      }, 10);
    });
    this.addEventListener("mouseenter", () => {
      if (this._touchStarted) return;
      this._hover = true;
    });
    this.addEventListener("mouseout", () => {
      this._hover = false;
    });
    this.addEventListener("click", () => {
      this._hover = true;
      document.addEventListener("click", this._documentClicked);
    });
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this._documentClicked);
  }

  _documentClicked = (ev) => {
    this._hover = ev.composedPath().includes(this);
    document.removeEventListener("click", this._documentClicked);
  };

  protected render(): TemplateResult {
    const showOverlay =
      (this._hover || this._menuOpened || this._focused) && !this.hiddenOverlay;

    return html`
      <div class="card-wrapper" inert><slot></slot></div>
      <div class="card-overlay ${classMap({ visible: showOverlay })}">
        ${this.noEdit
          ? html`
              <div class="control">
                <div class="control-overlay"></div>
                <ha-svg-icon .path=${mdiCursorMove}> </ha-svg-icon>
              </div>
            `
          : html`
              <div
                class="control"
                @click=${this._handleOverlayClick}
                @keydown=${this._handleOverlayClick}
                tabindex="0"
              >
                <div class="control-overlay"></div>
                <ha-svg-icon .path=${mdiPencil}> </ha-svg-icon>
              </div>
            `}
        <ha-button-menu
          class="more"
          corner="BOTTOM_END"
          menuCorner="END"
          .path=${[this.path!]}
          @action=${this._handleAction}
          @opened=${this._handleOpened}
          @closed=${this._handleClosed}
        >
          <ha-icon-button slot="trigger" .path=${mdiDotsVertical}>
          </ha-icon-button>
          ${this.noEdit
            ? nothing
            : html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._handleAction}
                  .action=${"edit"}
                >
                  <ha-svg-icon slot="graphic" .path=${mdiPencil}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.edit"
                  )}
                </ha-list-item>
              `}
          ${this.noDuplicate
            ? nothing
            : html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._handleAction}
                  .action=${"duplicate"}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiPlusCircleMultipleOutline}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.duplicate"
                  )}
                </ha-list-item>
              `}
          <ha-list-item
            graphic="icon"
            @click=${this._handleAction}
            .action=${"copy"}
          >
            <ha-svg-icon slot="graphic" .path=${mdiContentCopy}></ha-svg-icon>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.copy")}
          </ha-list-item>
          <ha-list-item
            graphic="icon"
            @click=${this._handleAction}
            .action=${"cut"}
          >
            <ha-svg-icon slot="graphic" .path=${mdiContentCut}></ha-svg-icon>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.cut")}
          </ha-list-item>
          <li divider role="separator"></li>
          <ha-list-item
            graphic="icon"
            class="warning"
            @click=${this._handleAction}
            .action=${"delete"}
          >
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.delete")}
            <ha-svg-icon
              class="warning"
              slot="graphic"
              .path=${mdiDelete}
            ></ha-svg-icon>
          </ha-list-item>
        </ha-button-menu>
      </div>
    `;
  }

  private _handleOpened() {
    this._menuOpened = true;
  }

  private _handleClosed() {
    this._menuOpened = false;
  }

  private _handleOverlayClick(ev): void {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    this._editCard();
  }

  private _handleAction(ev) {
    switch (ev.target.action) {
      case "edit":
        this._editCard();
        break;
      case "duplicate":
        this._duplicateCard();
        break;
      case "copy":
        this._copyCard();
        break;
      case "cut":
        this._cutCard();
        break;
      case "delete":
        this._deleteCard();
        break;
    }
  }

  private _duplicateCard(): void {
    const { cardIndex } = parseLovelaceCardPath(this.path!);
    const containerPath = getLovelaceContainerPath(this.path!);
    const cardConfig = this._cards![cardIndex];
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: containerPath,
      cardConfig,
    });
  }

  private _editCard(): void {
    fireEvent(this, "ll-edit-card", { path: this.path! });
  }

  private _cutCard(): void {
    this._copyCard();
    fireEvent(this, "ll-delete-card", { path: this.path!, silent: true });
  }

  private _copyCard(): void {
    const { cardIndex } = parseLovelaceCardPath(this.path!);
    const cardConfig = this._cards[cardIndex];
    this._clipboard = deepClone(cardConfig);
  }

  private _deleteCard(): void {
    fireEvent(this, "ll-delete-card", { path: this.path!, silent: false });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .card-overlay {
          position: absolute;
          opacity: 0;
          pointer-events: none;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 180ms ease-in-out;
        }

        .card-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .card-wrapper {
          position: relative;
          height: 100%;
          z-index: 0;
        }

        .control {
          outline: none !important;
          cursor: pointer;
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--ha-card-border-radius, 12px);
          z-index: 0;
        }
        .control-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.8;
          background-color: var(--primary-background-color);
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-card-border-radius, 12px);
          z-index: 0;
        }
        .control ha-svg-icon {
          display: flex;
          position: relative;
          color: var(--primary-text-color);
          border-radius: 50%;
          padding: 8px;
          background: var(--secondary-background-color);
          --mdc-icon-size: 20px;
        }
        .more {
          position: absolute;
          right: -6px;
          top: -6px;
          inset-inline-end: -6px;
          inset-inline-start: initial;
        }
        .more ha-icon-button {
          cursor: pointer;
          border-radius: 50%;
          background: var(--secondary-background-color);
          --mdc-icon-button-size: 32px;
          --mdc-icon-size: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-edit-mode": HuiCardEditMode;
  }
}
