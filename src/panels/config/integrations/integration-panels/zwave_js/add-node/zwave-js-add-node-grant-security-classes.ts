import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import type { HomeAssistant } from "../../../../../../types";
import { SecurityClass } from "../../../../../../data/zwave_js";
import type { HaCheckbox } from "../../../../../../components/ha-checkbox";
import { fireEvent } from "../../../../../../common/dom/fire_event";

import "../../../../../../components/ha-alert";
import "../../../../../../components/ha-formfield";
import "../../../../../../components/ha-checkbox";

@customElement("zwave-js-add-node-grant-security-classes")
export class ZWaveJsAddNodeGrantSecurityClasses extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public error?: string;

  @property({ attribute: false }) public securityClassOptions!: SecurityClass[];

  @property({ attribute: false })
  public selectedSecurityClasses: SecurityClass[] = [];

  render() {
    return html`
      ${this.error
        ? html`<ha-alert alert-type="error"> ${this.error} </ha-alert>`
        : nothing}
      <p>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.add_node.grant_security_classes.description"
        )}
      </p>
      <div class="flex-column">
        ${this.securityClassOptions
          .sort((a, b) => {
            // Put highest security classes at the top, S0 at the bottom
            if (a === SecurityClass.S0_Legacy) return 1;
            if (b === SecurityClass.S0_Legacy) return -1;
            return b - a;
          })
          .map(
            (securityClass) =>
              html`<ha-formfield
                .label=${html`<b
                    >${this.hass.localize(
                      `ui.panel.config.zwave_js.security_classes.${SecurityClass[securityClass]}.title`
                    )}</b
                  >
                  <div class="secondary">
                    ${this.hass.localize(
                      `ui.panel.config.zwave_js.security_classes.${SecurityClass[securityClass]}.description`
                    )}
                  </div>`}
              >
                <ha-checkbox
                  @change=${this._handleSecurityClassChange}
                  .value=${securityClass.toString()}
                  .checked=${this.selectedSecurityClasses.includes(
                    securityClass
                  )}
                >
                </ha-checkbox>
              </ha-formfield>`
          )}
      </div>
    `;
  }

  private _handleSecurityClassChange(ev: CustomEvent) {
    const checkbox = ev.currentTarget as HaCheckbox;
    const securityClass = Number(checkbox.value);
    if (
      checkbox.checked &&
      !this.selectedSecurityClasses.includes(securityClass)
    ) {
      fireEvent(this, "value-changed", {
        value: [...this.selectedSecurityClasses, securityClass],
      });
    } else if (!checkbox.checked) {
      fireEvent(this, "value-changed", {
        value: this.selectedSecurityClasses.filter(
          (val) => val !== securityClass
        ),
      });
    }
  }

  static styles = css`
    ha-alert {
      display: block;
      margin-bottom: 16px;
    }
    .flex-column {
      display: flex;
      flex-direction: column;
    }
    .secondary {
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-js-add-node-grant-security-classes": ZWaveJsAddNodeGrantSecurityClasses;
  }
}
