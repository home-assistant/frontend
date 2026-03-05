import { css } from "lit";
import { extractDerivedVars } from "../../common/style/derived-css-vars";

export const mainStyles = css`
  html {
    height: 100vh;

    /* for header */
    --header-height: 56px;

    /* opacity for dark text on a light background */
    --dark-divider-opacity: 0.12;
    --dark-disabled-opacity: 0.38; /* or hint text or icon */
    --dark-secondary-opacity: 0.54;
    --dark-primary-opacity: 0.87;

    /* opacity for light text on a dark background */
    --light-divider-opacity: 0.12;
    --light-disabled-opacity: 0.3; /* or hint text or icon */
    --light-secondary-opacity: 0.7;
    --light-primary-opacity: 1;

    direction: ltr;
    --direction: ltr;
    --float-start: left;
    --float-end: right;
    --margin-title-ltr: 0 0 0 24px;
    --margin-title-rtl: 0 24px 0 0;

    /* Safe area insets */
    --safe-area-inset-top: var(--app-safe-area-inset-top, env(safe-area-inset-top, 0px));
    --safe-area-inset-bottom: var(--app-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
    --safe-area-inset-left: var(--app-safe-area-inset-left, env(safe-area-inset-left, 0px));
    --safe-area-inset-right: var(--app-safe-area-inset-right, env(safe-area-inset-right, 0px));

    /* Safe area inset x and y */
    --safe-area-inset-x: calc(var(--safe-area-inset-left, 0px) + var(--safe-area-inset-right, 0px));
    --safe-area-inset-y: calc(var(--safe-area-inset-top, 0px) + var(--safe-area-inset-bottom, 0px));

    /* Offsets for centering elements within asymmetric safe areas */
    --safe-area-offset-left: calc(max(var(--safe-area-inset-left, 0px) - var(--safe-area-inset-right, 0px), 0px) / 2);
    --safe-area-offset-right: calc(max(var(--safe-area-inset-right, 0px) - var(--safe-area-inset-left, 0px), 0px) / 2);
    --safe-area-offset-top: calc(max(var(--safe-area-inset-top, 0px) - var(--safe-area-inset-bottom, 0px), 0px) / 2);
    --safe-area-offset-bottom: calc(max(var(--safe-area-inset-bottom, 0px) - var(--safe-area-inset-top, 0px), 0px) / 2);

    /* Safe width and height for use instead of 100vw and 100vh
     * when working with areas like dialogs which need to fill the entire safe area.
     */
    --safe-width: calc(100vw - var(--safe-area-inset-left) - var(--safe-area-inset-right));
    --safe-height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));

    /* dialog backdrop filter */
    --ha-dialog-scrim-backdrop-filter: brightness(68%);
  }
`;

export const mainDerivedVariables = extractDerivedVars(mainStyles);
