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

import "../../../components/ha-card";
import "../../../components/ha-icon";
import "../components/hui-image";
import "../components/hui-warning-element";

import { computeStateName } from "../../../common/entity/compute_state_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateIcon } from "../../../common/entity/state_icon";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { LovelaceCard, LovelaceCardEditor } from "../types";
import { HomeAssistant } from "../../../types";
import { processConfigEntities } from "../common/process-config-entities";
import { PictureGlanceCardConfig, PictureGlanceEntityConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { actionHandler } from "../common/directives/action-handler-directive";
import { hasAction } from "../common/has-action";
import { ActionHandlerEvent } from "../../../data/lovelace";
import { handleAction } from "../common/handle-action";

const STATES_OFF = new Set(["closed", "locked", "not_home", "off"]);

@customElement("hui-picture-glance-card")
class HuiPictureGlanceCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import(
      /* webpackChunkName: "hui-picture-glance-card-editor" */ "../editor/config-elements/hui-picture-glance-card-editor"
    );
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

  private _entitiesDialog?: PictureGlanceEntityConfig[];

  private _entitiesToggle?: PictureGlanceEntityConfig[];

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
    if (hasConfigOrEntityChanged(this, changedProps)) {
      return true;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass!.themes ||
      oldHass.language !== this.hass!.language
    ) {
      return true;
    }

    if (this._entitiesDialog) {
      for (const entity of this._entitiesDialog) {
        if (
          oldHass!.states[entity.entity] !== this.hass!.states[entity.entity]
        ) {
          return true;
        }
      }
    }

    if (this._entitiesToggle) {
      for (const entity of this._entitiesToggle) {
        if (
          oldHass!.states[entity.entity] !== this.hass!.states[entity.entity]
        ) {
          return true;
        }
      }
    }

    return false;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | PictureGlanceCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
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
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this._config!.hold_action),
            hasDoubleClick: hasAction(this._config!.double_tap_action),
          })}
          tabindex="0"
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
          <div class="row">
            ${this._entitiesDialog!.map((entityConf) =>
              this.renderEntity(entityConf, true)
            )}
          </div>
          <div class="row">
            ${this._entitiesToggle!.map((entityConf) =>
              this.renderEntity(entityConf, false)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private renderEntity(
    entityConf: PictureGlanceEntityConfig,
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
      <div class="wrapper">
        <ha-icon
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(entityConf.hold_action),
            hasDoubleClick: hasAction(entityConf.double_tap_action),
          })}
          tabindex="0"
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
        ${this._config!.show_state !== true && entityConf.show_state !== true
          ? html`
              <div class="state"></div>
            `
          : html`
              <div class="state">
                ${computeStateDisplay(
                  this.hass!.localize,
                  stateObj,
                  this.hass!.language
                )}
              </div>
            `}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as any;
    handleAction(this, this.hass!, config, ev.detail.action!);
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
        flex-direction: row;
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
      ha-icon.show-state {
        width: 20px;
        height: 20px;
        padding-bottom: 4px;
        padding-top: 4px;
      }
      .state {
        display: block;
        font-size: 12px;
        text-align: center;
        line-height: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .row {
        display: flex;
        flex-direction: row;
      }
      .wrapper {
        display: flex;
        flex-direction: column;
        width: 40px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-glance-card": HuiPictureGlanceCard;
  }
}
