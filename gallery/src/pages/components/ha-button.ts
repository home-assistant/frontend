import { mdiHome } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { applyThemesOnElement } from "../../../../src/common/dom/apply_themes_on_element";
import { titleCase } from "../../../../src/common/string/title-case";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";

const appearances = ["accent", "filled", "plain"];
const variants = ["brand", "danger", "neutral", "warning", "success"];

@customElement("demo-components-ha-button")
export class DemoHaButton extends LitElement {
  protected render(): TemplateResult {
    return html`
      ${["light", "dark"].map(
        (mode) => html`
          <div class=${mode}>
            <ha-card header="ha-button in ${mode}">
              <div class="card-content">
                ${variants.map(
                  (variant) => html`
                    <div>
                      ${appearances.map(
                        (appearance) => html`
                          <ha-button
                            .appearance=${appearance}
                            .variant=${variant}
                          >
                            <ha-svg-icon
                              .path=${mdiHomeAssistant}
                              slot="start"
                            ></ha-svg-icon>
                            ${titleCase(`${variant} ${appearance}`)}
                            <ha-svg-icon
                              .path=${mdiHome}
                              slot="end"
                            ></ha-svg-icon>
                          </ha-button>
                        `
                      )}
                    </div>
                    <div>
                      ${appearances.map(
                        (appearance) => html`
                          <ha-button
                            .appearance=${appearance}
                            .variant=${variant}
                            size="small"
                          >
                            ${titleCase(`${variant} ${appearance}`)}
                          </ha-button>
                        `
                      )}
                    </div>
                    <div>
                      ${appearances.map(
                        (appearance) => html`
                          <ha-button
                            .appearance=${appearance}
                            .variant=${variant}
                            loading
                          >
                            <ha-svg-icon
                              .path=${mdiHomeAssistant}
                              slot="start"
                            ></ha-svg-icon>
                            ${titleCase(`${variant} ${appearance}`)}
                            <ha-svg-icon
                              .path=${mdiHome}
                              slot="end"
                            ></ha-svg-icon>
                          </ha-button>
                        `
                      )}
                    </div>
                  `
                )}
                ${variants.map(
                  (variant) => html`
                    <div>
                      ${appearances.map(
                        (appearance) => html`
                          <ha-button
                            .variant=${variant}
                            .appearance=${appearance}
                            disabled
                          >
                            ${titleCase(`${appearance}`)}
                          </ha-button>
                        `
                      )}
                    </div>
                    <div>
                      ${appearances.map(
                        (appearance) => html`
                          <ha-button
                            .variant=${variant}
                            .appearance=${appearance}
                            size="small"
                            disabled
                          >
                            ${titleCase(`${appearance}`)}
                          </ha-button>
                        `
                      )}
                    </div>
                  `
                )}
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
    .button {
      padding: unset;
    }
    ha-card {
      margin: 24px auto;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
    }
    .card-content div {
      display: flex;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-button": DemoHaButton;
  }
}
