import { css } from "lit";

export const cardFeatureStyles = css`
  ha-control-select-menu {
    box-sizing: border-box;
    --control-select-menu-height: var(--feature-height);
    --control-select-menu-border-radius: var(--feature-border-radius);
    --control-select-menu-focus-color: var(--feature-color);
    line-height: var(--ha-line-height-condensed);
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
  ha-control-button-group > ha-control-button {
    flex-basis: 20px;
    --control-button-padding: 0px;
  }
  ha-control-button-group[no-stretch] > ha-control-button {
    max-width: 48px;
  }
  ha-control-button {
    --control-button-focus-color: var(--feature-color);
  }
  ha-control-slider {
    --control-slider-color: var(--feature-color);
    --control-slider-background: var(--feature-color);
    --control-slider-background-opacity: 0.2;
    --control-slider-thickness: var(--feature-height);
    --control-slider-border-radius: var(--feature-border-radius);
  }
  ha-control-switch {
    --control-switch-on-color: var(--feature-color);
    --control-switch-off-color: var(--feature-color);
    --control-switch-background-opacity: 0.2;
    --control-switch-thickness: var(--feature-height);
    --control-switch-border-radius: var(--feature-border-radius);
    --control-switch-padding: 0px;
  }
`;
