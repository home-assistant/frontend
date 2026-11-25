import { mdiFan, mdiFanSpeed1, mdiFanSpeed2, mdiFanSpeed3 } from "@mdi/js";
import type { TemplateResult } from "lit";
import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import type { HASSDomCurrentTargetEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-card";
import type { HaDropdownSelectEvent } from "../../../../src/components/ha-dropdown";
import "../../../../src/components/ha-control-select-menu";
import type { SelectOption } from "../../../../src/components/ha-control-select-menu";
import "../../../../src/components/ha-svg-icon";

interface SelectMenu {
  label: string;
  icon: string;
  class?: string;
  disabled?: boolean;
  options: SelectOption[];
}

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
        iconPath: mdiFanSpeed1,
      },
      {
        value: "medium",
        label: "Medium",
        iconPath: mdiFanSpeed2,
      },
      {
        value: "high",
        label: "High",
        iconPath: mdiFanSpeed3,
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
  @state() private _values: Record<string, string> = {};

  protected render(): TemplateResult {
    return html`
      <ha-card>
        ${repeat(
          selects,
          (select) => html`
            <div class="card-content">
              <ha-control-select-menu
                .label=${select.label}
                .value=${this._values[select.label]}
                .options=${select.options}
                ?disabled=${select.disabled}
                data-label=${select.label}
                @wa-select=${this._handleSelect}
              >
                <ha-svg-icon slot="icon" .path=${select.icon}></ha-svg-icon>
              </ha-control-select-menu>
            </div>
          `
        )}
      </ha-card>
    `;
  }

  private _handleSelect(
    ev: HaDropdownSelectEvent & HASSDomCurrentTargetEvent<HTMLElement>
  ) {
    const label = ev.currentTarget.dataset.label;
    const value = ev.detail.item.value;
    if (!label || !value) {
      return;
    }
    this._values = { ...this._values, [label]: value };
  }

  static styles = css`
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
      font-weight: var(--ha-font-weight-bold);
    }
    .custom {
      --control-button-icon-color: var(--primary-color);
      --control-button-background-color: var(--primary-color);
      --control-button-background-opacity: 0.2;
      --control-button-border-radius: var(--ha-border-radius-xl);
      height: 100px;
      width: 100px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-control-select-menu": DemoHaControlSelectMenu;
  }
}
