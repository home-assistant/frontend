import { dump } from "js-yaml";
import { html, css, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-yaml-editor";
import { Condition } from "../../../../src/data/automation";
import { describeCondition } from "../../../../src/data/automation_i18n";

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

const initialCondition: Condition = {
  condition: "state",
  entity_id: "light.kitchen",
  state: "on",
};

@customElement("demo-automation-describe-condition")
export class DemoAutomationDescribeCondition extends LitElement {
  @state() _condition = initialCondition;

  protected render(): TemplateResult {
    return html`
      <ha-card header="Conditions">
        <div class="condition">
          <span>
            ${this._condition
              ? describeCondition(this._condition)
              : "<invalid YAML>"}
          </span>
          <ha-yaml-editor
            label="Condition Config"
            .defaultValue=${initialCondition}
            @value-changed=${this._dataChanged}
          ></ha-yaml-editor>
        </div>

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

  private _dataChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._condition = ev.detail.isValid ? ev.detail.value : undefined;
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
      ha-yaml-editor {
        width: 50%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-automation-describe-condition": DemoAutomationDescribeCondition;
  }
}
