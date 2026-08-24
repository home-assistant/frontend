import { css } from "lit";

export const pulseOpacityAnimation = css`
  @keyframes pulse-opacity {
    from {
      opacity: 0;
    }
    to {
      opacity: var(--ha-pulse-opacity, 0.3);
    }
  }
`;
