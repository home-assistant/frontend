import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { storeIconStyle, storeLinkStyle } from "./element-styles";
import { storeStyleVariables } from "./variables";
import { haStyle } from "../../../resources/styles";

export const storeCommonClasses = css`
  .filters {
    margin: 16px;
  }

  code,
  pre {
    background-color: var(--markdown-code-background-color, none);
    border-radius: 3px;
  }
`;

export const storeStyles: CSSResultGroup = [
  haStyle,
  storeStyleVariables,
  storeIconStyle,
  storeCommonClasses,
  storeLinkStyle,
];
