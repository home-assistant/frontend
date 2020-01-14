import {
  LitElement,
  TemplateResult,
  html,
  CSSResultArray,
  css,
  property,
  customElement,
  query,
} from "lit-element";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-tooltip/paper-tooltip";
import "../../../layouts/hass-subpage";
import "../../../components/device/ha-device-picker";
import "../../../components/ha-area-picker";
import "../../../components/ha-card";
import "../../../components/ha-fab";

import "../ha-config-section";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeRTL } from "../../../common/util/compute_rtl";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { SceneEntity, activateScene } from "../../../data/scene";
import { showToast } from "../../../util/toast";
import { ifDefined } from "lit-html/directives/if-defined";
import { forwardHaptic } from "../../../data/haptics";
import { findRelated } from "../../../data/search";
// tslint:disable-next-line
import { HaDevicePicker } from "../../../components/device/ha-device-picker";
// tslint:disable-next-line
import { HaAreaPicker } from "../../../components/ha-area-picker";
import memoizeOne from "memoize-one";

@customElement("ha-scene-dashboard")
class HaSceneDashboard extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public narrow!: boolean;
  @property() public isWide!: boolean;
  @property() public scenes!: SceneEntity[];
  @property() private _filteredScenes?: string[];
  @query("ha-device-picker") private _devicePicker!: HaDevicePicker;
  @query("ha-area-picker") private _areaPicker!: HaAreaPicker;

  private _scenes = memoizeOne(
    (scenes: SceneEntity[], filteredScenes?: string[]): SceneEntity[] =>
      filteredScenes
        ? scenes.filter((scene) => filteredScenes!.includes(scene.entity_id))
        : scenes
  );

  protected render(): TemplateResult | void {
    const scenes = this._scenes(this.scenes, this._filteredScenes);
    return html`
      <hass-subpage
        .showBackButton=${!this.isWide}
        .header=${this.hass.localize("ui.panel.config.scene.caption")}
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
            <div class="filter-bar">
              <ha-device-picker
                @value-changed=${this._devicePicked}
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.scene.picker.filter.device"
                )}
              ></ha-device-picker>
              <ha-area-picker
                @value-changed=${this._areaPicked}
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.scene.picker.filter.area"
                )}
              ></ha-area-picker>
            </div>
            ${scenes.length === 0
              ? html`
                  <div class="card-content">
                    <p>
                      ${this.hass.localize(
                        "ui.panel.config.scene.picker.no_scenes"
                      )}
                    </p>
                  </div>
                `
              : scenes.map(
                  (scene) => html`

                      <div class='scene'>
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
                            ${
                              !scene.attributes.id
                                ? html`
                                    <paper-tooltip position="left">
                                      ${this.hass.localize(
                                        "ui.panel.config.scene.picker.only_editable"
                                      )}
                                    </paper-tooltip>
                                  `
                                : ""
                            }
                          </a>
                      </div>
                    </a>
                  `
                )}
          </ha-card>
        </ha-config-section>

        <a href="/config/scene/edit/new">
          <ha-fab
            slot="fab"
            ?is-wide=${!this.narrow}
            icon="hass:plus"
            title=${this.hass.localize(
              "ui.panel.config.scene.picker.add_scene"
            )}
            ?rtl=${computeRTL(this.hass)}
          ></ha-fab>
        </a>
      </hass-subpage>
    `;
  }

  private async _devicePicked(ev: CustomEvent) {
    this._areaPicker.value = "";
    if (!ev.detail.value) {
      this._filteredScenes = undefined;
      return;
    }
    const related = await findRelated(this.hass, "device", ev.detail.value);
    this._filteredScenes = related.scene || [];
  }

  private async _areaPicked(ev: CustomEvent) {
    this._devicePicker.value = "";
    if (!ev.detail.value) {
      this._filteredScenes = undefined;
      return;
    }
    const related = await findRelated(this.hass, "area", ev.detail.value);
    this._filteredScenes = related.scene || [];
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
        }

        hass-subpage {
          min-height: 100vh;
        }

        ha-card {
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

        .card-content {
          padding-top: 16px;
        }

        .filter-bar {
          display: flex;
          padding: 0 16px;
          border-bottom: 1px solid rgba(var(--rgb-primary-text-color), 0.12);
        }

        .filter-bar > * {
          flex-grow: 1;
          padding: 0 8px;
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
