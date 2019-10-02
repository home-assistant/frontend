import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
  PropertyValues,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateIcon } from "../../../common/entity/state_icon";

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-image";
import "../components/hui-warning-element";

import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant } from "../../../types";
import { longPress } from "../common/directives/long-press-directive";
import { processConfigEntities } from "../common/process-config-entities";
import { handleClick } from "../common/handle-click";
import { PictureGlanceCardConfig, ConfigEntity } from "./types";

const STATES_OFF = new Set(["closed", "locked", "not_home", "off"]);

@customElement("hui-picture-glance-card")
class HuiPictureGlanceCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(/* webpackChunkName: "hui-picture-glance-card-editor" */ "../editor/config-elements/hui-picture-glance-card-editor");
    return document.createElement("hui-picture-glance-card-editor");
  }
  public static getStubConfig(): object {
    return {
      image:
        "https://www.home-assistant.io/images/merchandise/shirt-frontpage.png",
      entities: [],
    };
  }

  @property() public hass?: HomeAssistant;

  @property() private _config?: PictureGlanceCardConfig;

  private _entitiesDialog?: ConfigEntity[];

  private _entitiesToggle?: ConfigEntity[];

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PictureGlanceCardConfig): void {
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

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (changedProps.has("_config")) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass) {
      return true;
    }

    if (this._entitiesDialog) {
      for (const entity of this._entitiesDialog) {
        if (
          oldHass.states[entity.entity] !== this.hass!.states[entity.entity]
        ) {
          return true;
        }
      }
    }

    if (this._entitiesToggle) {
      for (const entity of this._entitiesToggle) {
        if (
          oldHass.states[entity.entity] !== this.hass!.states[entity.entity]
        ) {
          return true;
        }
      }
    }

    return false;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card>
        <hui-image
          class=${classMap({
            clickable: Boolean(
              this._config.tap_action ||
                this._config.hold_action ||
                this._config.camera_image
            ),
          })}
          @ha-click=${this._handleTap}
          @ha-hold=${this._handleHold}
          .longPress=${longPress()}
          .config=${this._config}
          .hass=${this.hass}
          .image=${this._config.image}
          .stateImage=${this._config.state_image}
          .stateFilter=${this._config.state_filter}
          .cameraImage=${this._config.camera_image}
          .cameraView=${this._config.camera_view}
          .entity=${this._config.entity}
          .aspectRatio=${this._config.aspect_ratio}
        ></hui-image>
        <div class="box">
          ${this._config.title
            ? html`
                <div class="title">${this._config.title}</div>
              `
            : ""}
          <div>
            ${this._entitiesDialog!.map((entityConf) =>
              this.renderEntity(entityConf, true)
            )}
          </div>
          <div>
            ${this._entitiesToggle!.map((entityConf) =>
              this.renderEntity(entityConf, false)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private renderEntity(
    entityConf: ConfigEntity,
    dialog: boolean
  ): TemplateResult {
    const stateObj = this.hass!.states[entityConf.entity];

    entityConf = {
      tap_action: { action: dialog ? "more-info" : "toggle" },
      ...entityConf,
    };

    if (!stateObj) {
      return html`
        <hui-warning-element
          label=${this.hass!.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            entityConf.entity
          )}
        ></hui-warning-element>
      `;
    }

    return html`
      <ha-icon
        @ha-click=${this._handleTap}
        @ha-hold=${this._handleHold}
        .longPress=${longPress()}
        .config=${entityConf}
        class="${classMap({
          "state-on": !STATES_OFF.has(stateObj.state),
        })}"
        .icon="${entityConf.icon || stateIcon(stateObj)}"
        title="${`
            ${computeStateName(stateObj)} : ${computeStateDisplay(
          this.hass!.localize,
          stateObj,
          this.hass!.language
        )}
          `}"
      ></ha-icon>
    `;
  }

  private _handleTap(ev: MouseEvent): void {
    const config = (ev.currentTarget as any).config as any;
    handleClick(this, this.hass!, config, false);
  }

  private _handleHold(ev: MouseEvent): void {
    const config = (ev.currentTarget as any).config as any;
    handleClick(this, this.hass!, config, true);
  }

  static get styles(): CSSResult {
    return css`
      ha-card {
        position: relative;
        min-height: 48px;
        overflow: hidden;
      }

      hui-image.clickable {
        cursor: pointer;
      }

      .box {
        /* start paper-font-common-nowrap style */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        /* end paper-font-common-nowrap style */

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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-glance-card": HuiPictureGlanceCard;
  }
}
