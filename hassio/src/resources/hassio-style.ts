import { css } from "lit-element";

const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

export const hassioStyle = css`
  .content {
    margin: 8px;
  }
  h1 {
    color: var(--primary-text-color);
    font-size: 2em;
    margin-bottom: 8px;
    font-family: var(--paper-font-headline_-_font-family);
    -webkit-font-smoothing: var(--paper-font-headline_-_-webkit-font-smoothing);
    font-size: var(--paper-font-headline_-_font-size);
    font-weight: var(--paper-font-headline_-_font-weight);
    letter-spacing: var(--paper-font-headline_-_letter-spacing);
    line-height: var(--paper-font-headline_-_line-height);
  }
  .description {
    margin-top: 4px;
  }
  .card-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    grid-gap: 8px;
  }
  .card-group > * {
    max-width: 450px;
  }
  @media screen and (max-width: 800px) {
    .card-group > * {
      max-width: 100%;
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
