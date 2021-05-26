import "@polymer/polymer/lib/elements/dom-module";
import { CSSResult } from "lit";
import { haStyle } from "../resources/styles";

const documentContainer = document.createElement("template");
documentContainer.setAttribute("style", "display: none;");

documentContainer.innerHTML = `<dom-module id="ha-style">
  <template>
    <style>
    ${(haStyle as CSSResult).cssText}
    </style>
  </template>
</dom-module>`;

document.head.appendChild(documentContainer.content);
