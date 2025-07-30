import { css } from "lit";
import { extractVars } from "../../../common/style/derived-css-vars";

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
    --color-primary-90: #b9e6fc;
    --color-primary-95: #eff9fe;

    /* neutral */
    --color-neutral-05: #101219;
    --color-neutral-10: #1b1d26;
    --color-neutral-20: #2f323f;
    --color-neutral-30: #424554;
    --color-neutral-40: #545868;
    --color-neutral-50: #717584;
    --color-neutral-60: #9194a2;
    --color-neutral-70: #abaeb9;
    --color-neutral-80: #c7c9d0;
    --color-neutral-90: #e4e5e9;
    --color-neutral-95: #f1f2f3;

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
