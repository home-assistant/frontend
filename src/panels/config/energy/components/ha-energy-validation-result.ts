import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { groupBy } from "../../../../common/util/group-by";
import "../../../../components/ha-alert";
import { EnergyValidationIssue } from "../../../../data/energy";
import { HomeAssistant } from "../../../../types";

@customElement("ha-energy-validation-result")
class EnergyValidationMessage extends LitElement {
  @property({ attribute: false })
  public hass!: HomeAssistant;

  @property()
  public issues!: EnergyValidationIssue[];

  public render() {
    if (this.issues.length === 0) {
      return html``;
    }

    const grouped = groupBy(this.issues, (issue) => issue.type);

    return Object.entries(grouped).map(
      ([issueType, gIssues]) => html`
          <ha-alert
            alert-type="warning"
            .title=${
              this.hass.localize(
                `ui.panel.config.energy.validation.issues.${issueType}.title`
              ) || issueType
            }
          >
            ${this.hass.localize(
              `ui.panel.config.energy.validation.issues.${issueType}.description`,
              { currency: this.hass.config.currency }
            )}
            ${
              issueType === "recorder_untracked"
                ? html`(<a
                      href="https://www.home-assistant.io/integrations/recorder#configure-filter"
                      target="_blank"
                      rel="noopener noreferrer"
                      >${this.hass.localize(
                        "ui.panel.config.common.learn_more"
                      )}</a
                    >)`
                : ""
            }
            <ul>
              ${gIssues.map(
                (issue) =>
                  html`<li>
                    ${issue.identifier}${issue.value
                      ? html` (${issue.value})`
                      : ""}
                  </li>`
              )}
            </ul>
          </ha-alert>
        </div>
      `
    );
  }

  static styles = css`
    ul {
      padding-left: 24px;
      margin: 4px 0;
    }
    a {
      color: var(--primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-validation-result": EnergyValidationMessage;
  }
}
