import { mdiHomeAssistant } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";
import "../../../src/components/ha-chip";
import "../../../src/components/ha-svg-icon";

const chips: {
  icon?: string;
  content?: string;
}[] = [
  {},
  {
    icon: mdiHomeAssistant,
  },
  {
    content: "Content",
  },
  {
    icon: mdiHomeAssistant,
    content: "Content",
  },
];

@customElement("demo-ha-chip")
export class DemoHaChip extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-chip demo">
        <div class="card-content">
          ${chips.map(
            (chip) => html`
              <ha-chip .hasIcon=${chip.icon !== undefined}>
                ${chip.icon
                  ? html`<ha-svg-icon slot="icon" .path=${chip.icon}>
                    </ha-svg-icon>`
                  : ""}
                ${chip.content}
              </ha-chip>
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
      ha-chip {
        margin-bottom: 4px;
      }
      .card-content {
        display: flex;
        flex-direction: column;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-chip": DemoHaChip;
  }
}
