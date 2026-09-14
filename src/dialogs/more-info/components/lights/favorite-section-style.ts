import { css } from "lit";

export const favoriteSectionStyle = css`
  :host {
    display: block;
    width: 100%;
  }

  .group {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  h4 {
    margin: 0 0 var(--ha-space-2);
    color: var(--secondary-text-color);
    font-size: var(--ha-font-size-s);
    font-weight: var(--ha-font-weight-medium);
    text-align: center;
  }
`;
