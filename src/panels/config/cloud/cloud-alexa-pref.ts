import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-toggle-button/paper-toggle-button";
// tslint:disable-next-line
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";

import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import { updatePref } from "./data";
import { CloudStatusLoggedIn } from "./types";

export class CloudAlexaPref extends LitElement {
  public hass?: HomeAssistant;
  public cloudStatus?: CloudStatusLoggedIn;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      cloudStatus: {},
    };
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <paper-card heading="Alexa">
        <paper-toggle-button
          .checked="${this.cloudStatus!.alexa_enabled}"
          @change="${this._toggleChanged}"
        ></paper-toggle-button>
        <div class="card-content">
          With the Alexa integration for Home Assistant Cloud you'll be able to control all your Home Assistant devices via any Alexa-enabled device.
          <ul>
            <li>
              To activate, search in the Alexa app for the Home Assistant Smart Home skill.
            </li>
            <li>
              <a href="https://www.home-assistant.io/cloud/alexa/" target="_blank">
                Config documentation
              </a>
            </li>
          </ul>
          <em>This integration requires an Alexa-enabled device like the Amazon Echo.</em>
        </div>
      </paper-card>
    `;
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;
    try {
      await updatePref(this.hass!, { alexa_enabled: toggle.checked! });
      fireEvent(this, "ha-refresh-cloud-status");
    } catch (err) {
      toggle.checked = !toggle.checked;
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        a {
          color: var(--primary-color);
        }
        paper-card > paper-toggle-button {
          position: absolute;
          right: 8px;
          top: 16px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-alexa-pref": CloudAlexaPref;
  }
}

customElements.define("cloud-alexa-pref", CloudAlexaPref);
