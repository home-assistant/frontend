import "@home-assistant/webawesome/dist/components/button-group/button-group";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { ToggleButton } from "../types";
import "./ha-button";
import "./ha-svg-icon";

/**
 * @element ha-button-toggle-group
 *
 * @summary
 * A button-group with one active selection.
 *
 * @attr {ToggleButton[]} buttons - the button config
 * @attr {string} active - The value of the currently active button.
 * @attr {("small"|"medium")} size - The size of the buttons in the group.
 * @attr {("brand"|"neutral"|"success"|"warning"|"danger")} variant - The variant of the buttons in the group.
 *
 * @fires value-changed - Dispatched when the active button changes.
 */
@customElement("ha-button-toggle-group")
export class HaButtonToggleGroup extends LitElement {
  @property({ attribute: false }) public buttons!: ToggleButton[];

  @property() public active?: string;

  @property({ reflect: true }) size: "small" | "medium" = "medium";

  @property({ type: Boolean, reflect: true, attribute: "no-wrap" })
  public nowrap = false;

  @property({ type: Boolean, reflect: true, attribute: "full-width" })
  public fullWidth = false;

  @property() public variant:
    | "brand"
    | "neutral"
    | "success"
    | "warning"
    | "danger" = "brand";

  @property({ attribute: "active-variant" }) public activeVariant?:
    | "brand"
    | "neutral"
    | "success"
    | "warning"
    | "danger";

  protected render(): TemplateResult {
    return html`
      <wa-button-group childSelector="ha-button">
        ${this.buttons.map(
          (button) =>
            html`<ha-button
              iconTag="ha-svg-icon"
              class="icon"
              .variant=${this.active !== button.value || !this.activeVariant
                ? this.variant
                : this.activeVariant}
              .size=${this.size}
              .value=${button.value}
              @click=${this._handleClick}
              .title=${button.label}
              .appearance=${this.active === button.value ? "accent" : "filled"}
            >
              ${button.iconPath
                ? html`<ha-svg-icon
                    aria-label=${button.label}
                    .path=${button.iconPath}
                  ></ha-svg-icon>`
                : button.label}
            </ha-button>`
        )}
      </wa-button-group>
    `;
  }

  private _handleClick(ev): void {
    this.active = ev.currentTarget.value;
    fireEvent(this, "value-changed", { value: this.active });
  }

  static styles = css`
    :host {
      --mdc-icon-size: var(--button-toggle-icon-size, 20px);
    }

    :host([no-wrap]) wa-button-group::part(base) {
      flex-wrap: nowrap;
    }

    wa-button-group {
      padding: var(--ha-button-toggle-group-padding);
    }

    :host([full-width]) wa-button-group,
    :host([full-width]) wa-button-group::part(base) {
      width: 100%;
    }

    :host([full-width]) ha-button {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-toggle-group": HaButtonToggleGroup;
  }
}
