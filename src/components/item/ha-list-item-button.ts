import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { keyed } from "lit/directives/keyed";
import { isInteractiveElement } from "../../common/dom/is-interactive-element";
import "../ha-ripple";
import { HaListItemBase } from "./ha-list-item-base";

/**
 * @element ha-list-item-button
 * @extends {HaListItemBase}
 *
 * @summary
 * Interactive list row. Renders an inner `<a>` when `href` is set, otherwise
 * a `<button>`. The full row is the hit target. When placed in a list using
 * roving tabindex, the host is the tab stop and the inner element carries
 * `tabindex="-1"`. For a non-interactive row, use `ha-list-item-base`.
 *
 * Only the headline and supporting text are rendered inside the `<a>` or
 * `<button>`, and its hit area is stretched over the whole row. The `start`
 * and `end` slots sit next to it, so controls placed there stay separate
 * controls for assistive technology. Slotted elements are raised above the
 * stretched hit area, except for icons, badges, plain text and empty dividers
 * without `tabindex`, so clicks and hover on those reach the row. To keep such
 * an element clickable on its own, like a drag handle, give it `z-index: 1`.
 *
 * Subclasses customize the row with `_renderStart()`, `_renderContent()` and
 * `_renderEnd()`. `_renderInner()` is not used.
 *
 * @csspart base - The row container.
 * @csspart control - The inner `<a>` or `<button>`.
 * @csspart ripple - The ripple effect element.
 *
 * @attr {string} href - URL. When set, renders an `<a>` instead of a `<button>`.
 * @attr {string} target - Anchor `target` attribute (requires `href`).
 * @attr {string} rel - Anchor `rel` attribute (requires `href`).
 * @attr {string} download - Anchor `download` attribute (requires `href`).
 */
@customElement("ha-list-item-button")
export class HaListItemButton extends HaListItemBase {
  public override interactive = true;

  @property({ type: String }) public href?: string;

  @property({ type: String }) public target?: string;

  @property({ type: String }) public rel?: string;

  @property({ type: String }) public download?: string;

  @query("#item") private _item?: HTMLElement;

  public override activate(): void {
    this._item?.click();
  }

  protected override render(): TemplateResult {
    return this._renderBase(this._renderContent());
  }

  protected _renderBase(content: TemplateResult): TemplateResult {
    // The ripple binds to #item on connect, so render it after the control and
    // recreate it with the control
    return html`<div part="base" class="base" @click=${this._handleBaseClick}>
      ${this._renderStart()}${this._renderControl(content)}${keyed(
        `${this.href !== undefined}-${this.interactive}`,
        this._renderRipple()
      )}${this._renderEnd()}
    </div>`;
  }

  /** Renders the native `<a>` or `<button>` around the row content. */
  protected _renderControl(content: TemplateResult): TemplateResult {
    if (this.href !== undefined) {
      return html`<a
        part="control"
        class="control"
        id="item"
        href=${ifDefined(this.disabled ? undefined : this.href)}
        target=${ifDefined(this.target)}
        rel=${ifDefined(this.rel)}
        download=${ifDefined(this.download)}
        tabindex="-1"
        aria-disabled=${this.disabled ? "true" : "false"}
      >
        ${content}
      </a>`;
    }
    return html`<button
      part="control"
      class="control"
      id="item"
      type="button"
      ?disabled=${this.disabled}
      tabindex="-1"
    >
      ${content}
    </button>`;
  }

  private _renderRipple() {
    return html`<ha-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}
    ></ha-ripple>`;
  }

  // Raised slot content that is not a control, like a wrapper without
  // controls, still activates the row
  private _handleBaseClick(ev: MouseEvent): void {
    const item = this._item;
    if (!item || this.disabled) {
      return;
    }
    const path = ev.composedPath();
    const baseIndex = path.indexOf(ev.currentTarget as EventTarget);
    for (const node of path.slice(0, baseIndex)) {
      if (node === item || isInteractiveElement(node)) {
        return;
      }
    }
    ev.stopPropagation();
    // A copy of the event keeps modifier keys, so links can open in a new tab
    item.dispatchEvent(new MouseEvent("click", ev));
  }

  static styles: CSSResultGroup = [
    HaListItemBase.styles,
    css`
      :host {
        cursor: pointer;
        --ha-ripple-color: var(--primary-text-color);
        /* Smooth the hover when moving between controls in the row */
        --ha-ripple-hover-duration: var(--ha-animation-duration-fast);
      }
      :host([disabled]) {
        cursor: default;
      }
      .base {
        isolation: isolate;
      }
      .control {
        display: flex;
        align-items: center;
        align-self: stretch;
        flex: 1 1 auto;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: inherit;
        text-decoration: none;
        appearance: none;
        cursor: inherit;
      }
      /* Stretch the hit area of the control over the whole row */
      .control::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: var(--ha-list-item-focus-radius);
      }
      .control:focus-visible {
        outline: none;
      }
      .control:focus-visible::before {
        outline: var(--ha-list-item-focus-width) solid var(--ha-color-focus);
        outline-offset: var(--ha-list-item-focus-offset);
      }
      /*
       * Slotted content is painted above the hit area, so it can be clicked.
       * Icons, badges, text and empty dividers go below it, so clicks on
       * them reach the row.
       * Some icons are positioned, so they need a negative z-index.
       */
      ::slotted([slot="start"]),
      ::slotted([slot="end"]) {
        position: relative;
        z-index: 1;
      }
      ::slotted(
        :is(
          ha-svg-icon,
          ha-icon,
          ha-icon-next,
          ha-state-icon,
          ha-domain-icon,
          ha-floor-icon,
          ha-spinner,
          ha-progress-ring,
          ha-user-badge,
          ha-person-badge,
          ha-tree-indicator,
          ha-app-icon,
          state-badge,
          img,
          span,
          div:empty
        ):not([tabindex])
      ) {
        z-index: -1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-button": HaListItemButton;
  }
}
