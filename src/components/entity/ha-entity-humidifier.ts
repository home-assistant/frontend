import { css, CSSResult, html, TemplateResult } from "lit-element";
import { HaEntityToggle } from "./ha-entity-toggle";

class HaEntityHumidifier extends HaEntityToggle {
  protected render(): TemplateResult {
    if (!this.stateObj) {
      return super.render();
    }

    return html`
      <div class="target">
        ${this.stateObj.attributes.mode
          ? html`<span class="state-label">
              ${this.hass!.localize(
                `state_attributes.humidifier.mode.${this.stateObj.attributes.mode}`
              ) || this.stateObj.attributes.mode}
            </span>`
          : ""}
        <div class="unit">
          ${this.stateObj.attributes.humidity
            ? html`${this.stateObj.attributes.humidity} %`
            : ""}
        </div>
      </div>

      ${super.render()}
    `;
  }

  static get styles(): CSSResult[] {
    return [
      super.styles,
      css`
        :host {
          display: flex;
          flex-direction: row;
          justify-content: center;
          align-items: center;
        }

        .target {
          color: var(--primary-text-color);
        }

        .current {
          color: var(--secondary-text-color);
        }

        .state-label {
          font-weight: bold;
          text-transform: capitalize;
        }

        .unit {
          display: inline-block;
          direction: ltr;
        }
      `,
    ];
  }
}

customElements.define("ha-entity-humidifier", HaEntityHumidifier);
