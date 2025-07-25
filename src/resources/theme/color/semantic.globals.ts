import { css } from "lit";

export const semanticColorStyles = css`
  html {
    --color-overlay-modal: rgba(0, 0, 0, 0.25);
    --color-focus: var(--color-orange-60);

    /* surface */
    --color-surface-lower: var(--color-neutral-90);
    --color-surface-low: var(--color-neutral-95);
    --color-surface-default: var(--white);

    /* text */
    --color-text-primary: var(--color-neutral-05);
    --color-text-secondary: var(--color-neutral-40);
    --color-text-disabled: var(--color-neutral-60);
    --color-text-link: var(--color-primary-40);

    /* text purple */
    --color-text-purple-type: var(--color-neutral-05);
    --color-text-purple-property: var(--color-purple-40);
    --color-text-purple-target: var(--color-primary-40);

    /* border primary */
    --color-border-quiet: var(--color-primary-80);
    --color-border-normal: var(--color-primary-70);
    --color-border-loud: var(--color-primary-40);

    /* border neutral */
    --color-border-neutral-quiet: var(--color-neutral-80);
    --color-border-neutral-normal: var(--color-neutral-60);
    --color-border-neutral-loud: var(--color-neutral-40);

    /* border danger */
    --color-border-danger-quiet: var(--color-red-80);
    --color-border-danger-normal: var(--color-red-70);
    --color-border-danger-loud: var(--color-red-40);

    /* border warning */
    --color-border-warning-quiet: var(--color-orange-80);
    --color-border-warning-normal: var(--color-orange-70);
    --color-border-warning-loud: var(--color-orange-40);

    /* border success */
    --color-border-success-quiet: var(--color-green-80);
    --color-border-success-normal: var(--color-green-70);
    --color-border-success-loud: var(--color-green-40);

    /* border purple */
    --color-border-purple-quiet: var(--color-purple-80);
    --color-border-purple-normal: var(--color-purple-70);
    --color-border-purple-loud: var(--color-purple-40);

    /* fill primary quiet */
    --color-fill-primary-quiet-resting: var(--color-primary-95);
    --color-fill-primary-quiet-hover: var(--color-primary-90);
    --color-fill-primary-quiet-active: var(--color-primary-95);

    /* fill primary normal */
    --color-fill-primary-normal-resting: var(--color-primary-90);
    --color-fill-primary-normal-hover: var(--color-primary-80);
    --color-fill-primary-normal-active: var(--color-primary-90);

    /* fill primary loud */
    --color-fill-primary-loud-resting: var(--color-primary-40);
    --color-fill-primary-loud-hover: var(--color-primary-30);
    --color-fill-primary-loud-active: var(--color-primary-40);

    /* fill neutral quiet */
    --color-fill-neutral-quiet-resting: var(--color-neutral-95);
    --color-fill-neutral-quiet-hover: var(--color-neutral-90);
    --color-fill-neutral-quiet-active: var(--color-neutral-95);

    /* fill neutral normal */
    --color-fill-neutral-normal-resting: var(--color-neutral-90);
    --color-fill-neutral-normal-hover: var(--color-neutral-80);
    --color-fill-neutral-normal-active: var(--color-neutral-90);

    /* fill neutral loud */
    --color-fill-neutral-loud-resting: var(--color-neutral-40);
    --color-fill-neutral-loud-hover: var(--color-neutral-30);
    --color-fill-neutral-loud-active: var(--color-neutral-40);

    /* fill disabled quiet */
    --color-fill-disabled-quiet-resting: var(--color-neutral-95);

    /* fill disabled normal */
    --color-fill-disabled-normal-resting: var(--color-neutral-95);

    /* fill disabled loud */
    --color-fill-disabled-loud-resting: var(--color-neutral-80);

    /* fill danger quiet */
    --color-fill-danger-quiet-resting: var(--color-red-95);
    --color-fill-danger-quiet-hover: var(--color-red-90);
    --color-fill-danger-quiet-active: var(--color-red-95);

    /* fill danger normal */
    --color-fill-danger-normal-resting: var(--color-red-90);
    --color-fill-danger-normal-hover: var(--color-red-80);
    --color-fill-danger-normal-active: var(--color-red-90);

    /* fill danger loud */
    --color-fill-danger-loud-resting: var(--color-red-50);
    --color-fill-danger-loud-hover: var(--color-red-40);
    --color-fill-danger-loud-active: var(--color-red-50);

    /* fill warning quiet */
    --color-fill-warning-quiet-resting: var(--color-orange-95);
    --color-fill-warning-quiet-hover: var(--color-orange-90);
    --color-fill-warning-quiet-active: var(--color-orange-95);

    /* fill warning normal */
    --color-fill-warning-normal-resting: var(--color-orange-90);
    --color-fill-warning-normal-hover: var(--color-orange-80);
    --color-fill-warning-normal-active: var(--color-orange-90);

    /* fill warning loud */
    --color-fill-warning-loud-resting: var(--color-orange-70);
    --color-fill-warning-loud-hover: var(--color-orange-50);
    --color-fill-warning-loud-active: var(--color-orange-70);

    /* fill success quiet */
    --color-fill-success-quiet-resting: var(--color-green-95);
    --color-fill-success-quiet-hover: var(--color-green-90);
    --color-fill-success-quiet-active: var(--color-green-95);

    /* fill success normal */
    --color-fill-success-normal-resting: var(--color-green-90);
    --color-fill-success-normal-hover: var(--color-green-80);
    --color-fill-success-normal-active: var(--color-green-90);

    /* fill success loud */
    --color-fill-success-loud-resting: var(--color-green-50);
    --color-fill-success-loud-hover: var(--color-green-40);
    --color-fill-success-loud-active: var(--color-green-50);

    /* fill purple quiet */
    --color-fill-purple-quiet-resting: var(--color-purple-95);
    --color-fill-purple-quiet-hover: var(--color-purple-90);
    --color-fill-purple-quiet-active: var(--color-purple-95);

    /* fill purple normal */
    --color-fill-purple-normal-resting: var(--color-purple-90);
    --color-fill-purple-normal-hover: var(--color-purple-80);
    --color-fill-purple-normal-active: var(--color-purple-90);

    /* fill purple loud */
    --color-fill-purple-loud-resting: var(--color-purple-50);
    --color-fill-purple-loud-hover: var(--color-purple-40);
    --color-fill-purple-loud-active: var(--color-purple-50);

    /* on primary */
    --color-on-primary-quiet: var(--color-primary-50);
    --color-on-primary-normal: var(--color-primary-40);
    --color-on-primary-loud: var(--white);

    /* on neutral */
    --color-on-neutral-quiet: var(--color-neutral-50);
    --color-on-neutral-normal: var(--color-neutral-40);
    --color-on-neutral-loud: var(--white);

    /* on disabled */
    --color-on-disabled-quiet: var(--color-neutral-80);
    --color-on-disabled-normal: var(--color-neutral-70);
    --color-on-disabled-loud: var(--color-neutral-95);

    /* on danger */
    --color-on-danger-quiet: var(--color-red-50);
    --color-on-danger-normal: var(--color-red-40);
    --color-on-danger-loud: var(--white);

    /* on warning */
    --color-on-warning-quiet: var(--color-orange-50);
    --color-on-warning-normal: var(--color-orange-40);
    --color-on-warning-loud: var(--white);

    /* on success */
    --color-on-success-quiet: var(--color-green-50);
    --color-on-success-normal: var(--color-green-40);
    --color-on-success-loud: var(--white);

    /* on purple */
    --color-on-purple-quiet: var(--color-purple-30);
    --color-on-purple-normal: var(--color-purple-40);
    --color-on-purple-loud: var(--white);

    /* logo */
    --color-logo-primary: var(--color-primary-50);
  }
`;

