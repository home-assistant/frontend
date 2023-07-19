import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-tip";
import "../../../../src/components/ha-card";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import { provideHass } from "../../../../src/fake_data/provide_hass";

const tips: (string | TemplateResult)[] = [
  "Test tip",
  "Bigger test tip, with some random text just to fill up as much space as possible without it looking like I'm really trying to to that",
  html`<i>Tip</i> <b>with</b> <sub>HTML</sub>`,
];

@customElement("demo-components-ha-tip")
export class DemoHaTip extends LitElement {
  protected render(): TemplateResult {
    return html` ${["light", "dark"].map(
      (mode) => html`
        <div class=${mode}>
          <ha-card header="ha-tip ${mode} demo">
            <div class="card-content">
              ${tips.map(
                (tip) =>
                  html`<ha-tip .hass=${provideHass(this)}>${tip}</ha-tip>`
              )}
            </div>
          </ha-card>
        </div>
      `
    )}`;
  }

  firstUpdated(changedProps) {
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

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
      .dark,
      .light {
        display: block;
        background-color: var(--primary-background-color);
        padding: 0 50px;
      }
      ha-tip {
        margin-bottom: 14px;
      }
      ha-card {
        margin: 24px auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-tip": DemoHaTip;
  }
}
