import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import {
  LitElement,
  property,
  TemplateResult,
  html,
  customElement,
  CSSResult,
} from "lit-element";
import { haStyle } from "../resources/ha-style";

@customElement("hass-subpage")
class HassSubpage extends LitElement {
  @property()
  public header?: string;

  protected render(): TemplateResult | void {
    return html`
      <app-header-layout has-scrolling-region>
        <app-header slot="header" fixed>
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              @click=${this._backTapped}
            ></paper-icon-button>
            <div main-title>${this.header}</div>
            <slot name="toolbar-icon"></slot>
          </app-toolbar>
        </app-header>

        <slot></slot>
      </app-header-layout>
    `;
  }

  private _backTapped(): void {
    history.back();
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hass-subpage": HassSubpage;
  }
}
