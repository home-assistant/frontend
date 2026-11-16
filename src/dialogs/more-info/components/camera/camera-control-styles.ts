import { css } from "lit";

/** A quiet note under a camera control, like why it can't be used. */
export const cameraControlHintStyle = css`
  .hint {
    box-sizing: border-box;
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
    padding: var(--ha-space-2) var(--ha-space-3);
    border-radius: var(--ha-border-radius-md);
    background-color: var(--ha-color-fill-neutral-quiet-resting);
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    line-height: var(--ha-line-height-condensed);
    text-align: center;
  }

  .hint a {
    color: var(--primary-color);
  }
`;