export const darkSemanticColorStyles = css`
  html {
    /* surface */
    --color-surface-lower: var(--black);
    --color-surface-low: var(--color-neutral-05);
    --color-surface-default: var(--color-neutral-10);

    /* text */
    --color-text-primary: var(--white);
    --color-text-secondary: var(--color-neutral-80);
    --color-text-link: var(--color-primary-60);

    /* text purple */
    --color-text-purple-type: var(--white);
    --color-text-purple-property: var(--color-purple-60);
    --color-text-purple-target: var(--color-primary-60);

    /* border primary */
    --color-border-normal: var(--color-primary-50);

    /* border neutral */
    --color-border-neutral-quiet: var(--color-neutral-40);
    --color-border-neutral-normal: var(--color-neutral-50);
    --color-border-neutral-loud: var(--color-neutral-70);

    /* border danger */
    --color-border-danger-normal: var(--color-red-50);
    --color-border-danger-loud: var(--color-red-50);

    /* border warning */
    --color-border-warning-normal: var(--color-orange-50);
    --color-border-warning-loud: var(--color-orange-50);

    /* border purple */
    --color-border-purple-normal: var(--color-purple-50);
    --color-border-purple-loud: var(--color-purple-50);

    /* fill primary quiet */
    --color-fill-primary-quiet-resting: var(--color-primary-05);
    --color-fill-primary-quiet-hover: var(--color-primary-10);
    --color-fill-primary-quiet-active: var(--color-primary-05);

    /* fill primary normal */
    --color-fill-primary-normal-resting: var(--color-primary-10);
    --color-fill-primary-normal-hover: var(--color-primary-20);
    --color-fill-primary-normal-active: var(--color-primary-10);

    /* fill neutral quiet */
    --color-fill-neutral-quiet-resting: var(--color-neutral-05);
    --color-fill-neutral-quiet-hover: var(--color-neutral-10);
    --color-fill-neutral-quiet-active: var(--color-neutral-00);

    /* fill neutral normal */
    --color-fill-neutral-normal-resting: var(--color-neutral-10);
    --color-fill-neutral-normal-hover: var(--color-neutral-20);
    --color-fill-neutral-normal-active: var(--color-neutral-10);

    /* fill disabled quiet */
    --color-fill-disabled-quiet-resting: var(--color-neutral-10);

    /* fill disabled normal */
    --color-fill-disabled-normal-resting: var(--color-neutral-20);

    /* fill disabled loud */
    --color-fill-disabled-loud-resting: var(--color-neutral-30);

    /* fill danger quiet */
    --color-fill-danger-quiet-resting: var(--color-red-05);
    --color-fill-danger-quiet-hover: var(--color-red-10);
    --color-fill-danger-quiet-active: var(--color-red-05);

    /* fill danger normal */
    --color-fill-danger-normal-resting: var(--color-red-10);
    --color-fill-danger-normal-hover: var(--color-red-20);
    --color-fill-danger-normal-active: var(--color-red-10);

    /* fill danger loud */
    --color-fill-danger-loud-resting: var(--color-red-40);
    --color-fill-danger-loud-hover: var(--color-red-30);
    --color-fill-danger-loud-active: var(--color-red-40);

    /* fill warning quiet */
    --color-fill-warning-quiet-resting: var(--color-orange-05);
    --color-fill-warning-quiet-hover: var(--color-orange-10);
    --color-fill-warning-quiet-active: var(--color-orange-05);

    /* fill warning normal */
    --color-fill-warning-normal-resting: var(--color-orange-10);
    --color-fill-warning-normal-hover: var(--color-orange-20);
    --color-fill-warning-normal-active: var(--color-orange-10);

    /* fill warning loud */
    --color-fill-warning-loud-resting: var(--color-orange-40);
    --color-fill-warning-loud-hover: var(--color-orange-30);
    --color-fill-warning-loud-active: var(--color-orange-40);

    /* fill success quiet */
    --color-fill-success-quiet-resting: var(--color-green-05);
    --color-fill-success-quiet-hover: var(--color-green-10);
    --color-fill-success-quiet-active: var(--color-green-05);

    /* fill success normal */
    --color-fill-success-normal-resting: var(--color-green-10);
    --color-fill-success-normal-hover: var(--color-green-20);
    --color-fill-success-normal-active: var(--color-green-10);

    /* fill success loud */
    --color-fill-success-loud-resting: var(--color-green-40);
    --color-fill-success-loud-hover: var(--color-green-30);
    --color-fill-success-loud-active: var(--color-green-40);

    /* fill purple quiet */
    --color-fill-purple-quiet-resting: var(--color-purple-05);
    --color-fill-purple-quiet-hover: var(--color-purple-10);
    --color-fill-purple-quiet-active: var(--color-purple-05);

    /* fill purple normal */
    --color-fill-purple-normal-resting: var(--color-purple-10);
    --color-fill-purple-normal-hover: var(--color-purple-20);
    --color-fill-purple-normal-active: var(--color-purple-10);

    /* fill purple loud */
    --color-fill-purple-loud-resting: var(--color-purple-40);
    --color-fill-purple-loud-hover: var(--color-purple-30);
    --color-fill-purple-loud-active: var(--color-purple-40);

    /* on primary */
    --color-on-primary-quiet: var(--color-primary-70);
    --color-on-primary-normal: var(--color-primary-80);

    /* on neutral */
    --color-on-neutral-quiet: var(--color-neutral-70);
    --color-on-neutral-normal: var(--color-neutral-60);
    --color-on-neutral-loud: var(--white);

    /* on disabled */
    --color-on-disabled-quiet: var(--color-neutral-40);
    --color-on-disabled-normal: var(--color-neutral-50);
    --color-on-disabled-loud: var(--color-neutral-50);

    /* on danger */
    --color-on-danger-quiet: var(--color-red-70);
    --color-on-danger-normal: var(--color-red-60);
    --color-on-danger-loud: var(--white);

    /* on warning */
    --color-on-warning-quiet: var(--color-orange-70);
    --color-on-warning-normal: var(--color-orange-60);
    --color-on-warning-loud: var(--white);

    /* on success */
    --color-on-success-quiet: var(--color-green-70);
    --color-on-success-normal: var(--color-green-60);
    --color-on-success-loud: var(--white);

    /* on purple */
    --color-on-purple-quiet: var(--color-purple-70);
    --color-on-purple-normal: var(--color-purple-60);
    --color-on-purple-loud: var(--white);
  }
`;
