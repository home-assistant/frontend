import type { PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";

const SHADOWS = ["s", "m", "l"] as const;

@customElement("demo-misc-box-shadow")
export class DemoMiscBoxShadow extends LitElement {
  protected render() {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <h2>${mode}</h2>
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
    `;
  }

  firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    applyThemesOnElement(
      this.shadowRoot!.querySelector(".dark"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: true,
        theme: "default",
      },
      undefined,
      undefined,
      true
    );
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      gap: 48px;
      padding: 48px;
    }

    .light,
    .dark {
      flex: 1;
      background-color: var(--ha-color-surface-low);
      border-radius: 16px;
      padding: 32px;
    }

    h2 {
      margin: 0 0 24px;
      font-size: 18px;
      font-weight: 500;
      color: var(--primary-text-color);
      text-transform: capitalize;
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
