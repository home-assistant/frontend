import type { HassConfig, HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { consume } from "../../../common/decorators/consume";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeDomain } from "../../../common/entity/compute_domain";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-card";
import "../../../components/timer-list/ha-timer-list";
import { configContext, uiContext } from "../../../data/context";
import type { Themes } from "../../../data/ws-themes";
import type {
  HomeAssistant,
  HomeAssistantConfig,
  HomeAssistantUI,
} from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import type { TimerListCardConfig } from "./types";

@customElement("hui-timer-list-card")
export class HuiTimerListCard extends LitElement implements LovelaceCard {
  public static async getConfigForm() {
    return (
      await import("../editor/config-elements/hui-timer-list-card-editor")
    ).default;
  }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): TimerListCardConfig {
    const foundEntities = findEntities(hass, 1, entities, entitiesFallback, [
      "timer_list",
    ]);
    return { type: "timer-list", entity: foundEntities[0] || "" };
  }

  @state() private _config?: TimerListCardConfig;

  @state()
  @consumeEntityState({ entityIdPath: ["_config", "entity"] })
  private _stateObj?: HassEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _hassConfig!: HassConfig;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, Themes>({
    transformer: ({ themes }) => themes,
  })
  private _themes!: Themes;

  public getCardSize(): number {
    return (this._config?.title ? 1 : 0) + 3;
  }

  public setConfig(config: TimerListCardConfig): void {
    if (!config.entity || computeDomain(config.entity) !== "timer_list") {
      throw new Error("Specify an entity from within the timer_list domain");
    }
    this._config = config;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this._themes) {
      return;
    }
    const oldConfig = changedProps.get("_config") as
      TimerListCardConfig | undefined;
    if (
      changedProps.has("_themes") ||
      (changedProps.has("_config") && oldConfig?.theme !== this._config.theme)
    ) {
      applyThemesOnElement(this, this._themes, this._config.theme);
    }
  }

  protected render() {
    if (!this._config || !this._localize) {
      return nothing;
    }

    if (!this._stateObj) {
      return html`
        <hui-warning>
          ${createEntityNotFoundWarning(this._localize, this._hassConfig)}
        </hui-warning>
      `;
    }

    return html`
      <ha-card .header=${this._config.title}>
        <ha-timer-list
          .entityId=${this._config.entity}
          .hideCreate=${this._config.hide_create ?? false}
        ></ha-timer-list>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card {
      height: 100%;
      box-sizing: border-box;
    }
    ha-timer-list {
      padding: var(--ha-space-4);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-timer-list-card": HuiTimerListCard;
  }
}
