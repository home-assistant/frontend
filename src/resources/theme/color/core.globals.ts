import { css } from "lit";
import { extractVars } from "../../../common/style/derived-css-vars";

/*
 * Core color tokens are the foundational color values used throughout the design system.
 * These tokens represent raw, brand-independent colors such as grayscale shades, base hues, and accent tones.
 * Core tokens shouldn't be tied to any specific UI purpose or role. Instead, they serve as building blocks from which semantic tokens are derived.
 * Changes to core tokens will cascade into semantic tokens that reference them, enabling flexible theming and consistent design language.
 * Please note that these core tokens are not intended to be used directly in components or styles.
 */
export const coreColorStyles = css`
  html {
    --white: #ffffff;
    --black: #000000;
    --transparent-none: rgba(255, 255, 255, 0);

    /* primary */
    --color-primary-05: #001721;
    --color-primary-10: #002e3e;
    --color-primary-20: #004156;
    --color-primary-30: #006787;
    --color-primary-40: #009ac7;
    --color-primary-50: #18bcf2;
    --color-primary-60: #37c8fd;
    --color-primary-70: #7bd4fb;
    --color-primary-80: #b9e6fc;
    --color-primary-90: #dff3fc;
    --color-primary-95: #eff9fe;

    /* neutral */
    --color-neutral-05: #141414;
    --color-neutral-10: #202020;
    --color-neutral-20: #363636;
    --color-neutral-30: #4a4a4a;
    --color-neutral-40: #5e5e5e;
    --color-neutral-50: #7a7a7a;
    --color-neutral-60: #989898;
    --color-neutral-70: #b1b1b1;
    --color-neutral-80: #b1b1b1;
    --color-neutral-90: #e6e6e6;
    --color-neutral-95: #f3f3f3;

    /* orange */
    --color-orange-05: #280700;
    --color-orange-10: #3b0f00;
    --color-orange-20: #5e1c00;
    --color-orange-30: #7e2900;
    --color-orange-40: #9d3800;
    --color-orange-50: #c94e00;
    --color-orange-60: #f36d00;
    --color-orange-70: #ff9342;
    --color-orange-80: #ffbb89;
    --color-orange-90: #ffe0c8;
    --color-orange-95: #fff0e4;

    /* red */
    --color-red-05: #2a040b;
    --color-red-10: #3e0913;
    --color-red-20: #631323;
    --color-red-30: #8a132c;
    --color-red-40: #b30532;
    --color-red-50: #dc3146;
    --color-red-60: #f3676c;
    --color-red-70: #fd8f90;
    --color-red-80: #ffb8b6;
    --color-red-90: #ffdedc;
    --color-red-95: #fff0ef;

    /* green */
    --color-green-05: #031608;
    --color-green-10: #052310;
    --color-green-20: #0a3a1d;
    --color-green-30: #0a5027;
    --color-green-40: #036730;
    --color-green-50: #00883c;
    --color-green-60: #00ac49;
    --color-green-70: #5dc36f;
    --color-green-80: #93da98;
    --color-green-90: #c2f2c1;
    --color-green-95: #e3f9e3;
  }
`;

export const coreColorVariables = extractVars(coreColorStyles);
