import { html, LitElement, css, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";

@customElement("demo-black-white-row")
class DemoBlackWhiteRow extends LitElement {
  @property() title!: string;

  @property() value!: any;

  protected render(): TemplateResult {
    return html`
      <div class="row">
        <div class="content light">
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="light"></slot>
            </div>
            <div class="card-actions">
              <mwc-button>Submit</mwc-button>
            </div>
          </ha-card>
        </div>
        <div class="content dark">
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="dark"></slot>
            </div>
            <div class="card-actions">
              <mwc-button>Submit</mwc-button>
            </div>
          </ha-card>
          <pre>${JSON.stringify(this.value, undefined, 2)}</pre>
        </div>
      </div>
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    applyThemesOnElement(
      this.shadowRoot!.querySelector(".dark"),
      {
        default_theme: "default",
        default_dark_theme: "default",
        themes: {},
        darkMode: false,
      },
      "default",
      { dark: true }
    );
  }

  static styles = css`
    .row {
      display: flex;
    }
    .content {
      padding: 50px 0;
      background-color: var(--primary-background-color);
    }
    .light {
      flex: 1;
      padding-left: 50px;
      padding-right: 50px;
      box-sizing: border-box;
    }
    .light ha-card {
      margin-left: auto;
    }
    .dark {
      display: flex;
      flex: 1;
      padding-left: 50px;
      box-sizing: border-box;
      flex-wrap: wrap;
    }
    ha-card {
      width: 400px;
    }
    pre {
      width: 300px;
      margin: 0 16px 0;
      overflow: auto;
      color: var(--primary-text-color);
    }
    .card-actions {
      display: flex;
      flex-direction: row-reverse;
      border-top: none;
    }
    @media only screen and (max-width: 1500px) {
      .light {
        flex: initial;
      }
    }
    @media only screen and (max-width: 1000px) {
      .light,
      .dark {
        padding: 16px;
      }
      .row,
      .dark {
        flex-direction: column;
      }
      ha-card {
        margin: 0 auto;
        width: 100%;
        max-width: 400px;
      }
      pre {
        margin: 16px auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-black-white-row": DemoBlackWhiteRow;
  }
}
