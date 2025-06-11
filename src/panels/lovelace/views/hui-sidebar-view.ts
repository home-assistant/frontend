import { mdiArrowLeft, mdiArrowRight, mdiPlus } from "@mdi/js";
import type { PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { property, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LovelaceViewElement } from "../../../data/lovelace";
import type { LovelaceViewConfig } from "../../../data/lovelace/config/view";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-view-badges";
import type { HuiCard } from "../cards/hui-card";
import type { HuiCardOptions } from "../components/hui-card-options";
import { replaceCard } from "../editor/config-util";
import type { Lovelace } from "../types";

export class SideBarView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() private _config?: LovelaceViewConfig;

  private _mqlListenerRef?: () => void;

  private _mql?: MediaQueryList;

  public connectedCallback() {
    super.connectedCallback();
    this._mql = window.matchMedia("(min-width: 760px)");
    this._mqlListenerRef = this._createCards.bind(this);
    this._mql.addListener(this._mqlListenerRef);
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._mql?.removeListener(this._mqlListenerRef!);
    this._mqlListenerRef = undefined;
    this._mql = undefined;
  }

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (this.lovelace?.editMode) {
      import("./default-view-editable");
    }

    if (changedProperties.has("cards")) {
      this._createCards();
    }

    if (
      !changedProperties.has("lovelace") &&
      !changedProperties.has("_config")
    ) {
      return;
    }

    const oldLovelace = changedProperties.get("lovelace") as
      | Lovelace
      | undefined;

    if (
      (!changedProperties.has("cards") &&
        oldLovelace?.config !== this.lovelace?.config) ||
      (oldLovelace && oldLovelace?.editMode !== this.lovelace?.editMode)
    ) {
      this._createCards();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hui-view-badges
        .hass=${this.hass}
        .badges=${this.badges}
        .lovelace=${this.lovelace}
        .viewIndex=${this.index}
        show-add-label
      ></hui-view-badges>
      <div
        class="container ${this.lovelace?.editMode ? "edit-mode" : ""}"
      ></div>
      ${this.lovelace?.editMode
        ? html`
            <ha-fab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              extended
              @click=${this._addCard}
            >
              <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            </ha-fab>
          `
        : ""}
    `;
  }

  private _addCard(): void {
    fireEvent(this, "ll-create-card");
  }

  private _createCards(): void {
    const mainDiv = document.createElement("div");
    mainDiv.id = "main";

    let sidebarDiv: HTMLDivElement;
    if (this._mql?.matches) {
      sidebarDiv = document.createElement("div");
      sidebarDiv.id = "sidebar";
    } else {
      sidebarDiv = mainDiv;
    }

    if (this.hasUpdated) {
      const oldMain = this.renderRoot.querySelector("#main");
      const oldSidebar = this.renderRoot.querySelector("#sidebar");
      const container = this.renderRoot.querySelector(".container")!;
      if (oldMain) {
        container.removeChild(oldMain);
      }
      if (oldSidebar) {
        container.removeChild(oldSidebar);
      }
      container.appendChild(mainDiv);
      container.appendChild(sidebarDiv);
    } else {
      this.updateComplete.then(() => {
        const container = this.renderRoot.querySelector(".container")!;
        container.appendChild(mainDiv);
        container.appendChild(sidebarDiv);
      });
    }

    this.cards.forEach((card, idx) => {
      const cardConfig = this._config?.cards?.[idx];
      let element: HuiCard | HuiCardOptions;
      if (this.isStrategy || !this.lovelace?.editMode) {
        card.preview = false;
        element = card;
      } else {
        element = document.createElement("hui-card-options");
        element.hass = this.hass;
        element.lovelace = this.lovelace;
        element.path = [this.index!, idx];
        card.preview = true;
        const movePositionButton = document.createElement("ha-icon-button");
        movePositionButton.slot = "buttons";
        const moveIcon = document.createElement("ha-svg-icon");
        moveIcon.path =
          cardConfig?.view_layout?.position !== "sidebar"
            ? mdiArrowRight
            : mdiArrowLeft;
        movePositionButton.appendChild(moveIcon);
        movePositionButton.addEventListener("click", () => {
          this.lovelace!.saveConfig(
            replaceCard(this.lovelace!.config, [this.index!, idx], {
              ...cardConfig!,
              view_layout: {
                position:
                  cardConfig?.view_layout?.position !== "sidebar"
                    ? "sidebar"
                    : "main",
              },
            })
          );
        });
        element.appendChild(movePositionButton);
        element.appendChild(card);
      }
      if (cardConfig?.view_layout?.position !== "sidebar") {
        mainDiv.appendChild(element);
      } else {
        sidebarDiv.appendChild(element);
      }
    });
  }

  static styles = css`
    :host {
      display: block;
      padding-top: 4px;
    }

    hui-view-badges {
      display: block;
      margin: 4px 8px 4px 8px;
      font-size: var(--ha-font-size-s);
    }

    .container {
      display: flex;
      justify-content: center;
      margin-left: 4px;
      margin-right: 4px;
    }

    .container.edit-mode {
      margin-bottom: 72px;
    }

    #main {
      max-width: 1620px;
      flex-grow: 2;
    }

    #sidebar {
      flex-grow: 1;
      flex-shrink: 0;
      max-width: 380px;
    }

    .container > div {
      min-width: 0;
      box-sizing: border-box;
    }

    .container > div > *:not([hidden]) {
      display: block;
      margin: var(--masonry-view-card-margin, 4px 4px 8px);
    }

    @media (max-width: 500px) {
      .container > div > * {
        margin-left: 0;
        margin-right: 0;
      }
    }

    ha-fab {
      position: fixed;
      right: calc(16px + var(--safe-area-inset-right));
      bottom: calc(16px + var(--safe-area-inset-bottom));
      inset-inline-end: calc(16px + var(--safe-area-inset-right));
      inset-inline-start: initial;
      z-index: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sidebar-view": SideBarView;
  }
}

customElements.define("hui-sidebar-view", SideBarView);
