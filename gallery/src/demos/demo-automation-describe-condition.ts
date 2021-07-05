import { dump } from "js-yaml";
import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";
import { describeCondition } from "../../../src/data/automation_i18n";

const conditions = [
  { condition: "and" },
  { condition: "not" },
  { condition: "or" },
  { condition: "state" },
  { condition: "numeric_state" },
  { condition: "sun", after: "sunset" },
  { condition: "sun", after: "sunrise" },
  { condition: "zone" },
  { condition: "time" },
  { condition: "template" },
];

@customElement("demo-automation-describe-condition")
export class DemoAutomationDescribeCondition extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="Conditions">
        ${conditions.map(
          (conf) => html`
            <div class="condition">
              <span>${describeCondition(conf as any)}</span>
              <pre>${dump(conf)}</pre>
            </div>
          `
        )}
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      .condition {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      span {
        margin-right: 16px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-describe-condition": DemoAutomationDescribeCondition;
  }
}
