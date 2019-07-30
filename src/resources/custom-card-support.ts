import { LitElement, html, css } from "lit-element";

(LitElement.prototype as any).html = html;
(LitElement.prototype as any).css = css;
