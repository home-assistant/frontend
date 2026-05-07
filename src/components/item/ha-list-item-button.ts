import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
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

  public override activate(): void {
    this.renderRoot.querySelector<HTMLElement>("#item")?.click();
  }

  protected _renderBase(inner: TemplateResult): TemplateResult {
    if (this.href !== undefined) {
      return html`<a
        part="base"
        class="base interactive"
        id="item"
        href=${ifDefined(this.disabled ? undefined : this.href)}
        target=${ifDefined(this.target)}
        rel=${ifDefined(this.rel)}
        download=${ifDefined(this.download)}
        tabindex="-1"
        aria-disabled=${this.disabled ? "true" : "false"}
      >
        ${this._renderRipple()}${inner}
      </a>`;
    }
    return html`<button
      part="base"
      class="base interactive"
      id="item"
      type="button"
      ?disabled=${this.disabled}
      tabindex="-1"
    >
      ${this._renderRipple()}${inner}
    </button>`;
  }

  private _renderRipple() {
    return html`<ha-ripple
      part="ripple"
      for="item"
      ?disabled=${this.disabled}
    ></ha-ripple>`;
  }

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
      .base.interactive {
        width: 100%;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: inherit;
        text-decoration: none;
        appearance: none;
        cursor: inherit;
      }
      :host([disabled]) .base.interactive {
        color: var(--disabled-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-list-item-button": HaListItemButton;
  }
}
