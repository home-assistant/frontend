import { css, CSSResultGroup } from "lit";
import { hacsButtonStyle, hacsIconStyle, hacsLinkStyle } from "./element-styles";
import { haStyle } from "../../homeassistant-frontend/src/resources/styles";

export const hacsCommonClasses = css`
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

const hacsOverflowMenuStyle = css`
  ha-md-menu-item.error {
    --md-menu-item-label-text-color: var(--error-color);
    --hcv-color-icon: var(--error-color);
  }

  ha-md-menu-item.warning {
    --md-menu-item-label-text-color: var(--warning-color);
    --hcv-color-icon: var(--warning-color);
  }
  li[role="separator"] {
    border-bottom: 1px solid var(--divider-color);
  }
`;

export const HacsStyles: CSSResultGroup = [
  haStyle,
  hacsIconStyle,
  hacsCommonClasses,
  hacsLinkStyle,
  hacsButtonStyle,
  hacsOverflowMenuStyle,
];
