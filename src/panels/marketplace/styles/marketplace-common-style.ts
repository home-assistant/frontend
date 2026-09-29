import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { marketplaceLinkStyle } from "./element-styles";
import { marketplaceStyleVariables } from "./variables";
import { haStyle } from "../../../resources/styles";

export const marketplaceCommonClasses = css`
  .filters {
    margin: var(--ha-space-4);
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
  marketplaceCommonClasses,
  marketplaceLinkStyle,
];
