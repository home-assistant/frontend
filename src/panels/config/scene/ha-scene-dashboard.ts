import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  property,
  customElement,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-tooltip/paper-tooltip";
import "../../../layouts/hass-tabs-subpage";

import "../../../components/ha-card";
import "../../../components/ha-fab";

import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { SceneEntity, activateScene } from "../../../data/scene";
import { showToast } from "../../../util/toast";
import { ifDefined } from "lit-html/directives/if-defined";
import { forwardHaptic } from "../../../data/haptics";
import { configSections } from "../ha-panel-config";

@customElement("ha-scene-dashboard")
class HaSceneDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public route!: Route;
  @property() public scenes!: SceneEntity[];

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
      >
        <ha-config-section .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.scene.picker.header")}
          </div>
          <div slot="introduction">
            ${this.hass.localize("ui.panel.config.scene.picker.introduction")}
            <p>
              <a
                href="https://home-assistant.io/docs/scene/editor/"
                target="_blank"
              >
                ${this.hass.localize("ui.panel.config.scene.picker.learn_more")}
              </a>
            </p>
          </div>

          <ha-card
            .heading=${this.hass.localize(
              "ui.panel.config.scene.picker.pick_scene"
            )}
          >
            ${this.scenes.length === 0
              ? html`
                  <div class="card-content">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.scene.picker.no_scenes"
                      )}
                    </p>
                  </div>
                `
              : this.scenes.map(
                  (scene) => html`
                    <div class="scene">
                      <paper-icon-button
                        .scene=${scene}
                        icon="hass:play"
                        title="${this.hass.localize(
                          "ui.panel.config.scene.picker.activate_scene"
                        )}"
                        @click=${this._activateScene}
                      ></paper-icon-button>
                      <paper-item-body two-line>
                        <div>${computeStateName(scene)}</div>
                      </paper-item-body>
                      <div class="actions">
                        <a
                          href=${ifDefined(
                            scene.attributes.id
                              ? `/config/scene/edit/${scene.attributes.id}`
                              : undefined
                          )}
                        >
                          <paper-icon-button
                            title="${this.hass.localize(
                              "ui.panel.config.scene.picker.edit_scene"
                            )}"
                            icon="hass:pencil"
                            .disabled=${!scene.attributes.id}
                          ></paper-icon-button>
                          ${!scene.attributes.id
                            ? html`
                                <paper-tooltip position="left">
                                  ${this.hass.localize(
                                    "ui.panel.config.scene.picker.only_editable"
                                  )}
                                </paper-tooltip>
                              `
                            : ""}
                        </a>
                      </div>
                    </div>
                  `
                )}
          </ha-card>
        </ha-config-section>
        <a href="/config/scene/edit/new">
          <ha-fab
            ?is-wide=${this.isWide}
            ?narrow=${this.narrow}
            icon="hass:plus"
            title=${this.hass.localize(
              "ui.panel.config.scene.picker.add_scene"
            )}
            ?rtl=${computeRTL(this.hass)}
          ></ha-fab>
        </a>
      </hass-tabs-subpage>
    `;
  }

  private async _activateScene(ev) {
    const scene = ev.target.scene as SceneEntity;
    await activateScene(this.hass, scene.entity_id);
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.scene.activated",
        "name",
        computeStateName(scene)
      ),
    });
    forwardHaptic("light");
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        :host {
          display: block;
          height: 100%;
        }

        ha-card {
          padding-bottom: 8px;
          margin-bottom: 56px;
        }

        .scene {
          display: flex;
          flex-direction: horizontal;
          align-items: center;
          padding: 0 8px 0 16px;
        }

        .scene a[href] {
          color: var(--primary-text-color);
        }

        .actions {
          display: flex;
        }

        ha-entity-toggle {
          margin-right: 16px;
        }

        ha-fab {
          position: fixed;
          bottom: 16px;
          right: 16px;
          z-index: 1;
        }

        ha-fab[is-wide] {
          bottom: 24px;
          right: 24px;
        }
        ha-fab[narrow] {
          bottom: 84px;
        }
        ha-fab[rtl] {
          right: auto;
          left: 16px;
        }

        ha-fab[rtl][is-wide] {
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
    "ha-scene-dashboard": HaSceneDashboard;
  }
}
