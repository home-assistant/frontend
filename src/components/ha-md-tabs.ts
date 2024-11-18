import { customElement, property, state } from "lit/decorators";
import { MdTabs } from "@material/web/tabs/tabs";
import { classMap } from "lit/directives/class-map";
import { css, html, nothing } from "lit";
import "./ha-icon-button-prev";
import "./ha-icon-button-next";
import type { HomeAssistant } from "../types";

@customElement("ha-md-tabs")
export class HaMdTabs extends MdTabs {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public buttons: boolean = false;

  @state() private tabWidth = 0;

  @state() private hasPrevious = true;

  @state() private hasNext = true;

  protected render() {
    return html`
      ${this.buttons
        ? html`<ha-icon-button-prev
            class=${classMap({
              hidden: !this.hasPrevious,
            })}
            .label=${this.hass?.localize(
              "ui.panel.lovelace.components.energy_period_selector.previous"
            ) || "Prev"}
            @click=${this._pickPrevious}
          ></ha-icon-button-prev>`
        : nothing}
      ${super.render()}
      ${this.buttons
        ? html`<ha-icon-button-next
            class=${classMap({
              hidden: !this.hasNext,
            })}
            .label=${this.hass?.localize(
              "ui.panel.lovelace.components.energy_period_selector.next"
            ) || "Next"}
            @click=${this._pickNext}
          ></ha-icon-button-next>`
        : nothing}
    `;
  }

  private _calculateTabWidth(): number {
    const slider = this.shadowRoot?.querySelector(".tabs");
    const tabs = slider
      ?.querySelector("slot")
      ?.assignedElements({ flatten: true });
    return tabs
      ? Array.from(tabs).reduce((sum, tab) => sum + tab.clientWidth, 0)
      : 0;
  }

  private _updatePreviousAndNext(slider) {
    const hasPrevious = slider!.scrollLeft !== 0;
    const hasNext = slider!.scrollLeft + slider!.clientWidth < this.tabWidth;

    if (this.hasPrevious !== hasPrevious) {
      this.hasPrevious = hasPrevious;
    }
    if (this.hasNext !== hasNext) {
      this.hasNext = hasNext;
    }
  }

  private _pickPrevious() {
    const slider = this.shadowRoot?.querySelector(".tabs");
    slider!.scrollLeft = Math.max(0, slider!.scrollLeft - 50);
    this._updatePreviousAndNext(slider);
  }

  private _pickNext() {
    const slider = this.shadowRoot?.querySelector(".tabs");
    slider!.scrollLeft = Math.min(slider!.clientWidth, slider!.scrollLeft + 50);
    this._updatePreviousAndNext(slider);
  }

  protected updated(c) {
    super.updated(c);
    const slider = this.shadowRoot?.querySelector(".tabs");
    let isDown = false;
    let isMoving = false;
    let startX;
    let scrollLeft;

    if (!slider) {
      return;
    }

    this.tabWidth = this._calculateTabWidth();
    this._updatePreviousAndNext(slider);

    slider!.addEventListener("mousedown", (e) => {
      isDown = true;
      slider!.classList.add("active");
      startX = e.pageX - (slider! as any).offsetLeft;
      scrollLeft = slider!.scrollLeft;
    });

    slider!.addEventListener("mouseleave", () => {
      isDown = false;
      isMoving = false;
      slider!.classList.remove("active");
    });

    slider!.addEventListener("mouseup", (e) => {
      if (isDown && isMoving) {
        e.preventDefault();
      }
      isDown = false;
      isMoving = false;
      slider!.classList.remove("active");
    });

    slider!.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - (slider! as any).offsetLeft;
      const walk = (x - startX) * 1;
      slider!.scrollLeft = scrollLeft - walk;
      this._updatePreviousAndNext(slider);
      if (x > 5) {
        isMoving = true;
      }
    });
  }

  static override styles = [
    ...super.styles,
    css`
      :host {
        --md-sys-color-primary: var(--primary-color);
        --md-sys-color-secondary: var(--secondary-color);
        --md-sys-color-surface: var(--card-background-color);
        --md-sys-color-on-surface: var(--primary-color);
        --md-sys-color-on-surface-variant: var(--secondary-color);
        --md-divider-thickness: 0px;
        --md-primary-tab-container-height: 56px;
        --md-secondary-tab-container-height: 56px;
      }
      ::-webkit-scrollbar {
        display: none;
      }

      :host {
        scroll-behavior: unset;

        flex-direction: row;
      }

      md-divider {
        display: none;
        position: absolute;
      }

      ha-icon-button-prev,
      ha-icon-button-next {
        margin: 3px;
      }

      ha-icon-button-prev.hidden,
      ha-icon-button-next.hidden {
        display: none;
      }

      :host(.inline) .tabs {
        justify-content: flex-start !important;
      }

      :host(.inline) ::slotted(*) {
        flex: unset !important;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-md-tabs": HaMdTabs;
  }
}
