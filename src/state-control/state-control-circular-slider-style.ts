import { ResizeController } from "@lit-labs/observers/resize-controller";
import type { ReactiveControllerHost } from "lit";
import { css } from "lit";

export const stateControlCircularSliderStyle = css`
  /* Layout elements */
  :host {
    width: 320px;
  }
  .container {
    position: relative;
    container-type: inline-size;
    container-name: container;
  }
  .info {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    font-size: var(--ha-font-size-l);
    line-height: var(--ha-line-height-normal);
    letter-spacing: 0.1px;
    gap: var(--ha-space-2);
    --mdc-icon-size: 16px;
  }
  .info * {
    margin: 0;
    pointer-events: auto;
  }
  .label {
    width: 60%;
    font-weight: var(--ha-font-weight-medium);
    text-align: center;
    color: var(--action-color, inherit);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: var(--ha-line-height-normal);
    min-height: 1.5em;
    white-space: nowrap;
  }
  .label span {
    white-space: nowrap;
  }
  .label ha-svg-icon {
    bottom: 5%;
  }
  .label.disabled {
    color: var(--secondary-text-color);
  }
  .buttons {
    position: absolute;
    bottom: 10px;
    left: 0;
    right: 0;
    margin: 0 auto;
    gap: var(--ha-space-6);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .buttons > * {
    pointer-events: auto;
  }
  .primary-state {
    font-size: 36px;
  }
  .buttons ha-outlined-icon-button {
    --md-outlined-icon-button-container-width: 48px;
    --md-outlined-icon-button-container-height: 48px;
    --md-outlined-icon-button-icon-size: 24px;
  }
  .container.md ha-big-number {
    font-size: 44px;
  }
  .container.md .state {
    font-size: var(--ha-font-size-3xl);
  }
  .container.md .info {
    margin-top: 12px;
    gap: 6px;
  }
  .container.md .buttons {
    display: none;
  }
  .container.md ha-control-circular-slider {
    margin-bottom: -16px;
  }

  .container.sm ha-big-number {
    font-size: var(--ha-font-size-4xl);
  }
  .container.sm .state {
    font-size: var(--ha-font-size-2xl);
  }
  .container.sm .info {
    margin-top: 12px;
    font-size: var(--ha-font-size-m);
    gap: 2px;
    --mdc-icon-size: 14px;
  }
  .container.sm .buttons {
    display: none;
  }
  .container.sm ha-control-circular-slider {
    margin-bottom: -16px;
  }

  .container.xs ha-big-number {
    font-size: var(--ha-font-size-4xl);
  }
  .container.xs .state {
    font-size: var(--ha-font-size-l);
  }
  .container.xs .info {
    margin-top: 12px;
  }
  .container.xs .buttons {
    display: none;
  }
  .container.xs ha-control-circular-slider {
    margin-bottom: -16px;
  }
  .container.xs .label {
    display: none;
  }

  /* Slider */
  ha-control-circular-slider {
    width: 100%;
    --control-circular-slider-color: var(--state-color, var(--disabled-color));
  }
  ha-control-circular-slider::after {
    display: block;
    content: "";
    position: absolute;
    top: -10%;
    left: -10%;
    right: -10%;
    bottom: -10%;
    background: radial-gradient(
      50% 50% at 50% 50%,
      var(--action-color, transparent) 0%,
      transparent 100%
    );
    opacity: 0.15;
    pointer-events: none;
  }
`;

export const createStateControlCircularSliderController = (
  element: ReactiveControllerHost & Element
) =>
  new ResizeController(element, {
    callback: (entries) => {
      const width = entries[0]?.contentRect.width;
      return width < 130
        ? "xs"
        : width < 190
          ? "sm"
          : width < 250
            ? "md"
            : "lg";
    },
  });
