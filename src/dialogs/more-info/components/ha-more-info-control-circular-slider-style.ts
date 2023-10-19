import { css } from "lit";

export const moreInfoControlCircularSliderStyle = css`
  /* Layout elements */
  .container {
    position: relative;
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
    line-height: 24px;
    letter-spacing: 0.1px;
  }
  .info * {
    margin: 0;
    pointer-events: auto;
  }
  /* Info elements */
  .label-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 200px;
    height: 48px;
    margin-bottom: 6px;
  }
  .label {
    font-weight: 500;
    text-align: center;
    color: var(--action-color, inherit);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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
    width: 120px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .buttons ha-outlined-icon-button {
    --md-outlined-icon-button-container-width: 48px;
    --md-outlined-icon-button-container-height: 48px;
    --md-outlined-icon-button-icon-size: 24px;
  }
  /* Accessibility */
  .visually-hidden {
    position: absolute;
    overflow: hidden;
    clip: rect(0 0 0 0);
    height: 1px;
    width: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
  }
  /* Slider */
  ha-control-circular-slider {
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
