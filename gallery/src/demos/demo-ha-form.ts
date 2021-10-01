/* eslint-disable lit/no-template-arrow */
import { LitElement, TemplateResult, css, html } from "lit";
import { customElement } from "lit/decorators";
import { computeInitialData } from "../../../src/components/ha-form/ha-form";
import "../../../src/components/ha-card";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import type { HaFormSchema } from "../../../src/components/ha-form/ha-form";

const SCHEMAS: {
  title: string;
  translations?: Record<string, string>;
  error?: Record<string, string>;
  schema: HaFormSchema[];
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
        name: "int range",
        required: true,
        valueMin: 0,
        valueMax: 10,
      },
      {
        type: "integer",
        name: "int range default",
        optional: true,
        default: 5,
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
        },
        name: "multi optional",
        optional: true,
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
];

@customElement("demo-ha-form")
class DemoHaForm extends LitElement {
  private lightModeData = SCHEMAS.map(({ schema }) =>
    computeInitialData(schema)
  );

  private darkModeData = SCHEMAS.map(({ schema }) =>
    computeInitialData(schema)
  );

  protected render(): TemplateResult {
    return html`
      ${SCHEMAS.map((info, idx) => {
        const translations = info.translations || {};
        const computeLabel = (schema) =>
          translations[schema.name] || schema.name;
        const computeError = (error) => translations[error] || error;

        return [
          [this.lightModeData, "light"],
          [this.darkModeData, "dark"],
        ].map(
          ([data, type]) => html`
            <div class="row" data-type=${type}>
              <ha-card .header=${info.title}>
                <div class="card-content">
                  <ha-form
                    .data=${data[idx]}
                    .schema=${info.schema}
                    .error=${info.error}
                    .computeError=${computeError}
                    .computeLabel=${computeLabel}
                    @value-changed=${(e) => {
                      // @ts-ignore
                      data[idx] = e.detail.value;
                      this.requestUpdate();
                    }}
                  ></ha-form>
                </div>
              </ha-card>
              <pre>${JSON.stringify(data[idx], undefined, 2)}</pre>
            </div>
          `
        );
      })}
    `;
  }

  firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    this.shadowRoot!.querySelectorAll("[data-type=dark]").forEach((el) => {
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
      margin: 0 auto;
      max-width: 800px;
      display: flex;
      padding: 50px;
      background-color: var(--primary-background-color);
    }
    ha-card {
      width: 100%;
      max-width: 384px;
    }
    pre {
      width: 400px;
      margin: 0 16px;
      overflow: auto;
      color: var(--primary-text-color);
    }
    @media only screen and (max-width: 800px) {
      .row {
        flex-direction: column;
      }
      pre {
        margin: 16px 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-form": DemoHaForm;
  }
}
