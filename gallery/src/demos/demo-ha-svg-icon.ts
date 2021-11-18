import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import { getColorByIndex } from "../../../src/common/color/colors";
import { FIXED_DOMAIN_ICONS } from "../../../src/common/const";
import "../../../src/components/ha-card";
import "../../../src/components/ha-svg-icon";

@customElement("demo-ha-svg-icon")
export class DemoHaSvgIcon extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-svg-icon demo">
        <div class="card-content">
          ${Object.values(FIXED_DOMAIN_ICONS).map(
            (icon) => html`
              <div class="icon">
                <ha-svg-icon .path=${icon}></ha-svg-icon>
                <ha-svg-icon
                  .path=${icon}
                  .backgroundColor=${getColorByIndex(icon.length)}
                ></ha-svg-icon>
                <ha-svg-icon
                  class="background"
                  .path=${icon}
                  .backgroundColor=${getColorByIndex(icon.length)}
                ></ha-svg-icon>
              </div>
            `
          )}
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
      .background {
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
