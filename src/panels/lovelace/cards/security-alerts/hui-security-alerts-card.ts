import { ContextProvider, consume, type ContextType } from "@lit/context";
import type { HassEntity } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeEntityStates } from "../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../common/dom/fire_event";
import {
  configContext,
  internationalizationContext,
} from "../../../../data/context";
import {
  computeSecurityAlertItem,
  computeSecurityAlertItems,
  extractSecurityAlertEntityIds,
  isValidSecurityAlertEntityConfig,
  type SecurityAlertItem,
} from "./helpers";
import type { LovelaceCard, LovelaceGridOptions } from "../../types";
import type { SecurityAlertsCardConfig } from "../types";
import { securityAlertsContext } from "./context";
import "./hui-security-alerts-heading";
import "./hui-security-alerts-list";

@customElement("hui-security-alerts-card")
export class HuiSecurityAlertsCard extends LitElement implements LovelaceCard {
  public connectedWhileHidden = true;

  @property({ type: Boolean }) public preview = false;

  private _alertsProvider = new ContextProvider<{
    __context__: SecurityAlertItem[];
  }>(this, {
    context: securityAlertsContext,
    initialValue: [],
  });

  @state() private _config?: SecurityAlertsCardConfig;

  @state() private _alertEntityIds?: string[];

  @state()
  @consumeEntityStates({ entityIdPath: ["_alertEntityIds"] })
  private _states?: Record<string, HassEntity>;

  @state()
  @consume({ context: configContext, subscribe: true })
  private _hassConfig!: ContextType<typeof configContext>;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  public setConfig(config: SecurityAlertsCardConfig): void {
    if (
      !Array.isArray(config.alert_entities) ||
      config.alert_entities.some(
        (alertEntity) => !isValidSecurityAlertEntityConfig(alertEntity)
      )
    ) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
    this._alertEntityIds = extractSecurityAlertEntityIds(config.alert_entities);
  }

  public getCardSize(): number {
    return this._visibleAlerts.length + 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return {
      columns: 12,
      rows: "auto",
      min_columns: 6,
      min_rows: 1,
    };
  }

  private get _visibleAlerts(): SecurityAlertItem[] {
    const states = this._states;
    if (!this._config || !this._alertEntityIds?.length || !states) {
      return [];
    }
    if (this.preview) {
      return this._config.alert_entities
        .map((alertEntity) => {
          const stateObj = states[alertEntity.entity];
          return stateObj
            ? computeSecurityAlertItem(stateObj, alertEntity)
            : undefined;
        })
        .filter((item): item is SecurityAlertItem => Boolean(item));
    }
    return computeSecurityAlertItems(
      { ...this._hassConfig, ...this._i18n, states },
      this._config.alert_entities
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._config) {
      return;
    }

    const alerts = this._visibleAlerts;
    this._alertsProvider.setValue(alerts);
    const shouldBeHidden = !this.preview && alerts.length === 0;

    if (shouldBeHidden !== this.hidden) {
      this.style.display = shouldBeHidden ? "none" : "";
      this.toggleAttribute("hidden", shouldBeHidden);
      fireEvent(this, "card-visibility-changed", { value: !shouldBeHidden });
      this.requestUpdate();
    }
  }

  protected render() {
    if (!this._config || this.hidden) {
      return nothing;
    }

    return html`
      ${
        this.preview
          ? nothing
          : html`<hui-security-alerts-heading></hui-security-alerts-heading>`
      }
      <hui-security-alerts-list></hui-security-alerts-list>
    `;
  }

  static styles = css`
    :host {
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-security-alerts-card": HuiSecurityAlertsCard;
  }
}
