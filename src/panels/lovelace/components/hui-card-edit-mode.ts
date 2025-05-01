import {
  mdiContentCopy,
  mdiContentCut,
  mdiCursorMove,
  mdiDelete,
  mdiDotsVertical,
  mdiPencil,
  mdiPlusCircleMultipleOutline,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { LovelaceCardPath } from "../editor/lovelace-path";
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

  @property({ type: Boolean, attribute: "no-move" })
  public noMove = false;

  @state()
  public _menuOpened = false;

  @state()
  public _hover = false;

  @state()
  public _focused = false;

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

  private _documentClicked = (ev) => {
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
          menu-corner="END"
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
          ${this.noMove
            ? nothing
            : html`
                <ha-list-item
                  graphic="icon"
                  @click=${this._handleAction}
                  .action=${"copy"}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiContentCopy}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.copy"
                  )}
                </ha-list-item>
                <ha-list-item
                  graphic="icon"
                  @click=${this._handleAction}
                  .action=${"cut"}
                >
                  <ha-svg-icon
                    slot="graphic"
                    .path=${mdiContentCut}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.lovelace.editor.edit_card.cut"
                  )}
                </ha-list-item>
              `}
          ${this.noDuplicate && this.noEdit && this.noMove
            ? nothing
            : html`<li divider role="separator"></li>`}
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
    switch (ev.currentTarget.action) {
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
    fireEvent(this, "ll-duplicate-card", { path: this.path! });
  }

  private _editCard(): void {
    fireEvent(this, "ll-edit-card", { path: this.path! });
  }

  private _cutCard(): void {
    fireEvent(this, "ll-copy-card", { path: this.path! });
    fireEvent(this, "ll-delete-card", { path: this.path!, silent: true });
  }

  private _copyCard(): void {
    fireEvent(this, "ll-copy-card", { path: this.path! });
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
