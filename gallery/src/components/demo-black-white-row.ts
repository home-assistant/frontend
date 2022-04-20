import { Button } from "@material/mwc-button";
import { html, LitElement, css, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-card";

@customElement("demo-black-white-row")
class DemoBlackWhiteRow extends LitElement {
  @property() title!: string;

  @property() value!: any;

  @property() disabled = false;

  protected render(): TemplateResult {
    return html`
      <div class="row">
        <div class="content light">
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="light"></slot>
            </div>
            <div class="card-actions">
              <mwc-button
                .disabled=${this.disabled}
                @click=${this.handleSubmit}
              >
                Submit
              </mwc-button>
            </div>
          </ha-card>
        </div>
        <div class="content dark">
          <ha-card .header=${this.title}>
            <div class="card-content">
              <slot name="dark"></slot>
            </div>
            <div class="card-actions">
              <mwc-button
                .disabled=${this.disabled}
                @click=${this.handleSubmit}
              >
                Submit
              </mwc-button>
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
        darkMode: true,
        theme: "default",
      },
      undefined,
      undefined,
      true
    );
  }

  handleSubmit(ev) {
    const content = (ev.target as Button).closest(".content")!;
    fireEvent(this, "submitted" as any, {
      slot: content.classList.contains("light") ? "light" : "dark",
    });
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
