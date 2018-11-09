import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap";
import { TemplateResult } from "lit-html";

import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { fireEvent } from "../../../common/dom/fire_event";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { LovelaceCard, LovelaceConfig } from "../types";
import { EntityConfig } from "../entity-rows/types";
import { navigate } from "../../../common/navigate";
import { HomeAssistant } from "../../../types";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import computeStateName from "../../../common/entity/compute_state_name";
import processConfigEntities from "../common/process-config-entities";
import computeDomain from "../../../common/entity/compute_domain";
import stateIcon from "../../../common/entity/state_icon";
import toggleEntity from "../common/entity/toggle-entity";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-image";

const STATES_OFF = new Set(["closed", "locked", "not_home", "off"]);

interface Config extends LovelaceConfig {
  entities: EntityConfig[];
  title?: string;
  navigation_path?: string;
  image?: string;
  camera_image?: string;
  state_image?: {};
  aspect_ratio?: string;
  entity?: string;
  force_dialog?: boolean;
}

class HuiPictureGlanceCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;
  private _entitiesDialog?: EntityConfig[];
  private _entitiesToggle?: EntityConfig[];

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize() {
    return 3;
  }

  public setConfig(config: Config) {
    if (
      !config ||
      !config.entities ||
      !Array.isArray(config.entities) ||
      !(config.image || config.camera_image || config.state_image) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid card configuration");
    }

    const entities = processConfigEntities(config.entities);
    this._entitiesDialog = [];
    this._entitiesToggle = [];

    entities.forEach((item) => {
      if (
        config.force_dialog ||
        !DOMAINS_TOGGLE.has(computeDomain(item.entity))
      ) {
        this._entitiesDialog!.push(item);
      } else {
        this._entitiesToggle!.push(item);
      }
    });

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const isClickable =
      this._config.navigation_path || this._config.camera_image;

    return html`
      ${this.renderStyle()}
      <ha-card>
        <hui-image
          class="${
            classMap({
              clickable: Boolean(isClickable),
            })
          }"
          @click="${this._handleImageClick}"
          .hass="${this.hass}"
          .image="${this._config.image}"
          .stateImage="${this._config.state_image}"
          .cameraImage="${this._config.camera_image}"
          .entity="${this._config.entity}"
          .aspectRatio="${this._config.aspect_ratio}"
        ></hui-image>
        <div class="box">
          ${
            this._config.title
              ? html`
                  <div class="title">${this._config.title}</div>
                `
              : ""
          }
          <div>
            ${
              this._entitiesDialog!.filter(
                (entityConf) => entityConf.entity in this.hass!.states
              ).map((entityConf) => {
                return html`
                  <ha-icon
                    .entity="${entityConf.entity}"
                    @click="${this._openDialog}"
                    class="${
                      classMap({
                        "state-on": !STATES_OFF.has(
                          this.hass!.states[entityConf.entity].state
                        ),
                      })
                    }"
                    .icon="${
                      entityConf.icon ||
                        stateIcon(this.hass!.states[entityConf.entity])
                    }"
                    title="${
                      `
                        ${computeStateName(
                          this.hass!.states[entityConf.entity]
                        )} : ${computeStateDisplay(
                        this.localize,
                        this.hass!.states[entityConf.entity],
                        this.hass!.language
                      )}
                        `
                    }"
                  ></ha-icon>
                `;
              })
            }
          </div>
          <div>
            ${
              this._entitiesToggle!.filter(
                (entityConf) => entityConf.entity in this.hass!.states
              ).map((entityConf) => {
                return html`
                  <ha-icon
                    .entity="${entityConf.entity}"
                    @click="${this._callService}"
                    class="${
                      classMap({
                        "state-on": !STATES_OFF.has(
                          this.hass!.states[entityConf.entity].state
                        ),
                      })
                    }"
                    .icon="${
                      entityConf.icon ||
                        stateIcon(this.hass!.states[entityConf.entity])
                    }"
                    title="${
                      `
                      ${computeStateName(
                        this.hass!.states[entityConf.entity]
                      )} : ${computeStateDisplay(
                        this.localize,
                        this.hass!.states[entityConf.entity],
                        this.hass!.language
                      )}
                      `
                    }"
                  ></ha-icon>
                `;
              })
            }
          </div>
        </div>
      </ha-card>
    `;
  }

  private _openDialog(ev: MouseEvent) {
    fireEvent(this, "hass-more-info", { entityId: (ev.target as any).entity });
  }

  private _callService(ev: MouseEvent) {
    toggleEntity(this.hass, (ev.target as any).entity);
  }

  private _handleImageClick() {
    if (this._config!.navigation_path) {
      navigate(this, this._config!.navigation_path!);
      return;
    }

    if (this._config!.camera_image) {
      fireEvent(this, "hass-more-info", {
        entityId: this._config!.camera_image,
      });
    }
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        ha-card {
          position: relative;
          min-height: 48px;
          overflow: hidden;
        }
        hui-image.clickable {
          cursor: pointer;
        }
        .box {
          @apply --paper-font-common-nowrap;
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.3);
          padding: 4px 8px;
          font-size: 16px;
          line-height: 40px;
          color: white;
          display: flex;
          justify-content: space-between;
        }
        .box .title {
          font-weight: 500;
          margin-left: 8px;
        }
        ha-icon {
          cursor: pointer;
          padding: 8px;
          color: #a9a9a9;
        }
        ha-icon.state-on {
          color: white;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-glance-card": HuiPictureGlanceCard;
  }
}

customElements.define("hui-picture-glance-card", HuiPictureGlanceCard);
