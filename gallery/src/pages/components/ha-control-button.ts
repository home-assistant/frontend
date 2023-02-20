import {
  mdiFanSpeed1,
  mdiFanSpeed2,
  mdiFanSpeed3,
  mdiLightbulb,
} from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-control-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-control-button-group";

type Button = {
  label: string;
  icon?: string;
  class?: string;
  disabled?: boolean;
};

const buttons: Button[] = [
  {
    label: "Button",
  },
  {
    label: "Button and custom style",
    class: "custom",
  },
  {
    label: "Disabled Button",
    disabled: true,
  },
];

type ButtonGroup = {
  vertical?: boolean;
  class?: string;
};

const buttonGroups: ButtonGroup[] = [
  {},
  {
    class: "custom-group",
  },
];

@customElement("demo-components-ha-control-button")
export class DemoHaBarButton extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card>
        ${repeat(
          buttons,
          (btn) => html`
            <div class="card-content">
              <pre>Config: ${JSON.stringify(btn)}</pre>
              <ha-control-button
                class=${ifDefined(btn.class)}
                label=${ifDefined(btn.label)}
                disabled=${ifDefined(btn.disabled)}
              >
                <ha-svg-icon .path=${btn.icon || mdiLightbulb}></ha-svg-icon>
              </ha-control-button>
            </div>
          `
        )}
      </ha-card>

      <ha-card>
        ${repeat(
          buttonGroups,
          (group) => html`
            <div class="card-content">
              <pre>Config: ${JSON.stringify(group)}</pre>
              <ha-control-button-group class=${ifDefined(group.class)}>
                <ha-control-button>
                  <ha-svg-icon
                    .path=${mdiFanSpeed1}
                    label="Speed 1"
                  ></ha-svg-icon>
                </ha-control-button>
                <ha-control-button>
                  <ha-svg-icon
                    .path=${mdiFanSpeed2}
                    label="Speed 2"
                  ></ha-svg-icon>
                </ha-control-button>
                <ha-control-button>
                  <ha-svg-icon
                    .path=${mdiFanSpeed3}
                    label="Speed 3"
                  ></ha-svg-icon>
                </ha-control-button>
              </ha-control-button-group>
            </div>
          `
        )}
      </ha-card>
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Vertical</b></p>
          <div class="vertical-buttons">
            ${repeat(
              buttonGroups,
              (group) => html`
                <ha-control-button-group
                  vertical
                  class=${ifDefined(group.class)}
                >
                  <ha-control-button>
                    <ha-svg-icon
                      .path=${mdiFanSpeed1}
                      label="Speed 1"
                    ></ha-svg-icon>
                  </ha-control-button>
                  <ha-control-button>
                    <ha-svg-icon
                      .path=${mdiFanSpeed2}
                      label="Speed 2"
                    ></ha-svg-icon>
                  </ha-control-button>
                  <ha-control-button>
                    <ha-svg-icon
                      .path=${mdiFanSpeed3}
                      label="Speed 3"
                    ></ha-svg-icon>
                  </ha-control-button>
                </ha-control-button-group>
              `
            )}
          </div>
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
      .custom-group {
        --control-button-group-thickness: 100px;
        --control-button-group-border-radius: 18px;
        --control-button-group-spacing: 20px;
      }
      .custom-group ha-control-button {
        --control-button-border-radius: 18px;
        --mdc-icon-size: 32px;
      }
      .vertical-buttons {
        height: 300px;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }
      p.title {
        margin-bottom: 12px;
      }
      .vertical-switches > *:not(:last-child) {
        margin-right: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-button": DemoHaBarButton;
  }
}
