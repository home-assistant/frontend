import { mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import "../../../components/ha-ripple";
import type { LovelaceSectionElement } from "../../../data/lovelace";
import type { LovelaceCardConfig } from "../../../data/lovelace/config/card";
import type { LovelaceSectionConfig } from "../../../data/lovelace/config/section";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { HuiBadge } from "../badges/hui-badge";
import "../badges/hui-section-badges";
import type { HuiCard } from "../cards/hui-card";
import "../components/hui-card-edit-mode";
import { showEditCardDialog } from "../editor/card-editor/show-edit-card-dialog";
import type { Lovelace } from "../types";

@customElement("hui-heading-section")
export class HeadingSection
  extends LitElement
  implements LovelaceSectionElement
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: Lovelace;

  @property({ type: Number }) public index?: number;

  @property({ attribute: false, type: Number }) public viewIndex?: number;

  @property({ attribute: false }) public isStrategy = false;

  @property({ attribute: false }) public cards: HuiCard[] = [];

  @property({ attribute: false }) public badges: HuiBadge[] = [];

  @state() _config?: LovelaceSectionConfig;

  @state() _dragging = false;

  public setConfig(config: LovelaceSectionConfig): void {
    this._config = config;
  }

  render() {
    if (!this.cards || !this._config) return nothing;

    const editMode = Boolean(this.lovelace?.editMode && !this.isStrategy);

    const card = this.cards[0];

    const cardPath = [this.viewIndex!, this.index!, 0] as [
      number,
      number,
      number,
    ];

    const layout = this._config.layout ?? "responsive";
    const badgesPosition = this._config.badges_position ?? "bottom";

    return html`
      <div
        class="container ${classMap({
          "edit-mode": editMode,
          "top-margin": this._config!.top_margin ?? false,
          [layout]: true,
          [`badges-${badgesPosition}`]: true,
          "has-heading": !!card,
        })}"
      >
        ${card
          ? html`
              <div class="content">
                ${editMode
                  ? html`
                      <hui-card-edit-mode
                        .hass=${this.hass}
                        .lovelace=${this.lovelace!}
                        .path=${cardPath}
                        .hiddenOverlay=${this._dragging}
                        no-duplicate
                        no-move
                      >
                        ${card}
                      </hui-card-edit-mode>
                    `
                  : card}
              </div>
            `
          : editMode
            ? html`
                <button
                  class="add"
                  @click=${this._addCard}
                  aria-label=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_card"
                  )}
                  .title=${this.hass.localize(
                    "ui.panel.lovelace.editor.section.add_card"
                  )}
                >
                  <ha-ripple></ha-ripple>
                  <ha-svg-icon .path=${mdiPlus}></ha-svg-icon>
                  Add title
                </button>
              `
            : nothing}
        ${this.lovelace
          ? html`
              <div class="badges ${badgesPosition}">
                <hui-section-badges
                  .badges=${this.badges}
                  .hass=${this.hass}
                  .lovelace=${this.lovelace!}
                  .sectionIndex=${this.index!}
                  .viewIndex=${this.viewIndex!}
                ></hui-section-badges>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _addCard() {
    const cardConfig: LovelaceCardConfig = {
      type: "markdown",
      no_border: true,
      content:
        "# Hello {{ user }}\nToday is going to be warm and humid outside. Home Assistant will adjust the temperature throughout the day while you and your family is at home. ✨",
    };
    showEditCardDialog(this, {
      lovelaceConfig: this.lovelace!.config,
      saveConfig: (config) => this.lovelace!.saveConfig(config),
      cardConfig,
      path: [this.viewIndex!, this.index!],
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .container {
          --content-margin: 24px;
        }

        .container.top-margin {
          --content-margin: 80px;
        }

        .container .content {
          margin-top: var(--content-margin);
        }

        .content {
          position: relative;
          flex: 1;
          width: 100%;
          max-width: 700px;
          display: flex;
        }

        .content > * {
          width: 100%;
          height: 100%;
        }

        .badges {
          position: relative;
          flex: 1;
          display: flex;
        }

        hui-section-badges {
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          --badges-aligmnent: flex-start;
        }

        /* Center layout */
        .container.center {
          align-items: center;
        }

        .container.center .content {
          text-align: center;
        }

        .container.center hui-section-badges {
          --badges-aligmnent: center;
        }

        /* Badges top */
        .container.badges-top {
          flex-direction: column-reverse;
        }

        .container.badges-top:not(.top-margin) .content {
          margin: 0;
        }

        @media (min-width: 768px) {
          .container.responsive {
            flex-direction: row;
          }
          .container.responsive hui-section-badges {
            --badges-aligmnent: flex-end;
          }
          .container.responsive.badges-top hui-section-badges {
            justify-content: flex-start;
          }
          /* Align badges to heading if it is set */
          .container.responsive.badges-top .content,
          .container.responsive.badges-top.has-heading hui-section-badges {
            margin-top: var(--content-margin);
          }
        }

        .container.edit-mode {
          padding: 8px;
          border-radius: var(--ha-card-border-radius, 12px);
          border: 2px dashed var(--divider-color);
          min-height: var(--row-height);
        }

        .container.edit-mode .card {
          min-height: calc((var(--row-height) - var(--row-gap)) / 2);
        }

        .card:has(> *) {
          display: block;
        }

        .card:has(> *[hidden]) {
          display: none;
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
          height: 36px;
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
        }

        .add:focus {
          border-style: solid;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-heading-section": HeadingSection;
  }
}
