import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

/**
 * @element ha-dialog-header
 * @extends {LitElement}
 *
 * @summary
 * Dialog header bar with a navigation icon, title, subtitle, and action items.
 *
 * @slot navigationIcon - Leading action, such as a close or back button.
 * @slot title - Title text.
 * @slot subtitle - Subtitle text.
 * @slot actionItems - Trailing actions, such as buttons or menus.
 * @slot - Content below the header bar.
 *
 * @cssprop --ha-dialog-header-white-space - White space of the title and subtitle, set to `normal` to let them wrap. Defaults to `nowrap`.
 * @cssprop --ha-dialog-header-title-height - Height of the title, set to `auto` when it wraps.
 * @cssprop --ha-dialog-header-title-color - Color of the title.
 * @cssprop --ha-dialog-header-subtitle-color - Color of the subtitle.
 *
 * @attr {("above"|"below")} subtitle-position - Position of the subtitle relative to the title. Defaults to "below".
 * @attr {boolean} show-border - Shows a border below the header.
 */
@customElement("ha-dialog-header")
export class HaDialogHeader extends LitElement {
  @property({ type: String, attribute: "subtitle-position" })
  public subtitlePosition: "above" | "below" = "below";

  @property({ type: Boolean, reflect: true, attribute: "show-border" })
  public showBorder = false;

  protected render() {
    const titleSlot = html`<div class="header-title">
      <slot name="title"></slot>
    </div>`;

    const subtitleSlot = html`<div class="header-subtitle">
      <slot name="subtitle"></slot>
    </div>`;

    return html`
      <header class="header">
        <div class="header-bar">
          <section class="header-navigation-icon">
            <slot name="navigationIcon"></slot>
          </section>
          <section class="header-content">
            ${
              this.subtitlePosition === "above"
                ? html`${subtitleSlot}${titleSlot}`
                : html`${titleSlot}${subtitleSlot}`
            }
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
          align-items: center;
          padding: 0 var(--ha-space-1);
          box-sizing: border-box;
        }
        .header-content {
          flex: 1;
          padding: 10px var(--ha-space-1);
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: var(--ha-space-12);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: var(--ha-dialog-header-white-space, nowrap);
        }
        .header-title {
          height: var(
            --ha-dialog-header-title-height,
            calc(var(--ha-font-size-xl) + var(--ha-space-1))
          );
          font-size: var(--ha-font-size-xl);
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-medium);
          color: var(--ha-dialog-header-title-color, var(--primary-text-color));
        }
        .header-subtitle {
          font-size: var(--ha-font-size-m);
          line-height: var(--ha-line-height-normal);
          color: var(
            --ha-dialog-header-subtitle-color,
            var(--secondary-text-color)
          );
        }
        @media all and (min-width: 450px) and (min-height: 500px) {
          .header-bar {
            padding: 0 var(--ha-space-2);
          }
        }
        .header-navigation-icon {
          flex: none;
          min-width: var(--ha-space-2);
          height: 100%;
          display: flex;
          flex-direction: row;
        }
        .header-action-items {
          flex: none;
          min-width: var(--ha-space-2);
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
