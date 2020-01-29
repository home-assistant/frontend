import { css } from "lit-element";

const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

export const hassioStyle = css`
  .card-group {
    margin-top: 24px;
  }
  .card-group .title {
    color: var(--primary-text-color);
    font-size: 2em;
    padding-left: 8px;
    margin-bottom: 8px;
  }
  .card-group .description {
    font-size: 0.5em;
    font-weight: 500;
    margin-top: 4px;
  }
  .card-group paper-card {
    --card-group-columns: 4;
    width: calc(
      (100% - 12px * var(--card-group-columns)) / var(--card-group-columns)
    );
    margin: 4px;
    vertical-align: top;
  }
  @media screen and (max-width: 1200px) and (min-width: 901px) {
    .card-group paper-card {
      --card-group-columns: 3;
    }
  }
  @media screen and (max-width: 900px) and (min-width: 601px) {
    .card-group paper-card {
      --card-group-columns: 2;
    }
  }
  @media screen and (max-width: 600px) and (min-width: 0) {
    .card-group paper-card {
      width: 100%;
      margin: 4px 0;
    }
    .content {
      padding: 0;
    }
  }
  ha-call-api-button {
    font-weight: 500;
    color: var(--primary-color);
  }
  .error {
    color: var(--google-red-500);
    margin-top: 16px;
  }
`;

documentContainer.innerHTML = `<dom-module id="hassio-style">
  <template>
    <style>
      ${hassioStyle.toString()}
    </style>
  </template>
</dom-module>`;

document.head.appendChild(documentContainer.content);
