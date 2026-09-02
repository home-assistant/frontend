import type { CSSResultGroup } from "lit";
import { css } from "lit";
import { storeIconStyle, storeLinkStyle } from "./element-styles";
import { haStyle } from "../../../resources/styles";

export const storeCommonClasses = css`
  .warning {
    color: var(--hcv-color-warning);
  }
  .pending_update {
    color: var(--hcv-color-update);
  }
  .pending_restart,
  .error,
  .uninstall {
    color: var(--hcv-color-error);
    --mdc-theme-primary: var(--hcv-color-error);
  }
  .header {
    opacity: var(--dark-primary-opacity);
    padding: 8px 0 4px 16px;
  }
  .filters {
    margin: 16px;
  }

  code,
  pre {
    background-color: var(--markdown-code-background-color, none);
    border-radius: 3px;
  }
`;

const storeOverflowMenuStyle = css`
  ha-dropdown-item.warning {
    color: var(--warning-color);
    --hcv-color-icon: var(--warning-color);
  }
`;

export const storeStyles: CSSResultGroup = [
  haStyle,
  storeIconStyle,
  storeCommonClasses,
  storeLinkStyle,
  storeOverflowMenuStyle,
];
