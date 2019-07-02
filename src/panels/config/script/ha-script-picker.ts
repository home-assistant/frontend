import {
  LitElement,
  html,
  CSSResultArray,
  css,
  TemplateResult,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-fab/paper-fab";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import { HassEntity } from "home-assistant-js-websocket";

import "../../../layouts/hass-subpage";

import { computeRTL } from "../../../common/util/compute_rtl";

import "../../../components/ha-card";

import "../ha-config-section";

import computeStateName from "../../../common/entity/compute_state_name";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { triggerScript } from "../../../data/script";
import { showToast } from "../../../util/toast";

@customElement("ha-script-picker")
class HaScriptPicker extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public scripts!: HassEntity[];
  @property() public isWide!: boolean;

  protected render(): TemplateResult | void {
    return html`
      <hass-subpage
        .header=${this.hass.localize("ui.panel.config.script.caption")}
      >
        <ha-config-section .isWide=${this.isWide}>
          <div slot="header">Script Editor</div>
          <div slot="introduction">
            The script editor allows you to create and edit scripts. Please read
            <a
              href="https://home-assistant.io/docs/scripts/editor/"
              target="_blank"
              >the instructions</a
            >
            to make sure that you have configured Home Assistant correctly.
          </div>

          <ha-card header="Pick script to edit">
            ${this.scripts.length === 0
              ? html`
                  <div class="card-content">
                    <p>We couldn't find any scripts.</p>
                  </div>
                `
              : this.scripts.map(
                  (script) => html`
                    <div class="script">
                      <paper-icon-button
                        .script=${script}
                        icon="hass:play"
                        @click=${this._runScript}
                      ></paper-icon-button>
                      <paper-item-body>
                        <div>${computeStateName(script)}</div>
                      </paper-item-body>
                      <div class="actions">
                        <a href=${`/config/script/edit/${script.entity_id}`}>
                          <paper-icon-button
                            icon="hass:pencil"
                          ></paper-icon-button>
                        </a>
                      </div>
                    </div>
                  `
                )}
          </ha-card>
        </ha-config-section>

        <a href="/config/script/new">
          <paper-fab
            slot="fab"
            ?is-wide=${this.isWide}
            icon="hass:plus"
            title="Add Script"
            ?rtl=${computeRTL(this.hass)}
          ></paper-fab>
        </a>
      </hass-subpage>
    `;
  }

  private async _runScript(ev) {
    const script = ev.currentTarget.script as HassEntity;
    await triggerScript(this.hass, script.entity_id);
    showToast(this, {
      message: `Triggered ${computeStateName(script)}`,
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        ha-card {
          padding-bottom: 8px;
          margin-bottom: 56px;
        }

        .script {
          display: flex;
          flex-direction: horizontal;
          align-items: center;
          padding: 0 8px;
          margin: 4px 0;
        }

        .script > *:first-child {
          margin-right: 8px;
        }

        .script a[href],
        paper-icon-button {
          color: var(--primary-text-color);
        }

        .actions {
          display: flex;
        }

        paper-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        paper-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }

        paper-fab[rtl] {
          right: auto;
          left: 16px;
        }

        paper-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        a {
          color: var(--primary-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-picker": HaScriptPicker;
  }
}
