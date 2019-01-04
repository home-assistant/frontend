import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-card/paper-card";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-service-description";
import "../ha-config-section";

import { HomeAssistant } from "../../../types";
import "../../../resources/ha-style";

export class ZHANetwork extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  public showDescription: boolean;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;

  constructor() {
    super();
    this.showDescription = false;
  }

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
      showDescription: {},
    };
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <ha-config-section .is-wide="${this.isWide}">
        <div style="position: relative" slot="header">
            <span>Zigbee Home Automation network management</span>
            <paper-icon-button class="toggle-help-icon" @click="${
              this._onHelpTap
            }" icon="hass:help-circle"></paper-icon-button>
        </div>
        <span slot="introduction">Commands that affect entire network</span>

        <paper-card class="content">
            <div class="card-actions">
            <ha-call-service-button .hass="${
              this.hass
            }" domain="zha" service="permit">Permit</ha-call-service-button>
            ${
              this.showDescription
                ? html`
                    <ha-service-description
                      .hass="${this.hass}"
                      domain="zha"
                      service="permit"
                    />
                  `
                : ""
            }
        </paper-card>
      </ha-config-section>
    `;
  }

  private _onHelpTap() {
    this.showDescription = !this.showDescription;
  }

  private renderStyle(): TemplateResult {
    if (!this._haStyle) {
      this._haStyle = document.importNode(
        (document.getElementById("ha-style")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    if (!this._ironFlex) {
      this._ironFlex = document.importNode(
        (document.getElementById("iron-flex")!
          .children[0] as HTMLTemplateElement).content,
        true
      );
    }
    return html`
      ${this._ironFlex} ${this._haStyle}
      <style>
        .content {
          margin-top: 24px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        .card-actions.warning ha-call-service-button {
          color: var(--google-red-500);
        }

        .toggle-help-icon {
          position: absolute;
          top: -6px;
          right: 0;
          color: var(--primary-color);
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zha-network": ZHANetwork;
  }
}

customElements.define("zha-network", ZHANetwork);
