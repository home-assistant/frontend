import { css, customElement, html, LitElement, property } from "lit-element";
import { classMap } from "lit-html/directives/class-map";

@customElement("ha-config-section")
export class HaConfigSection extends LitElement {
  @property({ type: Boolean }) public isWide = false;

  @property({ type: Boolean }) public narrow?: boolean;

  @property({ type: Boolean, attribute: "no-header" }) public noHeader = false;

  protected render() {
    return html`
      <div
        class="content ${classMap({
          narrow: this.narrow !== undefined ? this.narrow : !this.isWide,
          "no-header": this.noHeader,
        })}"
      >
        <div class="heading">
          <div class="header"><slot name="header"></slot></div>
          <div class="intro"><slot name="introduction"></slot></div>
        </div>
        <div
          class="together layout ${classMap({
            narrow: !this.isWide,
            vertical: !this.isWide,
            horizontal: this.isWide,
          })}"
        >
          <div class="panel flex-auto"><slot></slot></div>
        </div>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      .content {
        padding: 28px 20px 0;
        max-width: 1040px;
        margin: 0 auto;
      }

      :host([side-by-side]) .content:not(.narrow) {
        display: flex;
      }

      .layout {
        display: flex;
      }

      :host([side-by-side]) .content:not(.narrow) .layout {
        width: 100%;
      }

      .horizontal {
        flex-direction: row;
      }

      .vertical {
        flex-direction: column;
      }

      .flex-auto {
        flex: 1 1 auto;
      }

      :host([side-by-side]) .content:not(.narrow) .heading {
        min-width: 400px;
        max-width: 400px;
        margin-right: 40px;
      }

      slot[name="header"]::slotted(*) {
        font-family: var(--paper-font-headline_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-headline_-_-webkit-font-smoothing
        );
        font-size: var(--paper-font-headline_-_font-size);
        font-weight: var(--paper-font-headline_-_font-weight);
        letter-spacing: var(--paper-font-headline_-_letter-spacing);
        line-height: var(--paper-font-headline_-_line-height);
        opacity: var(--dark-primary-opacity);
        padding-bottom: 8px;
      }

      .together {
        margin-top: 32px;
      }

      slot[name="introduction"]::slotted(*) {
        font-family: var(--paper-font-subhead_-_font-family);
        -webkit-font-smoothing: var(
          --paper-font-subhead_-_-webkit-font-smoothing
        );
        font-weight: var(--paper-font-subhead_-_font-weight);
        line-height: var(--paper-font-subhead_-_line-height);
        width: 100%;
        margin-right: 40px;
        opacity: var(--dark-primary-opacity);
        font-size: 14px;
        padding-bottom: 20px;
      }

      .panel {
        margin-top: -48px;
      }

      .panel ::slotted(*) {
        margin-top: 24px;
        display: block;
      }

      .narrow.content {
        max-width: 640px;
      }
      .narrow .together {
        margin-top: 20px;
      }
      .narrow slot[name="introduction"]::slotted(*) {
        padding-bottom: 20px;
        margin-right: 0;
        max-width: 500px;
      }

      .no-header.content {
        padding-top: 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section": HaConfigSection;
  }
}
