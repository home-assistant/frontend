import { mdiPlus } from "@mdi/js";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import type {
  LovelaceViewConfig,
  LovelaceViewElement,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import { HuiErrorCard } from "../cards/hui-error-card";
import type { Lovelace, LovelaceCard } from "../types";

let editCodeLoaded = false;

export class SideBarView extends LitElement implements LovelaceViewElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ type: Boolean }) public isStrategy = false;

  @property({ attribute: false }) public cards: Array<
    LovelaceCard | HuiErrorCard
  > = [];

  @state() private _config?: LovelaceViewConfig;

  public setConfig(config: LovelaceViewConfig): void {
    this._config = config;
  }

  public willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (this.lovelace?.editMode && !editCodeLoaded) {
      editCodeLoaded = true;
      import("./default-view-editable");
    }

    if (changedProperties.has("cards")) {
      this._createCards();
    }

    if (!changedProperties.has("lovelace")) {
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
      ${this.lovelace?.editMode && this.cards.length === 0
        ? html`
            <ha-fab
              .label=${this.hass!.localize(
                "ui.panel.lovelace.editor.edit_card.add"
              )}
              extended
              @click=${this._addCard}
              class=${classMap({
                rtl: computeRTL(this.hass!),
              })}
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
    const sidebarDiv = document.createElement("div");
    sidebarDiv.id = "sidebar";

    if (this.hasUpdated) {
      const oldMain = this.renderRoot.querySelector("#main");
      const oldSidebar = this.renderRoot.querySelector("#sidebar");
      if (oldMain) {
        this.renderRoot.removeChild(oldMain);
      }
      if (oldSidebar) {
        this.renderRoot.removeChild(oldSidebar);
      }
      this.renderRoot.appendChild(mainDiv);
      this.renderRoot.appendChild(sidebarDiv);
    } else {
      this.updateComplete.then(() => {
        this.renderRoot.appendChild(mainDiv);
        this.renderRoot.appendChild(sidebarDiv);
      });
    }

    this.cards.forEach((card: LovelaceCard, idx) => {
      const cardConfig = this._config?.cards?.[idx];
      if (this.isStrategy || !this.lovelace?.editMode) {
        card.editMode = false;
        if (cardConfig?.view_layout?.position !== "sidebar") {
          mainDiv.appendChild(card);
        } else {
          sidebarDiv.appendChild(card);
        }
        return;
      }

      const wrapper = document.createElement("hui-card-options");
      wrapper.hass = this.hass;
      wrapper.lovelace = this.lovelace;
      wrapper.path = [this.index!, 0];
      card.editMode = true;
      wrapper.appendChild(card);
      if (cardConfig?.view_layout?.position !== "sidebar") {
        mainDiv.appendChild(card);
      } else {
        sidebarDiv.appendChild(card);
      }
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        padding-top: 4px;
        margin-left: 4px;
        margin-right: 4px;
        height: 100%;
        box-sizing: border-box;
        justify-content: center;
      }

      #main {
        max-width: 1620px;
        flex-grow: 2;
      }

      #sidebar {
        flex-grow: 1;
        max-width: 380px;
      }

      :host > div {
        min-width: 0;
        box-sizing: border-box;
      }

      :host > div > * {
        display: block;
        margin: var(--masonry-view-card-margin, 4px 4px 8px);
      }

      @media (max-width: 760px) {
        :host {
          flex-direction: column;
        }
        #sidebar {
          max-width: unset;
        }
      }

      @media (max-width: 500px) {
        :host > div > * {
          margin-left: 0;
          margin-right: 0;
        }
      }

      ha-fab {
        position: sticky;
        float: right;
        right: calc(16px + env(safe-area-inset-right));
        bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 1;
      }

      ha-fab.rtl {
        float: left;
        right: auto;
        left: calc(16px + env(safe-area-inset-left));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-sidebar-view": SideBarView;
  }
}

customElements.define("hui-sidebar-view", SideBarView);
