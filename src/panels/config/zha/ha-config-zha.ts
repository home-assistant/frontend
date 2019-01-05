import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { HomeAssistant } from "../../../types";

import "../../../layouts/ha-app-layout";
import "../../../resources/ha-style";

import "./zha-network";
import "./zha-node";

export class HaConfigZha extends LitElement {
  public hass?: HomeAssistant;
  public isWide?: boolean;
  private _haStyle?: DocumentFragment;
  private _ironFlex?: DocumentFragment;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      isWide: {},
    };
  }

  protected render(): TemplateResult {
    return html`
      ${this.renderStyle()}
      <ha-app-layout has-scrolling-region="">
        <app-header slot="header" fixed="">
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              @click="${this._onBackTapped}"
            ></paper-icon-button>
            <div main-title="">Zigbee Home Automation</div>
          </app-toolbar>
        </app-header>

        <zha-network
          id="zha-network"
          .isWide="${this.isWide}"
          .hass="${this.hass}"
        ></zha-network>

        <zha-node
          id="zha-network"
          .isWide="${this.isWide}"
          .hass="${this.hass}"
        ></zha-node>
      </ha-app-layout>
    `;
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
    `;
  }

  private _onBackTapped(): void {
    history.back();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-zha": HaConfigZha;
  }
}

customElements.define("ha-config-zha", HaConfigZha);
