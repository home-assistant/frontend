import { customElement, property } from "lit/decorators";
import { MdTabs } from "@material/web/tabs/tabs";
import { css } from "lit";
import "./ha-icon-button-prev";
import "./ha-icon-button-next";
import { HomeAssistant } from "../types";

@customElement("ha-md-tabs")
export class HaMdTabs extends MdTabs {
  @property({ attribute: false }) public hass!: HomeAssistant;

  // @property({ attribute: false }) public buttons: boolean = false;

  /* protected render() {
    return html`
      ${this.buttons
        ? html`<ha-icon-button-prev
            .label=${this.hass?.localize(
              "ui.panel.lovelace.components.energy_period_selector.previous"
            ) || "Prev"}
            @click=${this._pickPrevious}
          ></ha-icon-button-prev>`
        : nothing}
      ${super.render()}
      ${this.buttons
        ? html`<ha-icon-button-next
            .label=${this.hass?.localize(
              "ui.panel.lovelace.components.energy_period_selector.next"
            ) || "Next"}
            @click=${this._pickNext}
          ></ha-icon-button-next>`
        : nothing}
    `;
  } */

  private _pickPrevious() {
    this.activeTabIndex -= 1;
    this.scrollToTab();
  }

  private _pickNext() {
    this.activeTabIndex += 1;
    this.scrollToTab();
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
      }

      :host {
        scroll-behavior: unset;
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
