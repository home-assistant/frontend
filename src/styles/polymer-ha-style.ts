import "@polymer/polymer/lib/elements/dom-module";
import { haStyle } from "../resources/styles";

const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `<dom-module id="ha-style">
  <template>
    <style>
    ${haStyle.cssText}
    </style>
  </template>
</dom-module>`;

document.head.appendChild(documentContainer.content);
