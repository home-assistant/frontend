import { css } from "lit";

export const cardFeatureStyles = css`
  ha-control-select-menu {
    box-sizing: border-box;
    --control-select-menu-height: var(--feature-height);
    --control-select-menu-border-radius: var(--feature-border-radius);
    line-height: 1.2;
    display: block;
    width: 100%;
  }
  ha-control-select {
    --control-select-color: var(--feature-color);
    --control-select-padding: 0;
    --control-select-thickness: var(--feature-height);
    --control-select-border-radius: var(--feature-border-radius);
    --control-select-button-border-radius: var(--feature-border-radius);
  }
  ha-control-button-group {
    --control-button-group-spacing: var(--feature-button-spacing);
    --control-button-group-thickness: var(--feature-height);
  }
  ha-control-slider {
    --control-slider-color: var(--feature-color);
    --control-slider-background: var(--feature-color);
    --control-slider-background-opacity: 0.2;
    --control-slider-thickness: var(--feature-height);
    --control-slider-border-radius: var(--feature-border-radius);
  }
`;
