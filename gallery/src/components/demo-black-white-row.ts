import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";

@customElement("demo-black-white-row")
class DemoBlackWhiteRow extends LitElement {
  @property() value!: any;

  protected render(): TemplateResult {
    return html`
      <div class="row">
        <div class="content light">
          <slot name="light"></slot>
        </div>
        <div class="content dark">
          <slot name="dark"></slot>
          ${this.value
            ? html`<pre>${JSON.stringify(this.value, undefined, 2)}</pre>`
            : ""}
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
      width: 50%;
    }
    .light {
      flex: 1;
      padding-left: 50px;
      padding-right: 50px;
      box-sizing: border-box;
    }
    .dark {
      flex: 1;
      padding-left: 50px;
      padding-right: 50px;
      box-sizing: border-box;
      flex-wrap: wrap;
    }
    pre {
      width: 300px;
      margin: 8 16px 0;
      overflow: auto;
      color: var(--primary-text-color);
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
