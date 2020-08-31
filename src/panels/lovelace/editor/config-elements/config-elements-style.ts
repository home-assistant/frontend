import { html } from "lit-element";

export const configElementStyle = html`
  <style>
    ha-switch {
      padding: 16px 0;
    }
    .side-by-side {
      display: flex;
    }
    .side-by-side > * {
      flex: 1;
      padding-right: 4px;
    }
    .suffix {
      margin: 0 8px;
    }

    .header-footer {
      border: 1px solid var(--divider-color);
      padding: 12px;
    }
  </style>
`;
