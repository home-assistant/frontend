/* eslint-disable lit/no-template-arrow */
import "@material/mwc-button";
import { LitElement, TemplateResult, html } from "lit";
import { customElement } from "lit/decorators";
import { computeInitialHaFormData } from "../../../../src/components/ha-form/compute-initial-ha-form-data";
import type { HaFormSchema } from "../../../../src/components/ha-form/types";
import "../../../../src/components/ha-form/ha-form";
import "../../components/demo-black-white-row";

const SCHEMAS: {
  title: string;
  translations?: Record<string, string>;
  error?: Record<string, string>;
  schema: HaFormSchema[];
  data?: Record<string, any>;
}[] = [
  {
    title: "Authentication",
    translations: {
      username: "Username",
      password: "Password",
      invalid_login: "Invalid username or password",
    },
    error: {
      base: "invalid_login",
    },
    schema: [
      {
        type: "string",
        name: "username",
        required: true,
      },
      {
        type: "string",
        name: "password",
        required: true,
      },
    ],
  },

  {
    title: "One of each",
    schema: [
      {
        type: "constant",
        value: "Constant Value",
        name: "constant",
        required: true,
      },
      {
        type: "boolean",
        name: "bool",
        default: false,
      },
      {
        type: "integer",
        name: "int",
        default: 10,
      },
      {
        type: "float",
        name: "float",
        required: true,
      },
      {
        type: "string",
        name: "string",
        default: "Default",
      },
      {
        type: "select",
        options: [
          ["default", "default"],
          ["other", "other"],
        ],
        name: "select",
        default: "default",
      },
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
        },
        name: "multi",
        default: ["default"],
      },
      {
        type: "positive_time_period_dict",
        name: "time",
        required: true,
      },
    ],
  },
  {
    title: "Numbers",
    schema: [
      {
        type: "integer",
        name: "int",
        required: true,
      },
      {
        type: "integer",
        name: "int with default",
        default: 10,
      },
      {
        type: "integer",
        name: "int range required",
        required: true,
        default: 5,
        valueMin: 0,
        valueMax: 10,
      },
      {
        type: "integer",
        name: "int range optional",
        valueMin: 0,
        valueMax: 10,
      },
    ],
  },
  {
    title: "select",
    schema: [
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
        ],
        name: "select",
        required: true,
        default: "default",
      },
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
        ],
        name: "select optional",
      },
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
          ["uno", "mas"],
          ["one", "more"],
          ["and", "another_one"],
          ["option", "1000"],
        ],
        name: "select many otions",
        default: "default",
      },
    ],
  },
  {
    title: "Multi select",
    schema: [
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
        },
        name: "multi",
        required: true,
        default: ["default"],
      },
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
          uno: "mas",
          one: "more",
          and: "another_one",
          option: "1000",
        },
        name: "multi many otions",
        default: ["default"],
      },
    ],
  },
  {
    title: "Field specific error",
    data: {
      new_password: "hello",
      new_password_2: "bye",
    },
    translations: {
      new_password: "New Password",
      new_password_2: "Re-type Password",
      not_match: "The passwords do not match",
    },
    error: {
      new_password_2: "not_match",
    },
    schema: [
      {
        type: "string",
        name: "new_password",
        required: true,
      },
      {
        type: "string",
        name: "new_password_2",
        required: true,
      },
    ],
  },
  {
    title: "OctoPrint",
    translations: {
      username: "Username",
      host: "Host",
      port: "Port Number",
      path: "Application Path",
      ssl: "Use SSL",
    },
    schema: [
      { type: "string", name: "username", required: true, default: "" },
      { type: "string", name: "host", required: true, default: "" },
      {
        type: "integer",
        valueMin: 1,
        valueMax: 65535,
        name: "port",
        default: 80,
      },
      { type: "string", name: "path", default: "/" },
      { type: "boolean", name: "ssl", default: false },
    ],
  },
];

@customElement("demo-components-ha-form")
class DemoHaForm extends LitElement {
  private data = SCHEMAS.map(
    ({ schema, data }) => data || computeInitialHaFormData(schema)
  );

  private disabled = SCHEMAS.map(() => false);

  protected render(): TemplateResult {
    return html`
      ${SCHEMAS.map((info, idx) => {
        const translations = info.translations || {};
        return html`
          <demo-black-white-row
            .title=${info.title}
            .value=${this.data[idx]}
            .disabled=${this.disabled[idx]}
            @submitted=${() => {
              this.disabled[idx] = true;
              this.requestUpdate();
              setTimeout(() => {
                this.disabled[idx] = false;
                this.requestUpdate();
              }, 2000);
            }}
          >
            ${["light", "dark"].map(
              (slot) => html`
                <ha-form
                  slot=${slot}
                  .data=${this.data[idx]}
                  .schema=${info.schema}
                  .error=${info.error}
                  .disabled=${this.disabled[idx]}
                  .computeError=${(error) => translations[error] || error}
                  .computeLabel=${(schema) =>
                    translations[schema.name] || schema.name}
                  @value-changed=${(e) => {
                    this.data[idx] = e.detail.value;
                    this.requestUpdate();
                  }}
                ></ha-form>
              `
            )}
          </demo-black-white-row>
        `;
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-form": DemoHaForm;
  }
}
