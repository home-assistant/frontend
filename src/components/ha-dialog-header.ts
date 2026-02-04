import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

@customElement("ha-dialog-header")
export class HaDialogHeader extends LitElement {
  @property({ type: String, attribute: "subtitle-position" })
  public subtitlePosition: "above" | "below" = "below";

  @property({ type: Boolean, reflect: true, attribute: "show-border" })
  public showBorder = false;

  @property({ type: Boolean, attribute: "clickable-header" })
  public clickableHeader = false;

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
          <section
            class=${classMap({
              "header-content": true,
              "header-clickable": this.clickableHeader,
            })}
            @click=${this._headerClicked}
          >
            ${this.subtitlePosition === "above"
              ? html`${subtitleSlot}${titleSlot}`
              : html`${titleSlot}${subtitleSlot}`}
          </section>
          <section class="header-action-items">
            <slot name="actionItems"></slot>
          </section>
        </div>
        <slot></slot>
      </header>
    `;
  }

  private _headerClicked(e: Event) {
    if (this.clickableHeader) {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent("header-click"));
    }
  }

  static get styles() {
    return [
      css`
        :host {
          display: block;
          --ha-dialog-header-title-font-size: var(--ha-font-size-xl);
          --ha-dialog-header-subtitle-font-size: var(--ha-font-size-m);
          --ha-dialog-header-click-color: var(
            --ha-color-fill-neutral-quiet-resting
          );
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
          white-space: nowrap;
        }
        .header-content.header-clickable {
          cursor: pointer;
          padding: 0 var(--ha-space-1);
        }
        @media (hover: hover) {
          .header-content.header-clickable:hover {
            cursor: pointer;
            background-color: var(--ha-dialog-header-click-color);
            transition: background-color 0.15s ease-in-out;
            --ha-dialog-header-click-border-radius: var(--ha-border-radius-lg);
            -webkit-border-radius: var(--ha-dialog-header-click-border-radius);
            -moz-border-radius: var(--ha-dialog-header-click-border-radius);
            border-radius: var(--ha-dialog-header-click-border-radius);
          }
        }
        .header-title {
          height: var(
            --ha-dialog-header-title-height,
            calc(var(--ha-dialog-header-title-font-size) + var(--ha-space-1))
          );
          font-size: var(--ha-dialog-header-title-font-size);
          line-height: var(--ha-line-height-condensed);
          font-weight: var(--ha-font-weight-medium);
          color: var(--ha-dialog-header-title-color, var(--primary-text-color));
        }
        .header-subtitle {
          font-size: var(--ha-dialog-header-subtitle-font-size);
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
