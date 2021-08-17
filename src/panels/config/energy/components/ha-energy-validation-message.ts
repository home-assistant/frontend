import { mdiAlertOutline } from "@mdi/js";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { groupBy } from "../../../../common/util/group-by";
import "../../../../components/ha-svg-icon";
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
        <div class="issue-type">
          <div class="icon">
            <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>
          </div>
          <div class="content">
            <div class="title">
              ${this.hass.localize(
                `ui.panel.config.energy.validation.issues.${issueType}.title`
              ) || issueType}
            </div>

            ${this.hass.localize(
              `ui.panel.config.energy.validation.issues.${issueType}.description`
            )}
            ${issueType === "entity_not_tracked" || true
              ? html`
                  <a
                    href="https://www.home-assistant.io/integrations/recorder#configure-filter"
                    target="_blank"
                    rel="noopener noreferrer"
                    >${this.hass.localize(
                      "ui.panel.config.common.learn_more"
                    )}</a
                  >
                `
              : ""}

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
          </div>
        </div>
      `
    );
  }

  static styles = css`
    .issue-type {
      position: relative;
      padding: 4px;
      display: flex;
    }
    .issue-type::before {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: var(--warning-color);
      opacity: 0.12;
      pointer-events: none;
      content: "";
    }
    .icon {
      margin: 4px 8px;
      width: 24px;
    }
    ha-svg-icon {
      color: var(--warning-color);
    }
    .title {
      font-weight: bold;
      margin-top: 5px;
    }
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
