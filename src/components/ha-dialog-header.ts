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
          <section class="header-content">
            <div class="header-title">
              <slot name="title"></slot>
            </div>
            <div class="header-subtitle">
              <slot name="subtitle"></slot>
            </div>
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
        .header-bar {
          display: flex;
          flex-direction: row;
          align-items: flex-start;
          padding: 12px;
          box-sizing: border-box;
        }
        .header-content {
          flex: 1;
          padding: 10px 4px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .header-title {
          font-size: var(--ha-font-size-xl);
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-normal);
        }
        .header-subtitle {
          font-size: var(--ha-font-size-m);
          line-height: 20px;
          color: var(--secondary-text-color);
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          header {
            padding-top: var(--safe-area-inset-top);
            padding-right: var(--safe-area-inset-right);
            padding-left: var(--safe-area-inset-left);
          }
          .header-bar {
            padding: 4px;
          }
        }
        .header-navigation-icon {
          flex: none;
          min-width: 8px;
          height: 100%;
          display: flex;
          flex-direction: row;
        }
        .header-action-items {
          flex: none;
          min-width: 8px;
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
