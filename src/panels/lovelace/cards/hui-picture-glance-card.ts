import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stateActive } from "../../../common/entity/state_active";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import type { ImageEntity } from "../../../data/image";
import { computeImageUrl } from "../../../data/image";
import type { ActionHandlerEvent } from "../../../data/lovelace/action_handler";
import type { HomeAssistant } from "../../../types";
import { actionHandler } from "../common/directives/action-handler-directive";
import { findEntities } from "../common/find-entities";
import { handleAction } from "../common/handle-action";
import { hasAction } from "../common/has-action";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import { processConfigEntities } from "../common/process-config-entities";
import "../components/hui-image";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import "../components/hui-warning-element";
import type { LovelaceCard, LovelaceCardEditor } from "../types";
import type {
  PictureGlanceCardConfig,
  PictureGlanceEntityConfig,
} from "./types";
import type { PersonEntity } from "../../../data/person";

@customElement("hui-picture-glance-card")
class HuiPictureGlanceCard extends LitElement implements LovelaceCard {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("../editor/config-elements/hui-picture-glance-card-editor");
    return document.createElement("hui-picture-glance-card-editor");
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): PictureGlanceCardConfig {
    const maxEntities = 2;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      ["sensor", "binary_sensor"]
    );

    return {
      type: "picture-glance",
      title: "Kitchen",
      image: "https://demo.home-assistant.io/stub_config/kitchen.png",
      entities: foundEntities,
    };
  }

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public layout?: string;

  @state() private _config?: PictureGlanceCardConfig;

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
      !(
        config.image ||
        config.image_entity ||
        config.camera_image ||
        config.state_image
      ) ||
      (config.state_image && !config.entity)
    ) {
      throw new Error("Invalid configuration");
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
    if (!this._config || hasConfigOrEntityChanged(this, changedProps)) {
      return true;
    }

    if (!changedProps.has("hass")) {
      return false;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    if (
      !oldHass ||
      oldHass.themes !== this.hass.themes ||
      oldHass.locale !== this.hass.locale
    ) {
      return true;
    }

    if (
      this._config.image_entity &&
      oldHass.states[this._config.image_entity] !==
        this.hass.states[this._config.image_entity]
    ) {
      return true;
    }

    if (this._entitiesDialog) {
      for (const entity of this._entitiesDialog) {
        if (oldHass.states[entity.entity] !== this.hass.states[entity.entity]) {
          return true;
        }
      }
    }

    if (this._entitiesToggle) {
      for (const entity of this._entitiesToggle) {
        if (oldHass.states[entity.entity] !== this.hass.states[entity.entity]) {
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

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }

    let image: string | undefined = this._config.image;
    if (this._config.image_entity) {
      const stateObj: ImageEntity | PersonEntity | undefined =
        this.hass.states[this._config.image_entity];
      const domain: string = computeDomain(this._config.image_entity);
      switch (domain) {
        case "image":
          image = computeImageUrl(stateObj as ImageEntity);
          break;
        case "person":
          if ((stateObj as PersonEntity).attributes.entity_picture) {
            image = (stateObj as PersonEntity).attributes.entity_picture;
          }
          break;
      }
    }

    const ignoreAspectRatio =
      this.layout === "grid" &&
      typeof this._config.grid_options?.rows === "number";

    const hasTapAction =
      hasAction(this._config.tap_action) ||
      Boolean(
        !this._config.tap_action &&
          (this._config.camera_image ||
            this._config.image_entity ||
            this._config.entity)
      );

    return html`
      <ha-card>
        <div
          class="image-container ${classMap({
            clickable:
              hasTapAction ||
              hasAction(this._config.hold_action) ||
              hasAction(this._config.double_tap_action),
          })}"
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasTap: hasTapAction,
            hasHold: hasAction(this._config.hold_action),
            hasDoubleClick: hasAction(this._config.double_tap_action),
          })}
          tabindex=${ifDefined(hasTapAction ? "0" : undefined)}
          role=${ifDefined(hasTapAction ? "button" : undefined)}
          .config=${this._config}
        >
          <hui-image
            .hass=${this.hass}
            .image=${image}
            .stateImage=${this._config.state_image}
            .stateFilter=${this._config.state_filter}
            .cameraImage=${this._config.camera_image}
            .cameraView=${this._config.camera_view}
            .entity=${this._config.entity}
            .fitMode=${this._config.fit_mode}
            .aspectRatio=${ignoreAspectRatio
              ? undefined
              : this._config.aspect_ratio}
          ></hui-image>
        </div>
        <div class="box">
          ${this._config.title
            ? html`<div class="title">${this._config.title}</div>`
            : ""}
          <div class="row">
            ${this._entitiesDialog!.map((entityConf) =>
              this._renderEntity(entityConf, true)
            )}
          </div>
          <div class="row">
            ${this._entitiesToggle!.map((entityConf) =>
              this._renderEntity(entityConf, false)
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderEntity(
    entityConf: PictureGlanceEntityConfig,
    dialog: boolean
  ): TemplateResult {
    const stateObj = this.hass!.states[entityConf.entity];

    entityConf = {
      tap_action: { action: dialog ? "more-info" : "toggle" },
      hold_action: { action: "more-info" },
      ...entityConf,
    };

    if (!stateObj) {
      return html`
        <hui-warning-element
          .label=${createEntityNotFoundWarning(this.hass!, entityConf.entity)}
        ></hui-warning-element>
      `;
    }

    return html`
      <div class="wrapper">
        <ha-icon-button
          @action=${this._handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(entityConf.hold_action),
            hasDoubleClick: hasAction(entityConf.double_tap_action),
          })}
          tabindex=${ifDefined(
            !hasAction(entityConf.tap_action) ? "-1" : undefined
          )}
          .disabled=${!hasAction(entityConf.tap_action)}
          .config=${entityConf}
          class=${classMap({
            "state-on": stateActive(stateObj),
          })}
          title=${`${computeStateName(
            stateObj
          )} : ${this.hass.formatEntityState(stateObj)}`}
        >
          <ha-state-icon
            .icon=${entityConf.icon}
            .stateObj=${stateObj}
            .hass=${this.hass}
          ></ha-state-icon>
        </ha-icon-button>

        ${this._config!.show_state !== true && entityConf.show_state !== true
          ? html`<div class="state"></div>`
          : html`
              <div class="state">
                ${entityConf.attribute
                  ? html`
                      ${entityConf.prefix}${stateObj.attributes[
                        entityConf.attribute
                      ]}${entityConf.suffix}
                    `
                  : this.hass.formatEntityState(stateObj)}
              </div>
            `}
      </div>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    const config = (ev.currentTarget as any).config as any;
    handleAction(this, this.hass!, config, ev.detail.action!);
  }

  static styles = css`
    ha-card {
      position: relative;
      min-height: 48px;
      overflow: hidden;
      height: 100%;
      box-sizing: border-box;
    }
    .image-container {
      height: 100%;
    }
    .image-container.clickable {
      cursor: pointer;
    }
    hui-image {
      pointer-events: none;
      height: 100%;
    }
    .box {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(
        --ha-picture-card-background-color,
        rgba(0, 0, 0, 0.3)
      );
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      flex-direction: row;
    }
    .box .title {
      font-weight: var(--ha-font-weight-medium);
      margin-left: 8px;
      margin-inline-start: 8px;
      margin-inline-end: initial;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
      font-size: var(--ha-font-size-l);
      line-height: var(--ha-line-height-expanded);
      color: var(--ha-picture-card-text-color, white);
      align-self: center;
    }
    ha-state-icon {
      font-size: 0;
    }
    ha-icon-button {
      --mdc-icon-button-size: 40px;
      --disabled-text-color: currentColor;
      color: var(--ha-picture-icon-button-color, #a9a9a9);
    }
    ha-icon-button.state-on {
      color: var(--ha-picture-icon-button-on-color, white);
    }
    hui-warning-element {
      padding: 0 8px;
    }
    .state {
      display: block;
      font-size: var(--ha-font-size-s);
      text-align: center;
      line-height: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--ha-picture-card-text-color, white);
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-picture-glance-card": HuiPictureGlanceCard;
  }
}
