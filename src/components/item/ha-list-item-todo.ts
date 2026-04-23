import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-checkbox";
import "../ha-ripple";
import { HaListItemBase } from "./ha-list-item-base";

declare global {
  interface HASSDomEvents {
    "item-toggle": { checked: boolean };
    "item-click": undefined;
  }
}

/**
 * @element ha-list-item-todo
 * @extends {HaListItemBase}
 *
 * @summary
 * Todo-shaped list row (role `listitem`). Combines an `<ha-checkbox>` with an
 * independent row-body click target. The consumer owns `checked` state — the
 * component fires events without persisting it. Space on the row toggles the
 * checkbox; Enter (or click on the row body) fires `item-click`. Use inside
 * `ha-list-base`, not `ha-list-box` (ARIA disallows interactive descendants
 * inside role `option`).
 *
 * @csspart checkbox - The `<ha-checkbox>`.
 * @csspart ripple - The ripple effect element.
 *
 * @attr {boolean} checked - Whether the checkbox is checked. Controlled by the consumer.
 * @attr {boolean} checkbox-end - Places the checkbox on the trailing side instead of the leading side.
 *
 * @fires item-toggle - Fired when the checkbox is toggled (click or Space). `detail: { checked }`.
 * @fires item-click - Fired when the row body is clicked (or Enter on the row).
 */
@customElement("ha-list-item-todo")
export class HaListItemTodo extends HaListItemBase {
  @property({ type: Boolean, reflect: true }) public checked = false;

  @property({ type: Boolean, attribute: "checkbox-end", reflect: true })
  public checkboxEnd = false;

  public override interactive = true;

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("click", this._onHostClick);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("click", this._onHostClick);
  }

  protected _renderBase(inner: TemplateResult): TemplateResult {
    const checkbox = html`<ha-checkbox
      part="checkbox"
      class="checkbox"
      .checked=${this.checked}
      .disabled=${this.disabled}
      @change=${this._onCheckboxChange}
      @click=${this._onCheckboxClick}
    ></ha-checkbox>`;
    return html`<div part="base" class="base" id="item">
      <ha-ripple
        part="ripple"
        for="item"
        ?disabled=${this.disabled}
      ></ha-ripple>
      ${this.checkboxEnd ? inner : checkbox}
      ${this.checkboxEnd ? checkbox : inner}
    </div>`;
  }

  private _toggleChecked(): void {
    if (this.disabled) {
      return;
    }
    this.checked = !this.checked;
    fireEvent(this, "item-toggle", { checked: this.checked });
  }

  private _onCheckboxClick = (ev: MouseEvent) => {
    // The checkbox handles its own toggle; stop the click from bubbling
    // to the host so `item-click` doesn't also fire.
    ev.stopPropagation();
  };

  private _onCheckboxChange = (ev: Event) => {
    ev.stopPropagation();
    const checkbox = ev.target as HTMLInputElement;
    const next = checkbox.checked;
    if (next === this.checked) {
      return;
    }
    this.checked = next;
    fireEvent(this, "item-toggle", { checked: next });
  };

  private _onHostClick = (ev: MouseEvent) => {
    if (this.disabled) {
      return;
    }
    // The checkbox's click handler stops propagation, so if we see the
    // click here it came from the row body.
    if (ev.defaultPrevented) {
      return;
    }
    fireEvent(this, "item-click");
  };

  private _onKeyDown = (ev: KeyboardEvent) => {
    if (this.disabled) {
      return;
    }
    // Space toggles the checkbox. Stop propagation so `ha-list-base`
    // doesn't also treat Space as "activate" and fire `item.click()`.
    if (ev.key === " " || ev.key === "Space") {
      ev.preventDefault();
      ev.stopPropagation();
      this._toggleChecked();
    }
    // Enter falls through — ha-list-base calls `this.click()`, the host
    // click handler fires `item-click`.
  };

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      :host {
        cursor: pointer;
        --ha-ripple-color: var(--primary-text-color);
      }
      :host([disabled]) {
        cursor: default;
      }
      .checkbox {
        flex: 0 0 auto;
        align-self: center;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-todo": HaListItemTodo;
  }
}
