import { ContextProvider } from "@lit/context";
import { mdiMagnify } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/input/ha-input";
import "../../../../src/components/input/ha-input-copy";
import "../../../../src/components/input/ha-input-multi";
import "../../../../src/components/input/ha-input-search";
import { localizeContext } from "../../../../src/data/context";

const LOCALIZE_KEYS: Record<string, string> = {
  "ui.common.copy": "Copy",
  "ui.common.show": "Show",
  "ui.common.hide": "Hide",
  "ui.common.add": "Add",
  "ui.common.remove": "Remove",
  "ui.common.search": "Search",
  "ui.common.copied_clipboard": "Copied to clipboard",
};

@customElement("demo-components-ha-input")
export class DemoHaInput extends LitElement {
  // Provides localizeContext for ha-input-copy, ha-input-multi and ha-input-search
  private _localizeProvider = new ContextProvider(this, {
    context: localizeContext,
    initialValue: ((key: string) => LOCALIZE_KEYS[key] ?? key) as any,
  });

  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-input in ${mode}">
              <div class="card-content">
                <h3>Basic</h3>
                <div class="row">
                  <ha-input label="Default"></ha-input>
                  <ha-input label="With value" value="Hello"></ha-input>
                  <ha-input
                    label="With placeholder"
                    placeholder="Type here..."
                  ></ha-input>
                </div>

                <h3>Input types</h3>
                <div class="row">
                  <ha-input label="Text" type="text" value="Text"></ha-input>
                  <ha-input label="Number" type="number" value="42"></ha-input>
                  <ha-input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                  ></ha-input>
                </div>
                <div class="row">
                  <ha-input
                    label="Password"
                    type="password"
                    value="secret"
                    password-toggle
                  ></ha-input>
                  <ha-input label="URL" type="url" placeholder="https://...">
                  </ha-input>
                  <ha-input label="Date" type="date"></ha-input>
                </div>

                <h3>States</h3>
                <div class="row">
                  <ha-input
                    label="Disabled"
                    disabled
                    value="Disabled"
                  ></ha-input>
                  <ha-input
                    label="Readonly"
                    readonly
                    value="Readonly"
                  ></ha-input>
                  <ha-input label="Required" required></ha-input>
                </div>
                <div class="row">
                  <ha-input
                    label="Invalid"
                    invalid
                    validation-message="This field is required"
                    value=""
                  ></ha-input>
                  <ha-input label="With hint" hint="This is a hint"></ha-input>
                  <ha-input
                    label="With clear"
                    with-clear
                    value="Clear me"
                  ></ha-input>
                </div>

                <h3>With slots</h3>
                <div class="row">
                  <ha-input label="With prefix">
                    <span slot="start">$</span>
                  </ha-input>
                  <ha-input label="With suffix">
                    <span slot="end">kg</span>
                  </ha-input>
                  <ha-input label="With icon">
                    <ha-svg-icon .path=${mdiMagnify} slot="start"></ha-svg-icon>
                  </ha-input>
                </div>

                <h3>Appearance: outlined</h3>
                <div class="row">
                  <ha-input
                    appearance="outlined"
                    label="Outlined"
                    value="Hello"
                  ></ha-input>
                  <ha-input
                    appearance="outlined"
                    label="Outlined disabled"
                    disabled
                    value="Disabled"
                  ></ha-input>
                  <ha-input
                    appearance="outlined"
                    label="Outlined invalid"
                    invalid
                    validation-message="Required"
                  ></ha-input>
                </div>
                <div class="row">
                  <ha-input
                    appearance="outlined"
                    placeholder="Placeholder only"
                  ></ha-input>
                </div>
              </div>
            </ha-card>

            <ha-card header="Derivatives in ${mode}">
              <div class="card-content">
                <h3>ha-input-search</h3>
                <ha-input-search label="Search label"></ha-input-search>
                <ha-input-search appearance="outlined"></ha-input-search>

                <h3>ha-input-copy</h3>
                <ha-input-copy
                  value="my-api-token-123"
                  masked-value="••••••••••••••••••"
                  masked-toggle
                ></ha-input-copy>

                <h3>ha-input-multi</h3>
                <ha-input-multi
                  label="URL"
                  add-label="Add URL"
                  .value=${["https://example.com"]}
                ></ha-input-multi>
              </div>
            </ha-card>
          </div>
        `
      )}
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
    "demo-components-ha-input": DemoHaInput;
  }
}
