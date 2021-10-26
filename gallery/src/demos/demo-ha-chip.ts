import { mdiClose, mdiHomeAssistant } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement } from "lit/decorators";
import "../../../src/components/ha-card";
import "../../../src/components/ha-chip";
import "../../../src/components/ha-chip-set";
import type { HaChipSetItem } from "../../../src/components/ha-chip-set";
import "../../../src/components/ha-svg-icon";

const chips: HaChipSetItem[] = [
  {
    leadingIcon: mdiHomeAssistant,
  },
  {
    label: "Demo chip",
  },
  {
    leadingIcon: mdiHomeAssistant,
    label: "Demo chip",
  },
  {},
  {
    trailingIcon: mdiClose,
    label: "Demo chip",
  },
  {
    label: "Automation",
  },
  {
    label: "Blueprint",
  },
  {
    label: "Script",
  },
  {
    label: "Scene",
  },
  {
    label: "Person",
  },
];

@customElement("demo-ha-chip")
export class DemoHaChip extends LitElement {
  protected render(): TemplateResult {
    return html`
      <ha-card header="Standalone ha-chip demo">
        <div class="card-content">
          <div class="standalone">
            <span>Simple:</span>
            <ha-chip>Demo chip</ha-chip>
          </div>
          <div class="standalone">
            <span>Simple (outline):</span>
            <ha-chip outline>Demo chip</ha-chip>
          </div>

          <div class="standalone">
            <span>Label property:</span>
            <ha-chip label="Demo chip"></ha-chip>
          </div>
          <div class="standalone">
            <span>Label property (outline):</span>
            <ha-chip outline label="Demo chip"></ha-chip>
          </div>

          <div class="standalone">
            <span>With leadingIcon:</span>
            <ha-chip .leadingIcon=${mdiHomeAssistant}>Demo chip</ha-chip>
          </div>
          <div class="standalone">
            <span>With leadingIcon (outline):</span>
            <ha-chip .leadingIcon=${mdiHomeAssistant} outline
              >Demo chip</ha-chip
            >
          </div>

          <div class="standalone">
            <span>With trailingIcon property:</span>
            <ha-chip .trailingIcon=${mdiHomeAssistant}>Demo chip</ha-chip>
          </div>
          <div class="standalone">
            <span>With trailingIcon property (outline):</span>
            <ha-chip .trailingIcon=${mdiHomeAssistant} outline
              >Demo chip</ha-chip
            >
          </div>

          <div class="standalone">
            <span>With trailingIcon slot:</span>
            <ha-chip>
              Demo chip
              <ha-svg-icon
                slot="trailing-icon"
                class="trailing"
                .path=${mdiHomeAssistant}
              ></ha-svg-icon>
            </ha-chip>
          </div>
          <div class="standalone">
            <span>With trailingIcon slot (outline):</span>
            <ha-chip outline>
              Demo chip
              <ha-svg-icon
                slot="trailing-icon"
                class="trailing"
                .path=${mdiHomeAssistant}
              ></ha-svg-icon>
            </ha-chip>
          </div>

          <div class="standalone">
            <span>Disabled:</span>
            <ha-chip .trailingIcon=${mdiHomeAssistant} disabled>
              Demo chip
            </ha-chip>
          </div>
          <div class="standalone">
            <span>Disabled (outline):</span>
            <ha-chip .trailingIcon=${mdiHomeAssistant} disabled outline>
              Demo chip
            </ha-chip>
          </div>
        </div>
      </ha-card>

      <ha-card header="ha-chip-set demo">
        <div class="card-content">
          <ha-chip-set .items=${chips}> </ha-chip-set>
          <ha-chip-set
            .items=${chips.map((chip) => ({ ...chip, outline: true }))}
          >
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
      .standalone {
        margin: 4px 0;
        display: flex;
        justify-content: space-between;
      }
      .trailings {
        width: 16px;
        height: 16px;
        padding: 4px 2px 4px 4px;
        margin-right: -8px;
        --mdc-icon-size: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-chip": DemoHaChip;
  }
}
