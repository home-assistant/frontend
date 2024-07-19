import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import {
  mdiContentCopy,
  mdiContentCut,
  mdiContentDuplicate,
  mdiDelete,
  mdiDotsVertical,
  mdiPencil,
} from "@mdi/js";
import deepClone from "deep-clone-simple";
import { CSSResultGroup, LitElement, TemplateResult, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { storage } from "../../../common/decorators/storage";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { showEditBadgeDialog } from "../editor/badge-editor/show-edit-badge-dialog";
import {
  LovelaceCardPath,
  findLovelaceItems,
  getLovelaceContainerPath,
  parseLovelaceCardPath,
} from "../editor/lovelace-path";
import { Lovelace } from "../types";
import { ensureBadgeConfig } from "../../../data/lovelace/config/badge";

@customElement("hui-badge-edit-mode")
export class HuiBadgeEditMode extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ type: Array }) public path!: LovelaceCardPath;

  @property({ type: Boolean }) public hiddenOverlay = false;

  @state()
  public _menuOpened: boolean = false;

  @state()
  public _hover: boolean = false;

  @state()
  public _focused: boolean = false;

  @storage({
    key: "dashboardBadgeClipboard",
    state: false,
    subscribe: false,
    storage: "sessionStorage",
  })
  protected _clipboard?: LovelaceCardConfig;

  private get _badges() {
    const containerPath = getLovelaceContainerPath(this.path!);
    return findLovelaceItems("badges", this.lovelace!.config, containerPath)!;
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
      <div class="badge-wrapper" inert><slot></slot></div>
      <div class="badge-overlay ${classMap({ visible: showOverlay })}">
        <div
          class="edit"
          @click=${this._editBadge}
          @keydown=${this._editBadge}
          tabindex="0"
        >
          <div class="edit-overlay"></div>
          <ha-svg-icon class="edit" .path=${mdiPencil}> </ha-svg-icon>
        </div>
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
          <ha-list-item graphic="icon">
            <ha-svg-icon
              slot="graphic"
              .path=${mdiContentDuplicate}
            ></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.lovelace.editor.edit_card.duplicate"
            )}
          </ha-list-item>
          <ha-list-item graphic="icon">
            <ha-svg-icon slot="graphic" .path=${mdiContentCopy}></ha-svg-icon>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.copy")}
          </ha-list-item>
          <ha-list-item graphic="icon">
            <ha-svg-icon slot="graphic" .path=${mdiContentCut}></ha-svg-icon>
            ${this.hass.localize("ui.panel.lovelace.editor.edit_card.cut")}
          </ha-list-item>
          <li divider role="separator"></li>
          <ha-list-item graphic="icon" class="warning">
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

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this._duplicateBadge();
        break;
      case 1:
        this._copyBadge();
        break;
      case 2:
        this._cutBadge();
        break;
      case 3:
        this._deleteBadge();
        break;
    }
  }

  private _cutBadge(): void {
    this._copyBadge();
    this._deleteBadge();
  }

  private _copyBadge(): void {
    const { cardIndex } = parseLovelaceCardPath(this.path!);
    const cardConfig = this._badges[cardIndex];
    this._clipboard = deepClone(cardConfig);
  }

  private _duplicateBadge(): void {
    const { cardIndex } = parseLovelaceCardPath(this.path!);
    const containerPath = getLovelaceContainerPath(this.path!);
    const badgeConfig = ensureBadgeConfig(this._badges![cardIndex]);
    showEditBadgeDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: this.lovelace!.saveConfig,
      path: containerPath,
      badgeConfig,
    });
  }

  private _editBadge(ev): void {
    if (ev.defaultPrevented) {
      return;
    }
    if (ev.type === "keydown" && ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    fireEvent(this, "ll-edit-badge", { path: this.path! });
  }

  private _deleteBadge(): void {
    fireEvent(this, "ll-delete-badge", { path: this.path! });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .badge-overlay {
          position: absolute;
          opacity: 0;
          pointer-events: none;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 180ms ease-in-out;
        }

        .badge-overlay.visible {
          opacity: 1;
          pointer-events: auto;
        }

        .badge-wrapper {
          position: relative;
          height: 100%;
          z-index: 0;
        }

        .edit {
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
        .edit-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.8;
          background-color: var(--primary-background-color);
          border-radius: var(--ha-card-border-radius, 12px);
          z-index: 0;
        }
        .edit ha-svg-icon {
          display: flex;
          position: relative;
          color: var(--primary-text-color);
          border-radius: 50%;
          padding: 4px;
          background: var(--secondary-background-color);
          --mdc-icon-size: 16px;
        }
        .more {
          position: absolute;
          right: -8px;
          top: -8px;
          inset-inline-end: -10px;
          inset-inline-start: initial;
        }
        .more ha-icon-button {
          cursor: pointer;
          border-radius: 50%;
          background: var(--secondary-background-color);
          --mdc-icon-button-size: 24px;
          --mdc-icon-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-badge-edit-mode": HuiBadgeEditMode;
  }
}
