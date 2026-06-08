import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

const SHADOWS = ["s", "m", "l"] as const;

@customElement("demo-misc-box-shadow")
export class DemoMiscBoxShadow extends LitElement {
  protected render() {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <div slot=${slot} class="panel-content">
              <div class="grid">
                ${SHADOWS.map(
                  (size) => html`
                    <div
                      class="box"
                      style="box-shadow: var(--ha-box-shadow-${size})"
                    >
                      ${size}
                    </div>
                  `
                )}
              </div>
            </div>
          `
        )}
      </demo-theme-comparison>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 32px;
    }

    .box {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 120px;
      border-radius: 12px;
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 16px;
      font-weight: 500;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-misc-box-shadow": DemoMiscBoxShadow;
  }
}
