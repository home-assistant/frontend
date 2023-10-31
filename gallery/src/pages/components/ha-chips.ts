import { css, html, LitElement, TemplateResult, nothing } from "lit";
import { customElement } from "lit/decorators";
import "../../../../src/components/ha-card";
import "../../../../src/components/chips/ha-chip-set";
import "../../../../src/components/chips/ha-assist-chip";
import "../../../../src/components/chips/ha-input-chip";
import "../../../../src/components/chips/ha-filter-chip";
import "../../../../src/components/ha-svg-icon";
import { mdiHomeAssistant } from "../../../../src/resources/home-assistant-logo-svg";

const chips: {
  icon?: string;
  content?: string;
}[] = [
  {
    content: "Content",
  },
  {
    icon: mdiHomeAssistant,
    content: "Content",
  },
];

@customElement("demo-components-ha-chips")
export class DemoHaChips extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-chip demo">
        <div class="card-content">
          <p>Action chip</p>
          <ha-chip-set>
            ${chips.map(
              (chip) => html`
                <ha-assist-chip .label=${chip.content}>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : nothing}
                </ha-assist-chip>
              `
            )}
            ${chips.map(
              (chip) => html`
                <ha-assist-chip .label=${chip.content} selected>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : nothing}
                </ha-assist-chip>
              `
            )}
          </ha-chip-set>
          <p>Filter chip</p>
          <ha-chip-set>
            ${chips.map(
              (chip) => html`
                <ha-filter-chip .label=${chip.content}>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : nothing}
                </ha-filter-chip>
              `
            )}
            ${chips.map(
              (chip) => html`
                <ha-filter-chip .label=${chip.content} selected>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : nothing}
                </ha-filter-chip>
              `
            )}
          </ha-chip-set>
          <p>Input chip</p>
          <ha-chip-set>
            ${chips.map(
              (chip) => html`
                <ha-input-chip .label=${chip.content}>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : ""}
                  ${chip.content}
                </ha-input-chip>
              `
            )}
            ${chips.map(
              (chip) => html`
                <ha-input-chip .label=${chip.content} selected>
                  ${chip.icon
                    ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                      </ha-svg-icon>`
                    : nothing}
                </ha-input-chip>
              `
            )}
          </ha-chip-set>
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
      ha-chip {
        margin-bottom: 4px;
      }
      .card-content {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-components-ha-chips": DemoHaChips;
  }
}
