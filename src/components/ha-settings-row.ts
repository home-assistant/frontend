import { HasSlotController } from "@home-assistant/webawesome/dist/internal/slot";
import type { TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-settings-row")
export class HaSettingsRow extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public slim = false; // remove padding and min-height

  @property({ type: Boolean, attribute: "three-line" })
  public threeLine = false;

  @property({ type: Boolean, attribute: "wrap-heading", reflect: true })
  public wrapHeading = false;

  @property({ type: Boolean, reflect: true }) public empty = false;

  private readonly _hasSlotController = new HasSlotController(
    this,
    "description"
  );

  protected render(): TemplateResult {
    const hasDescription = this._hasSlotController.test("description");

    return html`
      <div class="prefix-wrap">
        <slot name="prefix"></slot>
        <div
          class="body"
          ?two-line=${!this.threeLine && hasDescription}
          ?three-line=${this.threeLine}
        >
          <slot name="heading"></slot>
          ${hasDescription
            ? html`<span class="secondary"
                ><slot name="description"></slot
              ></span>`
            : nothing}
        </div>
      </div>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      display: flex;
      padding: 0 var(--ha-space-4);
      align-content: normal;
      align-self: auto;
      align-items: center;
    }
    .body {
      padding-top: var(--settings-row-body-padding-top, var(--ha-space-2));
      padding-bottom: var(
        --settings-row-body-padding-bottom,
        var(--ha-space-2)
      );
      padding-left: 0;
      padding-inline-start: 0;
      padding-right: var(--ha-space-4);
      padding-inline-end: var(--ha-space-4);
      overflow: hidden;
      display: var(--layout-vertical_-_display, flex);
      flex-direction: var(--layout-vertical_-_flex-direction, column);
      justify-content: var(--layout-center-justified_-_justify-content, center);
      flex: var(--layout-flex_-_flex, 1);
      flex-basis: var(--layout-flex_-_flex-basis, 0.000000001px);
    }
    .body[three-line] {
      min-height: 88px;
    }
    :host(:not([wrap-heading])) body > * {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .body > .secondary {
      display: block;
      padding-top: var(--ha-space-1);
      font-family: var(
        --mdc-typography-body2-font-family,
        var(--mdc-typography-font-family, var(--ha-font-family-body))
      );
      font-size: var(--mdc-typography-body2-font-size, var(--ha-font-size-s));
      -webkit-font-smoothing: var(--ha-font-smoothing);
      -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
      font-weight: var(
        --mdc-typography-body2-font-weight,
        var(--ha-font-weight-normal)
      );
      line-height: normal;
      color: var(--secondary-text-color);
    }
    .body[two-line] {
      min-height: calc(72px - 16px);
      flex: 1;
    }
    .content {
      display: contents;
    }
    :host(:not([narrow])) .content {
      display: var(--settings-row-content-display, flex);
      justify-content: flex-end;
      flex: 1;
      min-width: 0;
      padding: var(--settings-row-content-padding-block, var(--ha-space-4)) 0;
    }
    :host([empty]) .content {
      display: none;
    }
    .content ::slotted(*) {
      width: var(--settings-row-content-width);
    }
    :host([narrow]) {
      align-items: normal;
      flex-direction: column;
      border-top: 1px solid var(--divider-color);
      padding-bottom: var(--ha-space-2);
    }
    ::slotted(ha-switch) {
      padding: var(--settings-row-switch-padding-block, var(--ha-space-4)) 0;
    }
    .secondary {
      white-space: normal;
    }
    .prefix-wrap {
      flex: var(--settings-row-prefix-flex, 1);
      display: var(--settings-row-prefix-display);
    }
    :host([narrow]) .prefix-wrap {
      display: flex;
      align-items: center;
    }
    :host([slim]),
    :host([slim]) .content,
    :host([slim]) ::slotted(ha-switch) {
      padding: 0;
    }
    :host([slim]) .body {
      min-height: 0;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-settings-row": HaSettingsRow;
  }
}
