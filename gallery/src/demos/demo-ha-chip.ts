import "../../../src/components/ha-switch";
import "../../../src/components/ha-formfield";
import { mdiClose, mdiHomeAssistant } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
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
  @state() standaloneIsDisabled = false;

  @state() standaloneIsOutlined = false;

  protected render(): TemplateResult {
    return html`
      <div class="filters">
        <ha-formfield label="Disable standalone chips">
          <ha-switch @change=${this._toggleDisable}></ha-switch>
        </ha-formfield>
        <ha-formfield label="Outline standalone chips">
          <ha-switch @change=${this._toggleOutline}></ha-switch>
        </ha-formfield>
      </div>
      <ha-card header="Standalone ha-chip demo">
        <div class="card-content">
          <div class="standalone">
            <span>Simple:</span>
            <ha-chip
              .outline=${this.standaloneIsOutlined}
              ?disabled=${this.standaloneIsDisabled}
              >Demo chip</ha-chip
            >
          </div>

          <div class="standalone">
            <span>Label property:</span>
            <ha-chip
              .outline=${this.standaloneIsOutlined}
              ?disabled=${this.standaloneIsDisabled}
              label="Demo chip"
            ></ha-chip>
          </div>

          <div class="standalone">
            <span>With leadingIcon:</span>
            <ha-chip
              .leadingIcon=${mdiHomeAssistant}
              .outline=${this.standaloneIsOutlined}
              ?disabled=${this.standaloneIsDisabled}
              >Demo chip</ha-chip
            >
          </div>

          <div class="standalone">
            <span>With trailingIcon property:</span>
            <ha-chip
              .trailingIcon=${mdiHomeAssistant}
              .outline=${this.standaloneIsOutlined}
              ?disabled=${this.standaloneIsDisabled}
              >Demo chip</ha-chip
            >
          </div>

          <div class="standalone">
            <span>With trailingIcon slot:</span>
            <ha-chip
              .outline=${this.standaloneIsOutlined}
              ?disabled=${this.standaloneIsDisabled}
            >
              Demo chip
              <ha-svg-icon
                slot="trailing-icon"
                class="trailing"
                .path=${mdiHomeAssistant}
              ></ha-svg-icon>
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

  private _toggleDisable() {
    this.standaloneIsDisabled = !this.standaloneIsDisabled;
  }

  private _toggleOutline() {
    this.standaloneIsOutlined = !this.standaloneIsOutlined;
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
      .filters {
        margin: 16px;
      }
      ha-formfield {
        margin: 12px 0;
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-ha-chip": DemoHaChip;
  }
}
