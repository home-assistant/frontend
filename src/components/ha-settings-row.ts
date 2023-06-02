import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-settings-row")
export class HaSettingsRow extends LitElement {
  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean, attribute: "three-line" })
  public threeLine = false;

  protected render(): TemplateResult {
    return html`
      <div class="prefix-wrap">
        <slot name="prefix"></slot>
        <div
          class="body"
          ?two-line=${!this.threeLine}
          ?three-line=${this.threeLine}
        >
          <slot name="heading"></slot>
          <div class="secondary"><slot name="description"></slot></div>
        </div>
      </div>
      <div class="content"><slot></slot></div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: flex;
        padding: 0 16px;
        align-content: normal;
        align-self: auto;
        align-items: center;
      }
      .body {
        padding: 8px 16px 8px 0;
        overflow: hidden;
        display: var(--layout-vertical_-_display);
        flex-direction: var(--layout-vertical_-_flex-direction);
        justify-content: var(--layout-center-justified_-_justify-content);
        flex: var(--layout-flex_-_flex);
        flex-basis: var(--layout-flex_-_flex-basis);
      }
      .body[three-line] {
        min-height: var(--paper-item-body-three-line-min-height, 88px);
      }
      .body > * {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .body > .secondary {
        display: block;
        padding-top: 4px;
        font-family: var(
          --mdc-typography-body2-font-family,
          var(--mdc-typography-font-family, Roboto, sans-serif)
        );
        -webkit-font-smoothing: antialiased;
        font-size: var(--mdc-typography-body2-font-size, 0.875rem);
        font-weight: var(--mdc-typography-body2-font-weight, 400);
        line-height: normal;
        color: var(--secondary-text-color);
      }
      .body[two-line] {
        min-height: calc(
          var(--paper-item-body-two-line-min-height, 72px) - 16px
        );
        flex: 1;
      }
      .content {
        display: contents;
      }
      :host(:not([narrow])) .content {
        display: var(--settings-row-content-display, flex);
        justify-content: flex-end;
        flex: 1;
        padding: 16px 0;
      }
      .content ::slotted(*) {
        width: var(--settings-row-content-width);
      }
      :host([narrow]) {
        align-items: normal;
        flex-direction: column;
        border-top: 1px solid var(--divider-color);
        padding-bottom: 8px;
      }
      ::slotted(ha-switch) {
        padding: 16px 0;
      }
      .secondary {
        white-space: normal;
      }
      .prefix-wrap {
        display: var(--settings-row-prefix-display);
      }
      :host([narrow]) .prefix-wrap {
        display: flex;
        align-items: center;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-settings-row": HaSettingsRow;
  }
}
