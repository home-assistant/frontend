import { mdiLightbulbOutline } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";

import "./ha-svg-icon";

@customElement("ha-tip")
class HaTip extends LitElement {
  public render() {
    return html`
      <ha-svg-icon .path=${mdiLightbulbOutline}></ha-svg-icon>
      <span class="prefix">Tip!</span>
      <span class="text"><slot></slot></span>
    `;
  }

  static styles = css`
    :host {
      display: block;
      text-align: center;
    }

    .text {
      margin-left: 2px;
      color: var(--secondary-text-color);
    }

    .prefix {
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tip": HaTip;
  }
}
