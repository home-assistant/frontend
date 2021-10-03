/* eslint-disable lit/no-template-arrow */
import "@material/mwc-button";
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement } from "lit/decorators";
import { computeInitialHaFormData } from "../../../src/components/ha-form/compute-initial-ha-form-data";
import "../../../src/components/ha-card";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import type { HaFormSchema } from "../../../src/components/ha-form/types";
import "../../../src/components/ha-form/ha-form";

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
      invalid_login: "Invalid login",
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
        optional: true,
        default: false,
      },
      {
        type: "integer",
        name: "int",
        optional: true,
        default: 10,
      },
      {
        type: "string",
        name: "string",
        optional: true,
        default: "Default",
      },
      {
        type: "select",
        options: [
          ["default", "default"],
          ["other", "other"],
        ],
        name: "select",
        optional: true,
        default: "default",
      },
      {
        type: "multi_select",
        options: {
          default: "Default",
          other: "Other",
        },
        name: "multi",
        optional: true,
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
        optional: true,
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
        optional: true,
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
        default: ["default"],
      },
      {
        type: "select",
        options: [
          ["default", "Default"],
          ["other", "Other"],
        ],
        name: "select optional",
        optional: true,
        default: ["default"],
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
        optional: true,
        default: ["default"],
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
        optional: true,
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
];

@customElement("demo-ha-form")
class DemoHaForm extends LitElement {
  private data = SCHEMAS.map(
    ({ schema, data }) => data || computeInitialHaFormData(schema)
  );

  protected render(): TemplateResult {
    return html`
      ${SCHEMAS.map((info, idx) => {
        const translations = info.translations || {};
        const computeLabel = (schema) =>
          translations[schema.name] || schema.name;
        const computeError = (error) => translations[error] || error;

        return html`
          <div class="row">
            <div class="content light">
              <ha-card .header=${info.title}>
                <div class="card-content">
                  <ha-form
                    .data=${this.data[idx]}
                    .schema=${info.schema}
                    .error=${info.error}
                    .computeError=${computeError}
                    .computeLabel=${computeLabel}
                    @value-changed=${(e) => {
                      this.data[idx] = e.detail.value;
                      this.requestUpdate();
                    }}
                  ></ha-form>
                </div>
                <div class="card-actions">
                  <mwc-button>Submit</mwc-button>
                </div>
              </ha-card>
            </div>
            <div class="content dark">
              <ha-card .header=${info.title}>
                <div class="card-content">
                  <ha-form
                    .data=${this.data[idx]}
                    .schema=${info.schema}
                    .error=${info.error}
                    .computeError=${computeError}
                    .computeLabel=${computeLabel}
                    @value-changed=${(e) => {
                      this.data[idx] = e.detail.value;
                      this.requestUpdate();
                    }}
                  ></ha-form>
                </div>
                <div class="card-actions">
                  <mwc-button>Submit</mwc-button>
                </div>
              </ha-card>
              <pre>${JSON.stringify(this.data[idx], undefined, 2)}</pre>
            </div>
          </div>
        `;
      })}
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.shadowRoot!.querySelectorAll(".dark").forEach((el) => {
      applyThemesOnElement(
        el,
        {
          default_theme: "default",
          default_dark_theme: "default",
          themes: {},
          darkMode: false,
        },
        "default",
        { dark: true }
      );
    });
  }

  static styles = css`
    .row {
      display: flex;
    }
    .content {
      padding: 50px 0;
      background-color: var(--primary-background-color);
    }
    .light {
      flex: 1;
      padding-left: 50px;
      padding-right: 50px;
      box-sizing: border-box;
    }
    .light ha-card {
      margin-left: auto;
    }
    .dark {
      display: flex;
      flex: 1;
      padding-left: 50px;
      box-sizing: border-box;
      flex-wrap: wrap;
    }
    ha-card {
      width: 400px;
    }
    pre {
      width: 300px;
      margin: 0 16px 0;
      overflow: auto;
      color: var(--primary-text-color);
    }
    .card-actions {
      display: flex;
      flex-direction: row-reverse;
      border-top: none;
    }
    @media only screen and (max-width: 1500px) {
      .light {
        flex: initial;
      }
    }
    @media only screen and (max-width: 1000px) {
      .light,
      .dark {
        padding: 16px;
      }
      .row,
      .dark {
        flex-direction: column;
      }
      ha-card {
        margin: 0 auto;
        width: 100%;
        max-width: 400px;
      }
      pre {
        margin: 16px auto;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-form": DemoHaForm;
  }
}
