import {
  customElement,
  LitElement,
  html,
  unsafeCSS,
  css,
  property,
} from "lit-element";
// @ts-ignore
import topAppBarStyles from "@material/top-app-bar/dist/mdc.top-app-bar.min.css";

@customElement("ha-header-bar")
export class HaHeaderBar extends LitElement {
  @property({ type: Boolean }) centerTitle = false;

  protected render() {
    let title = html`<span class="mdc-top-app-bar__title">
      <slot name="title"></slot>
    </span>`;
    if (this.centerTitle) {
      title = html`<section
        class="mdc-top-app-bar__section mdc-top-app-bar__section--align-center"
      >
        ${title}
      </section>`;
    }

    return html`<header class="mdc-top-app-bar">
      <div class="mdc-top-app-bar__row">
        <section
          class="mdc-top-app-bar__section mdc-top-app-bar__section--align-start"
          id="navigation"
        >
          <slot name="navigationIcon"></slot>
          ${!this.centerTitle ? title : ""}
        </section>
        ${this.centerTitle ? title : ""}
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
