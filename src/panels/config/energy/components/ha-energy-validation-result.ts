import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
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
      return nothing;
    }

    return this.issues.map(
      (issue) => html`
        <ha-alert
          alert-type="warning"
          .title=${this.hass.localize(
            `component.energy.issues.${issue.type}.title`
          ) || issue.type}
        >
          ${this.hass.localize(
            `component.energy.issues.${issue.type}.description`,
            issue.translation_placeholders
          )}
          ${issue.type === "recorder_untracked"
            ? html`(<a
                  href="https://www.home-assistant.io/integrations/recorder#configure-filter"
                  target="_blank"
                  rel="noopener noreferrer"
                  >${this.hass.localize("ui.panel.config.common.learn_more")}</a
                >)`
            : ""}
          <ul>
            ${issue.affected_entities.map(
              ([entity, value]) =>
                html`<li>${entity}${value ? html` (${value})` : ""}</li>`
            )}
          </ul>
        </ha-alert>
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
