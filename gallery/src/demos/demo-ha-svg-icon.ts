import {
  mdiRocketLaunch,
  mdiHomeAssistant,
  mdiDocker,
  mdiExclamationThick,
  mdiFlask,
} from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";
import "../../../src/components/ha-svg-icon";

@customElement("demo-ha-svg-icon")
export class DemoHaSvgIcon extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-svg-icon demo">
        <div class="card-content">
          <div class="icon">
            <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
            <ha-svg-icon .path=${mdiHomeAssistant} background></ha-svg-icon>
          </div>
          <div class="icon">
            <ha-svg-icon .path=${mdiRocketLaunch}></ha-svg-icon>
            <ha-svg-icon .path=${mdiRocketLaunch} background></ha-svg-icon>
          </div>
          <div class="icon">
            <ha-svg-icon .path=${mdiDocker}></ha-svg-icon>
            <ha-svg-icon .path=${mdiDocker} background></ha-svg-icon>
          </div>
          <div class="icon">
            <ha-svg-icon .path=${mdiExclamationThick}></ha-svg-icon>
            <ha-svg-icon .path=${mdiExclamationThick} background></ha-svg-icon>
          </div>
          <div class="icon">
            <ha-svg-icon .path=${mdiFlask}></ha-svg-icon>
            <ha-svg-icon .path=${mdiFlask} background></ha-svg-icon>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      ha-svg-icon {
        margin: 4px;
      }
      ha-svg-icon[background] {
        color: var(--card-background-color);
      }
      .icon {
        display: flex;
        align-items: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-svg-icon": DemoHaSvgIcon;
  }
}
