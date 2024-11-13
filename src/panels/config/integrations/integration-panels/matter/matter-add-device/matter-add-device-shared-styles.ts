import { css } from "lit";

export const sharedStyles = css`
  .content {
    padding: 16px var(--horizontal-padding, 16px);
  }
  p {
    margin: 0;
  }
  p:not(:last-child) {
    margin-bottom: 8px;
  }
  ol {
    padding-inline-start: 20px;
    margin-block-start: 0;
    margin-block-end: 8px;
  }
  li {
    margin-bottom: 8px;
  }
  .link {
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;
  }
  ha-md-list {
    padding: 0;
    --md-list-item-leading-space: var(--horizontal-padding, 16px);
    --md-list-item-trailing-space: var(--horizontal-padding, 16px);
    margin-bottom: 16px;
  }
  ha-textfield {
    width: 100%;
  }
`;
