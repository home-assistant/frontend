import { css, html, LitElement } from "lit";

(LitElement.prototype as any).html = html;
(LitElement.prototype as any).css = css;
