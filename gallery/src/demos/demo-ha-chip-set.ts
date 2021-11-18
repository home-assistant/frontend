import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";
import "../../../src/components/ha-chip-set";

const chips: string[] = ["Chip 1", "Chip 2", "Chip 3", "Chip 4"];

@customElement("demo-ha-chip-set")
export class DemoHaChipSet extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="ha-chip-set demo">
        <div class="card-content">
          <ha-chip-set .items=${chips}></ha-chip-set>
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-chip-set": DemoHaChipSet;
  }
}
