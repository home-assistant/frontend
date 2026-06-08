import { mdiHome } from "@mdi/js";
import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators";
import { titleCase } from "../../../../src/common/string/title-case";
import "../../../../src/components/ha-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";
import { THEME_COMPARISON_PANELS } from "../../components/demo-theme-comparison";

const appearances = ["accent", "filled", "plain"];
const variants = ["brand", "danger", "neutral", "warning", "success"];

@customElement("demo-components-ha-button")
export class DemoHaButton extends LitElement {
  protected render(): TemplateResult {
    return html`
      <demo-theme-comparison>
        ${THEME_COMPARISON_PANELS.map(
          ({ slot }) => html`
            <ha-card slot=${slot} header="ha-button">
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
                            size="s"
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
                            size="s"
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
          `
        )}
      </demo-theme-comparison>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
    .button {
      padding: unset;
    }
    ha-card {
      margin: 0;
      width: 100%;
    }
    .card-content {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-6);
    }
    .card-content div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-button": DemoHaButton;
  }
}
