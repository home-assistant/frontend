import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

@customElement("ha-header-bar")
export class HaHeaderBar extends LitElement {
  protected render() {
    return html`<header class="header-bar">
      <div class="header-bar__row">
        <section class="header-bar__section" id="navigation">
          <slot name="navigationIcon"></slot>
          <span class="header-bar__title">
            <slot name="title"></slot>
          </span>
        </section>
        <section
          class="header-bar__section header-bar__section--end"
          id="actions"
          role="toolbar"
        >
          <slot name="actionItems"></slot>
        </section>
      </div>
    </header>`;
  }

  static override styles = css`
    :host {
      display: block;
    }

    .header-bar {
      box-sizing: border-box;
      color: var(--app-header-text-color, var(--primary-text-color));
      background-color: var(
        --app-header-background-color,
        var(--primary-background-color)
      );
      padding: var(--header-bar-padding);
    }

    .header-bar__row {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      width: 100%;
      height: var(--header-height);
    }

    .header-bar__section {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      min-width: 0;
      height: 100%;
      padding: 0 var(--ha-space-3);
    }

    #navigation {
      flex: 1 1 auto;
    }

    .header-bar__section--end {
      flex: none;
      justify-content: flex-end;
    }

    .header-bar__title {
      display: block;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--ha-font-size-xl);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--header-height);
      padding-inline-start: var(--ha-space-6);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-header-bar": HaHeaderBar;
  }
}
