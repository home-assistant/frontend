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

    /* indigo */
    --color-indigo-05: #0d0a3a;
    --color-indigo-10: #181255;
    --color-indigo-20: #292381;
    --color-indigo-30: #3933a7;
    --color-indigo-40: #4945cb;
    --color-indigo-50: #6163f2;
    --color-indigo-60: #808aff;
    --color-indigo-70: #9da9ff;
    --color-indigo-80: #bcc7ff;
    --color-indigo-90: #dfe5ff;
    --color-indigo-95: #f0f2ff;

    /* purple */
    --color-purple-05: #1e0532;
    --color-purple-10: #2d0b48;
    --color-purple-20: #491870;
    --color-purple-30: #612692;
    --color-purple-40: #7936b3;
    --color-purple-50: #9951db;
    --color-purple-60: #b678f5;
    --color-purple-70: #ca99ff;
    --color-purple-80: #ddbdff;
    --color-purple-90: #eedfff;
    --color-purple-95: #f7f0ff;

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

    /* pink */
    --color-pink-05: #28041a;
    --color-pink-10: #3c0828;
    --color-pink-20: #5e1342;
    --color-pink-30: #7d1e58;
    --color-pink-40: #9e2a6c;
    --color-pink-50: #c84382;
    --color-pink-60: #e66ba3;
    --color-pink-70: #f78dbf;
    --color-pink-80: #fcb5d8;
    --color-pink-90: #feddf0;
    --color-pink-95: #feeff9;

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

    /* yellow */
    --color-yellow-05: #220c00;
    --color-yellow-10: #331600;
    --color-yellow-20: #532600;
    --color-yellow-30: #6f3601;
    --color-yellow-40: #8c4602;
    --color-yellow-50: #b45f04;
    --color-yellow-60: #da7e00;
    --color-yellow-70: #ef9d00;
    --color-yellow-80: #fac22b;
    --color-yellow-90: #ffe495;
    --color-yellow-95: #fef3cd;

    /* green */
    --color-green-05: #031608;
    --color-green-10: #052310;
    --color-green-20: #0a3a1d --color-green-30: #0a5027;
    --color-green-40: #036730;
    --color-green-50: #00883c;
    --color-green-60: #00ac49;
    --color-green-70: #5dc36f;
    --color-green-80: #93da98;
    --color-green-90: #c2f2c1;
    --color-green-95: #e3f9e3;

    /* cyan */
    --color-cyan-05: #00151b;
    --color-cyan-10: #002129;
    --color-cyan-20: #003844;
    --color-cyan-30: #014c5b;
    --color-cyan-40: #026274;
    --color-cyan-50: #078098;
    --color-cyan-60: #00a3c0;
    --color-cyan-70: #2fbedc;
    --color-cyan-80: #7fd6ec;
    --color-cyan-90: #c5ecf7;
    --color-cyan-95: #e3f6fb;

    /* blue */
    --color-blue-05: #000f35;
    --color-blue-10: #001a4e;
    --color-blue-20: #002d77;
    --color-blue-30: #003f9c;
    --color-blue-40: #0053c0;
    --color-blue-50: #0071ec;
    --color-blue-60: #3e96ff;
    --color-blue-70: #6eb3ff;
    --color-blue-80: #9fceff;
    --color-blue-90: #d1e8ff;
    --color-blue-95: #e8f3ff;
  }
`;

export const coreColorVariables = extractVars(coreColorStyles);
