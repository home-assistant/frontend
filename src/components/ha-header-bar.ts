// @ts-ignore
import topAppBarStyles from "@material/top-app-bar/dist/mdc.top-app-bar.min.css";
import { css, customElement, html, LitElement, unsafeCSS } from "lit-element";

@customElement("ha-header-bar")
export class HaHeaderBar extends LitElement {
  protected render() {
    return html`<header class="mdc-top-app-bar">
      <div class="mdc-top-app-bar__row">
        <section
          class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start"
          id="navigation"
        >
          <slot name="navigationIcon"></slot>
          <span class="mdc-top-app-bar__title">
            <slot name="title"></slot>
          </span>
        </section>
        <section
          class="mdc-top-app-bar__section mdc-top-app-bar__section--align-end"
          id="actions"
          role="toolbar"
        >
          <slot name="actionItems"></slot>
        </section>
      </div>
    </header>`;
  }

  static get styles() {
    return [
      unsafeCSS(topAppBarStyles),
      css`
        .mdc-top-app-bar {
          position: static;
          color: var(--mdc-theme-on-primary, #fff);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-header-bar": HaHeaderBar;
  }
}
