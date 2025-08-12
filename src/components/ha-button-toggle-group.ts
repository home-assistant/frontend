import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { ToggleButton } from "../types";
import "./ha-svg-icon";
import "./ha-button";
import "./ha-button-group";

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

  @property() public variant:
    | "brand"
    | "neutral"
    | "success"
    | "warning"
    | "danger" = "brand";

  protected render(): TemplateResult {
    return html`
      <ha-button-group .variant=${this.variant}>
        ${this.buttons.map(
          (button) =>
            html`<ha-button
              class="icon"
              size=${this.size}
              .value=${button.value}
              @click=${this._handleClick}
              .title=${button.label}
              .appearance=${this.active === button.value ? "accent" : "filled"}
            >
              ${button.iconPath
                ? html` <ha-svg-icon
                    label=${button.label}
                    .path=${button.iconPath}
                  ></ha-svg-icon>`
                : button.label}
            </ha-button>`
        )}
      </ha-button-group>
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-button-toggle-group": HaButtonToggleGroup;
  }
}
