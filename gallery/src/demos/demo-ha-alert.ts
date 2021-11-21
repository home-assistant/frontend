import "../../../src/components/ha-logo-svg";
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
  iconSlot?: TemplateResult;
  actionSlot?: TemplateResult;
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
    title: "Slotted icon",
    description: "Alert with slotted icon",
    type: "warning",
    iconSlot: html`<span slot="icon" class="image">
      <ha-logo-svg></ha-logo-svg>
    </span>`,
  },
  {
    title: "Slotted image",
    description: "Alert with slotted image",
    type: "warning",
    iconSlot: html`<span slot="icon" class="image"
      ><img src="https://www.home-assistant.io/images/home-assistant-logo.svg"
    /></span>`,
  },
  {
    title: "Slotted action",
    description: "Alert with slotted action",
    type: "info",
    actionSlot: html`<mwc-button slot="action" label="action"></mwc-button>`,
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
        <div class="card-content">
          ${alerts.map(
            (alert) => html`
              <ha-alert
                .title=${alert.title || ""}
                .alertType=${alert.type}
                .dismissable=${alert.dismissable || false}
                .actionText=${alert.action || ""}
                .rtl=${alert.rtl || false}
              >
                ${alert.iconSlot} ${alert.description} ${alert.actionSlot}
              </ha-alert>
            `
          )}
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card {
        max-width: 600px;
        margin: 24px auto;
      }
      ha-alert {
        display: block;
        margin: 24px 0;
      }
      .condition {
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .image {
        display: inline-flex;
        height: 100%;
        align-items: center;
      }
      img {
        max-height: 24px;
        width: 24px;
      }
      mwc-button {
        --mdc-theme-primary: var(--primary-text-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-alert": DemoHaAlert;
  }
}
