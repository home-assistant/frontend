import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../ha-checkbox";
import "../ha-ripple";
import { HaListItemBase } from "./ha-list-item-base";

export type HaListItemOptionAppearance = "line" | "checkbox";

export type HaListItemOptionSelectionPosition = "start" | "end";

/**
 * @element ha-list-item-option
 * @extends {HaListItemBase}
 *
 * @summary
 * Selectable list row (role `option`). Selection state is driven by the parent
 * `ha-list-box`; reflects `aria-selected`. When `appearance="checkbox"`, renders
 * a decorative `<ha-checkbox>` (clicks on the row are handled by the listbox).
 *
 * @csspart checkbox - Wrapper around the `<ha-checkbox>` when `appearance="checkbox"`.
 * @csspart ripple - The ripple effect element.
 *
 * @cssprop --ha-list-item-selected-background - Background color when selected (`appearance="line"`).
 *
 * @attr {boolean} selected - Whether the option is selected. Set by the parent `ha-list-box`.
 * @attr {string} value - Value identifying the option.
 * @attr {("line"|"checkbox")} appearance - Visual style. "line" highlights the row; "checkbox" renders an `ha-checkbox`.
 * @attr {("start"|"end")} selection-position - Side the checkbox sits on when `appearance="checkbox"`.
 */
@customElement("ha-list-item-option")
export class HaListItemOption extends HaListItemBase {
  @property({ type: Boolean, reflect: true }) public selected = false;

  @property({ type: String }) public value?: string;

  @property({ type: String, reflect: true })
  public appearance: HaListItemOptionAppearance = "line";

  @property({ type: String, reflect: true, attribute: "selection-position" })
  public selectionPosition: HaListItemOptionSelectionPosition = "start";

  protected override readonly defaultRole = "option";

  public override interactive = true;

  public update(changed: Map<string, unknown>) {
    super.update(changed);
    if (changed.has("selected")) {
      this.setAttribute("aria-selected", this.selected ? "true" : "false");
    }
    if (changed.has("disabled")) {
      this.setAttribute("aria-disabled", this.disabled ? "true" : "false");
    }
  }

  protected _renderBase(inner: TemplateResult): TemplateResult {
    return html`<div part="base" class="base" id="item">
      ${this._renderRipple()}${this._renderCheckbox(
        "start"
      )}${inner}${this._renderCheckbox("end")}
    </div>`;
  }

  private _renderRipple() {
    return html`<ha-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}
    ></ha-ripple>`;
  }

  private _renderCheckbox(pos: HaListItemOptionSelectionPosition) {
    if (this.appearance !== "checkbox") {
      return nothing;
    }
    if (this.selectionPosition !== pos) {
      return nothing;
    }
    return html`<div
      part="checkbox"
      class="checkbox checkbox-${pos}"
      aria-hidden="true"
    >
      <ha-checkbox
        tabindex="-1"
        .checked=${this.selected}
        .disabled=${this.disabled}
      ></ha-checkbox>
    </div>`;
  }

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      :host {
        cursor: pointer;
        --ha-ripple-color: var(--primary-text-color);
        --ha-list-item-selected-background: var(
          --ha-color-fill-primary-quiet-resting,
          rgba(var(--rgb-primary-color), 0.08)
        );
      }
      :host([disabled]) {
        cursor: default;
      }
      .base {
        cursor: inherit;
      }
      :host([appearance="line"][selected]:not([disabled])) .base,
      :host([appearance="line"][active]:not([disabled])) .base {
        background-color: var(--ha-list-item-selected-background);
      }
      :host([appearance="line"][selected]:not([disabled])) {
        color: var(--primary-color);
      }
      .checkbox {
        display: flex;
        align-items: center;
        flex: 0 0 auto;
        pointer-events: none;
      }
      .checkbox ha-checkbox {
        pointer-events: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-option": HaListItemOption;
  }
}
