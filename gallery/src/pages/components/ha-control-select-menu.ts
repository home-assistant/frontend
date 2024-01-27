import { mdiFan, mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3 } from "@mdi/js";
import { LitElement, TemplateResult, css, html, nothing } from "lit";
import { customElement } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-control-select-menu";
import "../../../../src/components/ha-list-item";
import "../../../../src/components/ha-svg-icon";

type SelectMenuOptions = {
  label: string;
  value: string;
  icon?: string;
};

type SelectMenu = {
  label: string;
  icon: string;
  class?: string;
  disabled?: boolean;
  options: SelectMenuOptions[];
};

const selects: SelectMenu[] = [
  {
    label: "Basic select",
    icon: mdiFan,
    options: [
      {
        value: "low",
        label: "Low",
      },
      {
        value: "medium",
        label: "Medium",
      },
      {
        value: "high",
        label: "High",
      },
    ],
  },
  {
    label: "Select with icons",
    icon: mdiFan,
    options: [
      {
        value: "low",
        label: "Low",
        icon: mdiFanSpeed1,
      },
      {
        value: "medium",
        label: "Medium",
        icon: mdiFanSpeed2,
      },
      {
        value: "high",
        label: "High",
        icon: mdiFanSpeed3,
      },
    ],
  },
  {
    label: "Disabled select",
    icon: mdiFan,
    options: [],
    disabled: true,
  },
];

@customElement("demo-components-ha-control-select-menu")
export class DemoHaControlSelectMenu extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        ${repeat(
          selects,
          (select) => html`
            <div class="card-content">
              <ha-control-select-menu
                .label=${select.label}
                ?disabled=${select.disabled}
                fixedMenuPosition
                naturalMenuWidth
              >
                <ha-svg-icon slot="icon" .path=${select.icon}></ha-svg-icon>
                ${select.options.map(
                  (option) => html`
                    <ha-list-item
                      .value=${option.value}
                      .graphic=${option.icon ? "icon" : undefined}
                    >
                      ${option.icon
                        ? html`
                            <ha-svg-icon
                              slot="graphic"
                              .path=${option.icon}
                            ></ha-svg-icon>
                          `
                        : nothing}
                      ${option.label ?? option.value}
                    </ha-list-item>
                  `
                )}
              </ha-control-select-menu>
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
      pre {
        margin-top: 0;
        margin-bottom: 8px;
      }
      p {
        margin: 0;
      }
      label {
        font-weight: 600;
      }
      .custom {
        --control-button-icon-color: var(--primary-color);
        --control-button-background-color: var(--primary-color);
        --control-button-background-opacity: 0.2;
        --control-button-border-radius: 18px;
        height: 100px;
        width: 100px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-select-menu": DemoHaControlSelectMenu;
  }
}
