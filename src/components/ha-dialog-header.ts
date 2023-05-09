import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-dialog-header")
export class HaDialogHeader extends LitElement {
  protected render() {
    return html`
      <header class="header">
        <div class="header-bar">
          <section class="header-navigation-icon">
            <slot name="navigationIcon"></slot>
          </section>
          <section class="header-title">
            <slot name="title"></slot>
          </section>
          <section class="header-action-items">
            <slot name="actionItems"></slot>
          </section>
        </div>
        <slot></slot>
      </header>
    `;
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
        }
        :host([show-border]) {
          border-bottom: 1px solid
            var(--mdc-dialog-scroll-divider-color, rgba(0, 0, 0, 0.12));
        }
        .header .header-bar {
          height: var(--header-height);
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 4px;
          box-sizing: border-box;
        }
        .header-navigation-icon {
          flex: none;
          min-width: 16px;
          height: 100%;
          display: flex;
          flex-direction: row;
        }
        .header-title {
          flex: 1;
          font-size: var(--mdc-typography-headline6-font-size, 1.25rem);
          line-height: var(--mdc-typography-headline6-line-height, 2rem);
          font-weight: var(--mdc-typography-headline6-font-weight, 500);
          letter-spacing: 0.0125em;
          padding: 0px 4px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .header-action-items {
          flex: none;
          min-width: 16px;
          height: 100%;
          display: flex;
          flex-direction: row;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-header": HaDialogHeader;
  }
}
