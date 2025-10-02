import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators";
import { repeat } from "lit/directives/repeat";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-select-box";
import type { SelectBoxOption } from "../../../../src/components/ha-select-box";

const basicOptions: SelectBoxOption[] = [
  {
    value: "text-only",
    label: "Text only",
  },
  {
    value: "card",
    label: "Card",
  },
  {
    value: "disabled",
    label: "Disabled option",
    disabled: true,
  },
];

const fullOptions: SelectBoxOption[] = [
  {
    value: "text-only",
    label: "Text only",
    description: "Only text, no border and background",
    image: "/images/select_box/text_only.svg",
  },
  {
    value: "card",
    label: "Card",
    description: "With border and background",
    image: "/images/select_box/card.svg",
  },
  {
    value: "disabled",
    label: "Disabled",
    description: "Option that can not be selected",
    disabled: true,
  },
];

const selects: {
  id: string;
  label: string;
  class?: string;
  options: SelectBoxOption[];
  disabled?: boolean;
}[] = [
  {
    id: "basic",
    label: "Basic",
    options: basicOptions,
  },
  {
    id: "full",
    label: "With description and image",
    options: fullOptions,
  },
];

@customElement("demo-components-ha-select-box")
export class DemoHaSelectBox extends LitElement {
  @state() private value?: string = "off";

  handleValueChanged(e: CustomEvent) {
    this.value = e.detail.value as string;
  }

  protected render(): TemplateResult {
    return html`
      ${repeat(selects, (select) => {
        const { id, label, options } = select;
        return html`
          <ha-card>
            <div class="card-content">
              <label id=${id}>${label}</label>
              <ha-select-box
                .value=${this.value}
                .options=${options}
                @value-changed=${this.handleValueChanged}
              >
              </ha-select-box>
            </div>
          </ha-card>
        `;
      })}
      <ha-card>
        <div class="card-content">
          <p class="title"><b>Column layout</b></p>
          <div class="vertical-selects">
            ${repeat(selects, (select) => {
              const { options } = select;
              return html`
                <ha-select-box
                  .value=${this.value}
                  .options=${options}
                  .maxColumns=${1}
                  @value-changed=${this.handleValueChanged}
                >
                </ha-select-box>
              `;
            })}
          </div>
        </div>
      </ha-card>
    `;
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
      margin-bottom: 8px;
      display: block;
    }
    .custom {
      --mdc-icon-size: 24px;
      --control-select-color: var(--state-fan-active-color);
      --control-select-thickness: 130px;
      --control-select-border-radius: 36px;
    }

    p.title {
      margin-bottom: 12px;
    }

    .vertical-selects ha-select-box {
      display: block;
      margin-bottom: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-select-box": DemoHaSelectBox;
  }
}
