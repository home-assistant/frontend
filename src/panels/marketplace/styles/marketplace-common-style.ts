import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { marketplaceIconStyle, marketplaceLinkStyle } from "./element-styles";
import { marketplaceStyleVariables } from "./variables";
import { haStyle } from "../../../resources/styles";

export const marketplaceCommonClasses = css`
  .filters {
    margin: 16px;
  }

  code,
  pre {
    background-color: var(--markdown-code-background-color, none);
    border-radius: 3px;
  }
`;

export const marketplaceStyles: CSSResultGroup = [
  haStyle,
  marketplaceStyleVariables,
  marketplaceIconStyle,
  marketplaceCommonClasses,
  marketplaceLinkStyle,
];
