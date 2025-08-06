import { css } from "lit";

/*
 * Semantic color tokens are abstractions built on top of core color tokens to represent colors based on their usage or purpose.
 * These tokens are named according to their semantic role in the UI (e.g., "primary," "success," "error"), making it easier to maintain consistency and scalability in design.
 * Semantic tokens use core tokens to reference the actual color values. This separation allows for adjustments in color schemes without affecting the semantic meaning or intent.
 */
export const semanticColorStyles = css`
  html {
    --ha-color-focus: var(--ha-color-orange-60);

    /* text */
    --ha-color-text-primary: var(--ha-color-neutral-05);
    --ha-color-text-secondary: var(--ha-color-neutral-40);
    --ha-color-text-disabled: var(--ha-color-neutral-60);
    --ha-color-text-link: var(--ha-color-primary-40);
    /* border primary */
    --ha-color-border-quiet: var(--ha-color-primary-80);
    --ha-color-border-normal: var(--ha-color-primary-70);
    --ha-color-border-loud: var(--ha-color-primary-40);

    /* border neutral */
    --ha-color-border-neutral-quiet: var(--ha-color-neutral-80);
    --ha-color-border-neutral-normal: var(--ha-color-neutral-60);
    --ha-color-border-neutral-loud: var(--ha-color-neutral-40);

    /* border danger */
    --ha-color-border-danger-quiet: var(--ha-color-red-80);
    --ha-color-border-danger-normal: var(--ha-color-red-70);
    --ha-color-border-danger-loud: var(--ha-color-red-40);

    /* border warning */
    --ha-color-border-warning-quiet: var(--ha-color-orange-80);
    --ha-color-border-warning-normal: var(--ha-color-orange-70);
    --ha-color-border-warning-loud: var(--ha-color-orange-40);

    /* border success */
    --ha-color-border-success-quiet: var(--ha-color-green-80);
    --ha-color-border-success-normal: var(--ha-color-green-70);
    --ha-color-border-success-loud: var(--ha-color-green-40);

    /* fill primary quiet */
    --ha-color-fill-primary-quiet-resting: var(--ha-color-primary-95);
    --ha-color-fill-primary-quiet-hover: var(--ha-color-primary-90);
    --ha-color-fill-primary-quiet-active: var(--ha-color-primary-95);

    /* fill primary normal */
    --ha-color-fill-primary-normal-resting: var(--ha-color-primary-90);
    --ha-color-fill-primary-normal-hover: var(--ha-color-primary-80);
    --ha-color-fill-primary-normal-active: var(--ha-color-primary-90);

    /* fill primary loud */
    --ha-color-fill-primary-loud-resting: var(--ha-color-primary-40);
    --ha-color-fill-primary-loud-hover: var(--ha-color-primary-30);
    --ha-color-fill-primary-loud-active: var(--ha-color-primary-40);

    /* fill neutral quiet */
    --ha-color-fill-neutral-quiet-resting: var(--ha-color-neutral-95);
    --ha-color-fill-neutral-quiet-hover: var(--ha-color-neutral-90);
    --ha-color-fill-neutral-quiet-active: var(--ha-color-neutral-95);

    /* fill neutral normal */
    --ha-color-fill-neutral-normal-resting: var(--ha-color-neutral-90);
    --ha-color-fill-neutral-normal-hover: var(--ha-color-neutral-80);
    --ha-color-fill-neutral-normal-active: var(--ha-color-neutral-90);

    /* fill neutral loud */
    --ha-color-fill-neutral-loud-resting: var(--ha-color-neutral-40);
    --ha-color-fill-neutral-loud-hover: var(--ha-color-neutral-30);
    --ha-color-fill-neutral-loud-active: var(--ha-color-neutral-40);

    /* fill disabled quiet */
    --ha-color-fill-disabled-quiet-resting: var(--ha-color-neutral-95);

    /* fill disabled normal */
    --ha-color-fill-disabled-normal-resting: var(--ha-color-neutral-95);

    /* fill disabled loud */
    --ha-color-fill-disabled-loud-resting: var(--ha-color-neutral-80);

    /* fill danger quiet */
    --ha-color-fill-danger-quiet-resting: var(--ha-color-red-95);
    --ha-color-fill-danger-quiet-hover: var(--ha-color-red-90);
    --ha-color-fill-danger-quiet-active: var(--ha-color-red-95);

    /* fill danger normal */
    --ha-color-fill-danger-normal-resting: var(--ha-color-red-90);
    --ha-color-fill-danger-normal-hover: var(--ha-color-red-80);
    --ha-color-fill-danger-normal-active: var(--ha-color-red-90);

    /* fill danger loud */
    --ha-color-fill-danger-loud-resting: var(--ha-color-red-50);
    --ha-color-fill-danger-loud-hover: var(--ha-color-red-40);
    --ha-color-fill-danger-loud-active: var(--ha-color-red-50);

    /* fill warning quiet */
    --ha-color-fill-warning-quiet-resting: var(--ha-color-orange-95);
    --ha-color-fill-warning-quiet-hover: var(--ha-color-orange-90);
    --ha-color-fill-warning-quiet-active: var(--ha-color-orange-95);

    /* fill warning normal */
    --ha-color-fill-warning-normal-resting: var(--ha-color-orange-90);
    --ha-color-fill-warning-normal-hover: var(--ha-color-orange-80);
    --ha-color-fill-warning-normal-active: var(--ha-color-orange-90);

    /* fill warning loud */
    --ha-color-fill-warning-loud-resting: var(--ha-color-orange-70);
    --ha-color-fill-warning-loud-hover: var(--ha-color-orange-50);
    --ha-color-fill-warning-loud-active: var(--ha-color-orange-70);

    /* fill success quiet */
    --ha-color-fill-success-quiet-resting: var(--ha-color-green-95);
    --ha-color-fill-success-quiet-hover: var(--ha-color-green-90);
    --ha-color-fill-success-quiet-active: var(--ha-color-green-95);

    /* fill success normal */
    --ha-color-fill-success-normal-resting: var(--ha-color-green-90);
    --ha-color-fill-success-normal-hover: var(--ha-color-green-80);
    --ha-color-fill-success-normal-active: var(--ha-color-green-90);

    /* fill success loud */
    --ha-color-fill-success-loud-resting: var(--ha-color-green-50);
    --ha-color-fill-success-loud-hover: var(--ha-color-green-40);
    --ha-color-fill-success-loud-active: var(--ha-color-green-50);

    /* on primary */
    --ha-color-on-primary-quiet: var(--ha-color-primary-50);
    --ha-color-on-primary-normal: var(--ha-color-primary-40);
    --ha-color-on-primary-loud: var(--white-color);

    /* on neutral */
    --ha-color-on-neutral-quiet: var(--ha-color-neutral-50);
    --ha-color-on-neutral-normal: var(--ha-color-neutral-40);
    --ha-color-on-neutral-loud: var(--white-color);

    /* on disabled */
    --ha-color-on-disabled-quiet: var(--ha-color-neutral-80);
    --ha-color-on-disabled-normal: var(--ha-color-neutral-70);
    --ha-color-on-disabled-loud: var(--ha-color-neutral-95);

    /* on danger */
    --ha-color-on-danger-quiet: var(--ha-color-red-50);
    --ha-color-on-danger-normal: var(--ha-color-red-40);
    --ha-color-on-danger-loud: var(--white-color);

    /* on warning */
    --ha-color-on-warning-quiet: var(--ha-color-orange-50);
    --ha-color-on-warning-normal: var(--ha-color-orange-40);
    --ha-color-on-warning-loud: var(--white-color);

    /* on success */
    --ha-color-on-success-quiet: var(--ha-color-green-50);
    --ha-color-on-success-normal: var(--ha-color-green-40);
    --ha-color-on-success-loud: var(--white-color);
  }
`;

