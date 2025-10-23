import { TopAppBarFixedBase } from "@material/mwc-top-app-bar-fixed/mwc-top-app-bar-fixed-base";
import { styles } from "@material/mwc-top-app-bar/mwc-top-app-bar.css";
import { css } from "lit";
import { customElement, property } from "lit/decorators";
import { ViewTransitionMixin } from "../mixins/view-transition-mixin";
import { haStyleViewTransitions } from "../resources/styles";

@customElement("ha-top-app-bar-fixed")
export class HaTopAppBarFixed extends ViewTransitionMixin(TopAppBarFixedBase) {
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ type: Boolean, reflect: true, attribute: "content-loading" })
  public contentLoading = true;

  protected override onLoadTransition(): void {
    // Use reflected property since we can't add class to base component's rendered elements
    this.startViewTransition(() => {
      this.contentLoading = false;
    });
  }

  static override styles = [
    styles,
    haStyleViewTransitions,
    css`
      header {
        padding-top: var(--safe-area-inset-top);
      }
      .mdc-top-app-bar__row {
        height: var(--header-height);
        border-bottom: var(--app-header-border-bottom);
      }
      .mdc-top-app-bar--fixed-adjust {
        padding-top: calc(
          var(--header-height, 0px) + var(--safe-area-inset-top, 0px)
        );
        padding-bottom: var(--safe-area-inset-bottom);
        padding-right: var(--safe-area-inset-right);
        view-transition-name: layout-fade-in;
      }
      :host([content-loading]) .mdc-top-app-bar--fixed-adjust {
        opacity: 0;
      }
      :host([narrow]) .mdc-top-app-bar--fixed-adjust {
        padding-left: var(--safe-area-inset-left);
      }
      .mdc-top-app-bar {
        --mdc-typography-headline6-font-weight: var(--ha-font-weight-normal);
        color: var(--app-header-text-color, var(--mdc-theme-on-primary, #fff));
        background-color: var(
          --app-header-background-color,
          var(--mdc-theme-primary)
        );
        padding-top: var(--safe-area-inset-top);
        padding-right: var(--safe-area-inset-right);
      }
      :host([narrow]) .mdc-top-app-bar {
        padding-left: var(--safe-area-inset-left);
      }
      .mdc-top-app-bar__title {
        font-size: var(--ha-font-size-xl);
        padding-inline-start: 24px;
        padding-inline-end: initial;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-top-app-bar-fixed": HaTopAppBarFixed;
  }
}
