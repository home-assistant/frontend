import { css } from "lit";

export const haTopAppBarFixedSharedStyles = css`
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
    -webkit-backdrop-filter: var(--app-header-backdrop-filter, none);
    backdrop-filter: var(--app-header-backdrop-filter, none);
    padding-top: var(--safe-area-inset-top);
    padding-right: var(--safe-area-inset-right);
    transition:
      width var(--ha-animation-duration-normal) ease,
      padding-left var(--ha-animation-duration-normal) ease,
      padding-right var(--ha-animation-duration-normal) ease;
  }

  :host([narrow]) .mdc-top-app-bar {
    padding-left: var(--safe-area-inset-left);
  }

  @media (prefers-reduced-motion: reduce) {
    .mdc-top-app-bar {
      transition: none;
    }
  }
`;
