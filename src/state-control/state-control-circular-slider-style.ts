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
    font-size: 16px;
    line-height: 1.5;
    letter-spacing: 0.1px;
    gap: 8px;
    --mdc-icon-size: 16px;
  }
  .info * {
    margin: 0;
    pointer-events: auto;
  }
  .label {
    width: 60%;
    font-weight: 500;
    text-align: center;
    color: var(--action-color, inherit);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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
    gap: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }

  .buttons ha-outlined-icon-button {
    --md-outlined-icon-button-container-width: 48px;
    --md-outlined-icon-button-container-height: 48px;
    --md-outlined-icon-button-icon-size: 24px;
  }

  @container container (max-width: 250px) {
    ha-big-number {
      font-size: 44px;
    }
    .buttons {
      gap: 16px;
    }
    .info {
      margin-top: 12px;
      gap: 6px;
    }
    .buttons {
      display: none;
    }
    ha-control-circular-slider {
      margin-bottom: -16px;
    }
  }
  @container container (max-width: 190px) {
    ha-big-number {
      font-size: 32px;
    }
    .info {
      font-size: 14px;
      gap: 2px;
      --mdc-icon-size: 14px;
    }
  }

  @container container (max-width: 130px) {
    .label {
      display: none;
    }
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
