import { css } from "lit";
export const hacsLinkStyle = css`
  a {
    text-decoration: var(--hcv-text-decoration-link);
    color: var(--hcv-text-color-link);
  }
`;

export const hacsIconStyle = css`
  ha-svg-icon {
    color: var(--hcv-color-icon);
  }
`;

export const hacsButtonStyle = css`
  mwc-button[raised] {
    border-radius: 4px;
  }
  mwc-button[raised] > ha-circular-progress {
    --mdc-theme-primary: var(--hcv-text-color-primary);
  }
`;

export const scrollBarStyle = css`
  *::-webkit-scrollbar {
    width: 0.4rem;
    height: 0.4rem;
  }

  *::-webkit-scrollbar-track {
    -webkit-border-radius: 4px;
    border-radius: 4px;
    background: var(--scrollbar-thumb-color);
  }

  *::-webkit-scrollbar-thumb {
    background-color: var(--accent-color);
    border-radius: 0.3em;
  }
  .scroll {
    overflow-y: auto;
    scrollbar-color: var(--scrollbar-thumb-color) transparent;
    scrollbar-width: thin;
  }
`;
