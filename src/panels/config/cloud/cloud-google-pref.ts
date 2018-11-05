import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-toggle-button/paper-toggle-button";
// tslint:disable-next-line
import { PaperToggleButtonElement } from "@polymer/paper-toggle-button/paper-toggle-button";
import "../../../components/buttons/ha-call-api-button";

import { fireEvent } from "../../../common/dom/fire_event";
import { HomeAssistant } from "../../../types";
import { updatePref } from "./data";
import { CloudStatusLoggedIn } from "./types";

export class CloudGooglePref extends LitElement {
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
      <paper-card heading="Google Assistant">
        <paper-toggle-button
          .checked="${this.cloudStatus!.google_enabled}"
          @change="${this._toggleChanged}"
        ></paper-toggle-button>
        <div class="card-content">
          With the Google Assistant integration for Home Assistant Cloud you'll be able to control all your Home Assistant devices via any Google Assistant-enabled device.
          <ul>
            <li>
              <a href="https://assistant.google.com/services/a/uid/00000091fd5fb875" target="_blank">
                Activate the Home Assistant skill for Google Assistant
              </a>
            </li>
            <li>
              <a href="https://www.home-assistant.io/cloud/google_assistant/" target="_blank">
                Config documentation
              </a>
            </li>
          </ul>
          <em>This integration requires a Google Assistant-enabled device like the Google Home or Android phone.</em>
        </div>
        <div class="card-actions">
          <ha-call-api-button
            .hass="${this.hass}"
            .disabled="${!this.cloudStatus!.google_enabled}"
            path="cloud/google_actions/sync"
          >Sync devices</ha-call-api-button>
        </div>
      </paper-card>
    `;
  }

  private async _toggleChanged(ev) {
    const toggle = ev.target as PaperToggleButtonElement;
    try {
      await updatePref(this.hass!, { google_enabled: toggle.checked! });
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
        ha-call-api-button {
          color: var(--primary-color);
          font-weight: 500;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cloud-google-pref": CloudGooglePref;
  }
}

customElements.define("cloud-google-pref", CloudGooglePref);
