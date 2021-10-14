import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import { fireEvent } from "../../../src/common/dom/fire_event";

@customElement("demo-submit-form")
class DemoSubmitForm extends LitElement {
  @property() header!: string;

  @property() disabled = false;

  protected render(): TemplateResult {
    return html`
      <ha-card .header=${this.header}>
        <div class="card-content">
          <slot name="content"></slot>
        </div>
        <div class="card-actions">
          <mwc-button .disabled=${this.disabled} @click=${this.handleSubmit}>
            Submit
          </mwc-button>
        </div>
      </ha-card>
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

  handleSubmit() {
    fireEvent(this, "submitted" as any);
  }

  static styles = css`
    ha-card {
      width: 400px;
    }
    pre {
      width: 300px;
      margin: 8px 16px 0;
      overflow: auto;
      color: var(--primary-text-color);
    }
    .card-actions {
      display: flex;
      flex-direction: row-reverse;
      border-top: none;
    }
    @media only screen and (max-width: 1000px) {
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
    "demo-submit-form": DemoSubmitForm;
  }
}
