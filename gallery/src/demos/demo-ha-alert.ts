import { html, css, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-alert";
import "../../../src/components/ha-card";

const alerts: {
  title?: string;
  description: string | TemplateResult;
  type: "info" | "warning" | "error" | "success";
  dismissable?: boolean;
  action?: string;
  rtl?: boolean;
}[] = [
  {
    title: "Test info alert",
    description: "This is a test info alert with a title and description",
    type: "info",
  },
  {
    title: "Test warning alert",
    description: "This is a test warning alert with a title and description",
    type: "warning",
  },
  {
    title: "Test error alert",
    description: "This is a test error alert with a title and description",
    type: "error",
  },
  {
    title: "Test warning with long string",
    description:
      "sensor.lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum_lorem_ipsum",
    type: "warning",
  },
  {
    title: "Test success alert",
    description: "This is a test success alert with a title and description",
    type: "success",
  },
  {
    description: "This is a test info alert with description only",
    type: "info",
  },
  {
    description:
      "This is a test warning alert with a rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really rally really really long description only",
    type: "warning",
  },
  {
    title: "Error with description and list",
    description: html`<p>
        This is a test error alert with a title, description and a list
      </p>
      <ul>
        <li>List item #1</li>
        <li>List item #2</li>
        <li>List item #3</li>
      </ul>`,
    type: "error",
  },
  {
    title: "Test dismissable alert",
    description: "This is a test success alert that can be dismissable",
    type: "success",
    dismissable: true,
  },
  {
    description: "Dismissable information",
    type: "info",
    dismissable: true,
  },
  {
    title: "Error with action",
    description: "This is a test error alert with action",
    type: "error",
    action: "restart",
  },
  {
    title: "Unsaved data",
    description: "You have unsaved data",
    type: "warning",
    action: "save",
  },
  {
    description: "Dismissable information (RTL)",
    type: "info",
    dismissable: true,
    rtl: true,
  },
  {
    title: "Error with action",
    description: "This is a test error alert with action (RTL)",
    type: "error",
    action: "restart",
    rtl: true,
  },
  {
    title: "Test success alert (RTL)",
    description: "This is a test success alert with a title and description",
    type: "success",
    rtl: true,
  },
];

@customElement("demo-ha-alert")
export class DemoHaAlert extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-alert demo">
        ${alerts.map(
          (alert) => html`
            <ha-alert
              .title=${alert.title || ""}
              .alertType=${alert.type}
              .dismissable=${alert.dismissable || false}
              .actionText=${alert.action || ""}
              .rtl=${alert.rtl || false}
            >
              ${alert.description}
            </ha-alert>
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
    "demo-ha-alert": DemoHaAlert;
  }
}
