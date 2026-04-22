import type { TemplateResult, PropertyValues } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-textarea";

@customElement("demo-components-ha-textarea")
export class DemoHaTextarea extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-textarea in ${mode}">
              <div class="card-content">
                <h3>Basic</h3>
                <div class="row">
                  <ha-textarea label="Default"></ha-textarea>
                  <ha-textarea
                    label="With value"
                    value="Hello world"
                  ></ha-textarea>
                  <ha-textarea
                    label="With placeholder"
                    placeholder="Type here..."
                  ></ha-textarea>
                </div>

                <h3>Autogrow</h3>
                <div class="row">
                  <ha-textarea
                    label="Autogrow empty"
                    resize="auto"
                  ></ha-textarea>
                  <ha-textarea
                    label="Autogrow with value"
                    resize="auto"
                    value="This textarea will grow as you type more content into it. Try adding more lines to see the effect."
                  ></ha-textarea>
                </div>

                <h3>States</h3>
                <div class="row">
                  <ha-textarea
                    label="Disabled"
                    disabled
                    value="Disabled"
                  ></ha-textarea>
                  <ha-textarea
                    label="Readonly"
                    readonly
                    value="Readonly"
                  ></ha-textarea>
                  <ha-textarea label="Required" required></ha-textarea>
                </div>
                <div class="row">
                  <ha-textarea
                    label="Invalid"
                    invalid
                    validation-message="This field is required"
                    value=""
                  ></ha-textarea>
                  <ha-textarea
                    label="With hint"
                    hint="Supports Markdown"
                  ></ha-textarea>
                  <ha-textarea
                    label="With rows"
                    .rows=${6}
                    placeholder="6 rows"
                  ></ha-textarea>
                </div>

                <h3>No label</h3>
                <div class="row">
                  <ha-textarea
                    placeholder="No label, just placeholder"
                  ></ha-textarea>
                  <ha-textarea
                    resize="auto"
                    placeholder="No label, autogrow"
                  ></ha-textarea>
                </div>
              </div>
            </ha-card>
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
      justify-content: center;
    }
    .dark,
    .light {
      display: block;
      background-color: var(--primary-background-color);
      padding: 0 50px;
    }
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    h3 {
      margin: var(--ha-space-4) 0 var(--ha-space-1) 0;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
    }
    h3:first-child {
      margin-top: 0;
    }
    .row {
      display: flex;
      gap: var(--ha-space-4);
    }
    .row > * {
      flex: 1;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-textarea": DemoHaTextarea;
  }
}
