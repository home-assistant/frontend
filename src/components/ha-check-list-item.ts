import { preventDefault } from "@fullcalendar/core/internal";
import { CheckListItemBase } from "@material/mwc-list/mwc-check-list-item-base";
import { styles as controlStyles } from "@material/mwc-list/mwc-control-list-item.css";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import "./ha-checkbox";

@customElement("ha-check-list-item")
export class HaCheckListItem extends CheckListItemBase {
  @property({ type: Boolean, attribute: "checkbox-disabled" })
  checkboxDisabled = false;

  @property({ type: Boolean })
  indeterminate = false;

  @property({ type: Boolean, attribute: "separate-checkbox-click" })
  separateCheckboxClick = false;

  async onChange(event) {
    super.onChange(event);
    fireEvent(this, event.type);
  }

  override render() {
    const text = this.renderText();
    const graphic =
      this.graphic && this.graphic !== "control" && !this.left
        ? this.renderGraphic()
        : nothing;
    const meta = this.hasMeta && this.left ? this.renderMeta() : nothing;
    const ripple = this.renderRipple();

    return html` ${ripple} ${graphic} ${this.left ? "" : text}
      <ha-checkbox
        tabindex=${this.separateCheckboxClick ? this.tabindex : -1}
        .checked=${this.selected}
        .indeterminate=${this.indeterminate}
        ?disabled=${this.disabled || this.checkboxDisabled}
        @change=${this.onChange}
        @click=${this.separateCheckboxClick ? stopPropagation : preventDefault}
        class=${this.left ? "left" : ""}
      >
      </ha-checkbox>
      ${this.left ? text : ""} ${meta}`;
  }

  static override styles = [
    styles,
    controlStyles,
    css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }

      :host([graphic="avatar"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="medium"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="large"]) .mdc-deprecated-list-item__graphic,
      :host([graphic="control"]) .mdc-deprecated-list-item__graphic {
        margin-inline-end: var(--mdc-list-item-graphic-margin, 16px);
        margin-inline-start: 0px;
        direction: var(--direction);
      }
      ha-checkbox {
        flex-shrink: 0;
        direction: var(--direction);
        margin-inline-start: auto;
        margin-inline-end: 0;
        height: 100%;
        justify-content: center;
      }
      ha-checkbox.left {
        margin-inline-start: 0;
      }
      .mdc-deprecated-list-item__graphic {
        margin-top: var(--check-list-item-graphic-margin-top);
      }
      :host([graphic="icon"]) .mdc-deprecated-list-item__graphic {
        margin-inline-start: 0;
        margin-inline-end: var(--mdc-list-item-graphic-margin, 32px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-check-list-item": HaCheckListItem;
  }
}
