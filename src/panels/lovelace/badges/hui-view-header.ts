import { mdiPlus } from "@mdi/js";
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
import type { HuiCard } from "../cards/hui-card";
import "../components/hui-badge-edit-mode";
import { replaceView } from "../editor/config-util";
import type { Lovelace } from "../types";
import type { HuiBadge } from "./hui-badge";
import "./hui-view-badges";

@customElement("hui-view-header")
export class HuiViewHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace!: Lovelace;

  @property({ attribute: false }) public card?: HuiCard;

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @property({ attribute: false }) public config?: LovelaceViewHeaderConfig;

  @property({ attribute: false }) public viewIndex!: number;

  private _checkAllHidden() {
    const allHidden =
      !this.lovelace.editMode && this.badges.every((badges) => badges.hidden);
    this.toggleAttribute("hidden", allHidden);
  }

  private _badgeVisibilityChanged = () => {
    this._checkAllHidden();
  };

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
    if (changedProperties.has("badges") || changedProperties.has("lovelace")) {
      this._checkAllHidden();
    }

    if (changedProperties.has("config")) {
      if (this.config?.card) {
        this.card = this._createCardElement(this.config.card);
      } else {
        this.card = undefined;
      }
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
      no_border: true,
      content:
        "# Hello {{ user }}\nToday is going to be warm and humid outside. Home Assistant will adjust the temperature throughout the day while you and your family is at home. ✨",
    };

    // Todo: open edit card dialog
    const newConfig = { ...this.config };
    newConfig.card = cardConfig;
    this._saveHeaderConfig(newConfig);
  }

  private _deleteCard(ev) {
    ev.stopPropagation();
    const newConfig = { ...this.config };
    delete newConfig.card;
    this._saveHeaderConfig(newConfig);
  }

  private _editCard(ev) {
    ev.stopPropagation();
    // Todo: open edit card dialog
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

  render() {
    if (!this.lovelace) return nothing;

    const editMode = Boolean(this.lovelace?.editMode);

    const card = this.card;

    const layout = this.config?.layout ?? "center";
    const badgesPosition = this.config?.badges_position ?? "bottom";

    const hasHeading = card !== undefined;
    const hasBadges = this.badges.length > 0;

    return html`
      <div class="container ${editMode ? "edit-mode" : ""}">
        <div
          class="layout ${classMap({
            "extra-space": this.config?.extra_space ?? false,
            [layout]: true,
            [`badges-${badgesPosition}`]: true,
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
                              "ui.panel.lovelace.editor.section.add_title"
                            )}
                          </button>
                        `
                    : card}
                </div>
              `
            : nothing}
          ${this.lovelace && (editMode || this.badges.length > 0)
            ? html`
                <div class="badges ${badgesPosition}">
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

    .layout {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 24px 8px;
      --spacing: 24px;
    }

    .layout.has-heading,
    .layout.extra-space {
      margin-top: var(--spacing);
    }

    .layout.extra-space {
      --spacing: 80px;
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
      text-align: left;
    }

    .layout.center .heading {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .layout.center hui-view-badges {
      --badges-aligmnent: center;
    }

    @media (min-width: 768px) {
      .layout.responsive.has-heading {
        flex-direction: row;
        align-items: flex-end;
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

    .layout.badges-top.extra-space {
      margin-top: var(--spacing);
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
    }

    .container.edit-mode .content {
      min-height: 36px;
    }

    .add {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: row;
      outline: none;
      background: none;
      cursor: pointer;
      border-radius: var(--ha-card-border-radius, 12px);
      border: 2px dashed var(--primary-color);
      min-height: 36px;
      gap: 8px;
      padding: 0 10px;
      --ha-ripple-color: var(--primary-color);
      --ha-ripple-hover-opacity: 0.04;
      --ha-ripple-pressed-opacity: 0.12;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 400;
      line-height: 20px;
      width: auto;
    }

    .add:focus {
      border-style: solid;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-view-header": HuiViewHeader;
  }
}