export const darkSemanticColorStyles = css`
  html {
    /* text */
    --ha-color-text-primary: var(--white-color);
    --ha-color-text-secondary: var(--ha-color-neutral-80);
    --ha-color-text-link: var(--ha-color-primary-60);

    /* border primary */
    --ha-color-border-normal: var(--ha-color-primary-50);

    /* border neutral */
    --ha-color-border-neutral-quiet: var(--ha-color-neutral-40);
    --ha-color-border-neutral-normal: var(--ha-color-neutral-50);
    --ha-color-border-neutral-loud: var(--ha-color-neutral-70);

    /* border danger */
    --ha-color-border-danger-normal: var(--ha-color-red-50);
    --ha-color-border-danger-loud: var(--ha-color-red-50);

    /* border warning */
    --ha-color-border-warning-normal: var(--ha-color-orange-50);
    --ha-color-border-warning-loud: var(--ha-color-orange-50);

    /* fill primary quiet */
    --ha-color-fill-primary-quiet-resting: var(--ha-color-primary-05);
    --ha-color-fill-primary-quiet-hover: var(--ha-color-primary-10);
    --ha-color-fill-primary-quiet-active: var(--ha-color-primary-05);

    /* fill primary normal */
    --ha-color-fill-primary-normal-resting: var(--ha-color-primary-10);
    --ha-color-fill-primary-normal-hover: var(--ha-color-primary-20);
    --ha-color-fill-primary-normal-active: var(--ha-color-primary-10);

    /* fill neutral quiet */
    --ha-color-fill-neutral-quiet-resting: var(--ha-color-neutral-05);
    --ha-color-fill-neutral-quiet-hover: var(--ha-color-neutral-10);
    --ha-color-fill-neutral-quiet-active: var(--ha-color-neutral-00);

    /* fill neutral normal */
    --ha-color-fill-neutral-normal-resting: var(--ha-color-neutral-10);
    --ha-color-fill-neutral-normal-hover: var(--ha-color-neutral-20);
    --ha-color-fill-neutral-normal-active: var(--ha-color-neutral-10);

    /* fill disabled quiet */
    --ha-color-fill-disabled-quiet-resting: var(--ha-color-neutral-10);

    /* fill disabled normal */
    --ha-color-fill-disabled-normal-resting: var(--ha-color-neutral-20);

    /* fill disabled loud */
    --ha-color-fill-disabled-loud-resting: var(--ha-color-neutral-30);

    /* fill danger quiet */
    --ha-color-fill-danger-quiet-resting: var(--ha-color-red-05);
    --ha-color-fill-danger-quiet-hover: var(--ha-color-red-10);
    --ha-color-fill-danger-quiet-active: var(--ha-color-red-05);

    /* fill danger normal */
    --ha-color-fill-danger-normal-resting: var(--ha-color-red-10);
    --ha-color-fill-danger-normal-hover: var(--ha-color-red-20);
    --ha-color-fill-danger-normal-active: var(--ha-color-red-10);

    /* fill danger loud */
    --ha-color-fill-danger-loud-resting: var(--ha-color-red-40);
    --ha-color-fill-danger-loud-hover: var(--ha-color-red-30);
    --ha-color-fill-danger-loud-active: var(--ha-color-red-40);

    /* fill warning quiet */
    --ha-color-fill-warning-quiet-resting: var(--ha-color-orange-05);
    --ha-color-fill-warning-quiet-hover: var(--ha-color-orange-10);
    --ha-color-fill-warning-quiet-active: var(--ha-color-orange-05);

    /* fill warning normal */
    --ha-color-fill-warning-normal-resting: var(--ha-color-orange-10);
    --ha-color-fill-warning-normal-hover: var(--ha-color-orange-20);
    --ha-color-fill-warning-normal-active: var(--ha-color-orange-10);

    /* fill warning loud */
    --ha-color-fill-warning-loud-resting: var(--ha-color-orange-40);
    --ha-color-fill-warning-loud-hover: var(--ha-color-orange-30);
    --ha-color-fill-warning-loud-active: var(--ha-color-orange-40);

    /* fill success quiet */
    --ha-color-fill-success-quiet-resting: var(--ha-color-green-05);
    --ha-color-fill-success-quiet-hover: var(--ha-color-green-10);
    --ha-color-fill-success-quiet-active: var(--ha-color-green-05);

    /* fill success normal */
    --ha-color-fill-success-normal-resting: var(--ha-color-green-10);
    --ha-color-fill-success-normal-hover: var(--ha-color-green-20);
    --ha-color-fill-success-normal-active: var(--ha-color-green-10);

    /* fill success loud */
    --ha-color-fill-success-loud-resting: var(--ha-color-green-40);
    --ha-color-fill-success-loud-hover: var(--ha-color-green-30);
    --ha-color-fill-success-loud-active: var(--ha-color-green-40);

    /* on primary */
    --ha-color-on-primary-quiet: var(--ha-color-primary-70);
    --ha-color-on-primary-normal: var(--ha-color-primary-60);

    /* on neutral */
    --ha-color-on-neutral-quiet: var(--ha-color-neutral-70);
    --ha-color-on-neutral-normal: var(--ha-color-neutral-60);
    --ha-color-on-neutral-loud: var(--white-color);

    /* on disabled */
    --ha-color-on-disabled-quiet: var(--ha-color-neutral-40);
    --ha-color-on-disabled-normal: var(--ha-color-neutral-50);
    --ha-color-on-disabled-loud: var(--ha-color-neutral-50);

    /* on danger */
    --ha-color-on-danger-quiet: var(--ha-color-red-70);
    --ha-color-on-danger-normal: var(--ha-color-red-60);
    --ha-color-on-danger-loud: var(--white-color);

    /* on warning */
    --ha-color-on-warning-quiet: var(--ha-color-orange-70);
    --ha-color-on-warning-normal: var(--ha-color-orange-60);
    --ha-color-on-warning-loud: var(--white-color);

    /* on success */
    --ha-color-on-success-quiet: var(--ha-color-green-70);
    --ha-color-on-success-normal: var(--ha-color-green-60);
    --ha-color-on-success-loud: var(--white-color);
  }
`;
