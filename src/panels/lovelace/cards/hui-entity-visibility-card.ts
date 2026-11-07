import {
  mdiBell,
  mdiBellOutline,
  mdiBellRing,
  mdiEye,
  mdiEyeOff,
  mdiStar,
  mdiStarOutline,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../common/dom/fire_event";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-control-select";
import type { ControlSelectOption } from "../../../components/ha-control-select";
import "../../../components/ha-svg-icon";
import type { SecurityAlertSeverity } from "../../../data/frontend";
import type { LocalizeFunc } from "../../../common/translations/localize";
import type { HomeAssistant, ValueChangedEvent } from "../../../types";
import "./hui-card";
import type { HuiCard } from "./hui-card";
import type { LovelaceCard, LovelaceGridOptions } from "../types";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type {
  EntityVisibilityAlertLevel,
  EntityVisibilityCardConfig,
} from "./types";

const ALERT_LEVELS: EntityVisibilityAlertLevel[] = ["none", "warning", "alert"];

type EntityVisibilityControl = "favorite" | "alert";

interface PendingFocus {
  key: string;
  control: EntityVisibilityControl;
  source: HuiEntityVisibilityCard;
}

let pendingFocus: PendingFocus | undefined;

const computeFocusKey = (
  entity: string,
  onPage: boolean,
  alertSelect: boolean
): string => `${entity}|${onPage}|${alertSelect}`;

export const clearEntityVisibilityFocus = (): void => {
  pendingFocus = undefined;
};

const ALERT_ICONS: Record<EntityVisibilityAlertLevel, string> = {
  none: mdiBellOutline,
  warning: mdiBell,
  alert: mdiBellRing,
};

@customElement("hui-entity-visibility-card")
export class HuiEntityVisibilityCard
  extends LitElement
  implements LovelaceCard
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ type: Boolean }) public preview = false;

  @state() private _config?: EntityVisibilityCardConfig;

  @query(".favorite-control") private _favoriteControl?: HTMLButtonElement;

  @query(".alert-control") private _alertControl?: HTMLElement;

  private _card?: HuiCard;

  public setConfig(config: EntityVisibilityCardConfig): void {
    if (!config.entity) {
      throw new Error("No entity configured");
    }
    if (!config.card) {
      throw new Error("No card configured");
    }
    this._config = config;
    this._card = document.createElement("hui-card");
    this._card.hass = this.hass;
    this._card.preview = this.preview;
    this._card.config = config.card;
    this._card.inert = true;
    this._card.load();
  }

  public getCardSize(): number | Promise<number> {
    return this._card?.getCardSize() ?? 1;
  }

  public getGridOptions(): LovelaceGridOptions {
    return this._card?.getGridOptions() ?? {};
  }

  public connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener(
      "entity-visibility-changed",
      this._entityVisibilityChanged
    );
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener(
      "entity-visibility-changed",
      this._entityVisibilityChanged
    );
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);
    if (!this._card) {
      return;
    }
    if (changedProps.has("hass")) {
      this._card.hass = this.hass;
    }
    if (changedProps.has("preview")) {
      this._card.preview = this.preview;
    }
  }

  protected updated(changedProps: PropertyValues<this>): void {
    super.updated(changedProps);
    if (
      !this._config ||
      !pendingFocus ||
      pendingFocus.source === this ||
      pendingFocus.key !== this._focusKey()
    ) {
      return;
    }
    const { control } = pendingFocus;
    pendingFocus = undefined;
    const element =
      control === "favorite" ? this._favoriteControl : this._alertControl;
    element?.focus();
    this._reportLostFocus(element);
  }

  private async _reportLostFocus(element?: HTMLElement): Promise<void> {
    if (element instanceof LitElement) {
      await element.updateComplete;
    }
    if (this.shadowRoot?.activeElement !== element) {
      fireEvent(this, "entity-visibility-focus-lost");
    }
  }

  protected render() {
    if (!this._config || !this.hass || !this._card) {
      return nothing;
    }
    const { localize } = this.hass;
    const canHide = this._config.hidden !== undefined;
    const alertSelect = Boolean(this._config.alert_select);
    const hidden = Boolean(this._config.hidden);
    const favorite = this._config.favorite;
    const alert = this._config.alert;
    const stateObj = this.hass.states[this._config.entity];
    const name = stateObj
      ? this.hass.formatEntityName(stateObj)
      : this._config.entity;
    const alertLabel =
      alert !== undefined
        ? localize("ui.card.entity-visibility.alert_level", {
            label: name,
            level: localize(`ui.card.entity-visibility.alert_levels.${alert}`),
          })
        : undefined;
    return html`
      <div class="wrapper" ?hidden-entity=${hidden}>
        ${
          stateObj
            ? this._card
            : html`
                <hui-warning>
                  <div class="missing">
                    <span class="missing-entity">${this._config.entity}</span>
                    <span>
                      ${createEntityNotFoundWarning(localize, this.hass.config)}
                    </span>
                  </div>
                </hui-warning>
              `
        }
        ${
          canHide
            ? html`
                <button
                  class="control"
                  aria-label=${localize(
                    `ui.components.items-display-editor.${hidden ? "show" : "hide"}`,
                    { label: name }
                  )}
                  @click=${this._toggleHidden}
                ></button>
              `
            : nothing
        }
        <div class="actions">
          ${
            alert === undefined
              ? nothing
              : !alertSelect
                ? html`
                    <button
                      class=${classMap({
                        action: true,
                        "alert-control": true,
                        [alert]: true,
                      })}
                      aria-label=${ifDefined(alertLabel)}
                      @click=${this._cycleAlert}
                    >
                      <ha-svg-icon .path=${ALERT_ICONS[alert]}></ha-svg-icon>
                    </button>
                  `
                : html`
                    <ha-control-select
                      class=${classMap({ "alert-control": true, [alert]: true })}
                      hide-option-label
                      .label=${localize(
                        "ui.card.entity-visibility.alert_level_group",
                        { label: name }
                      )}
                      .options=${this._alertOptions(localize)}
                      .value=${alert}
                      @value-changed=${this._alertSelected}
                    ></ha-control-select>
                  `
          }
          ${
            favorite !== undefined
              ? html`
                  <button
                    class=${classMap({
                      action: true,
                      "favorite-control": true,
                      favorite,
                    })}
                    aria-label=${localize(
                      `ui.card.entity-visibility.${favorite ? "remove_favorite" : "add_favorite"}`,
                      { label: name }
                    )}
                    @click=${this._toggleFavorite}
                  >
                    <ha-svg-icon
                      .path=${favorite ? mdiStar : mdiStarOutline}
                    ></ha-svg-icon>
                  </button>
                `
              : nothing
          }
          ${
            canHide
              ? html`
                  <ha-svg-icon
                    class="eye"
                    .path=${hidden ? mdiEyeOff : mdiEye}
                  ></ha-svg-icon>
                `
              : nothing
          }
        </div>
      </div>
    `;
  }

  private _focusKey(): string {
    const config = this._config!;
    return computeFocusKey(
      config.entity,
      config.hidden !== undefined,
      Boolean(config.alert_select)
    );
  }

  private _rememberFocus(
    control: EntityVisibilityControl,
    entryRemoved = false
  ): void {
    if (!this.shadowRoot?.activeElement) {
      return;
    }
    const config = this._config!;
    const key = !entryRemoved
      ? this._focusKey()
      : config.neighbor_entity
        ? computeFocusKey(
            config.neighbor_entity,
            false,
            Boolean(config.alert_select)
          )
        : config.fallback_entity
          ? computeFocusKey(config.fallback_entity, true, false)
          : undefined;
    if (!key) {
      fireEvent(this, "entity-visibility-focus-lost");
      return;
    }
    pendingFocus = { key, control, source: this };
  }

  private _entityVisibilityChanged = (
    ev: HASSDomEvent<HASSDomEvents["entity-visibility-changed"]>
  ) => {
    if (
      this._config?.hidden === undefined ||
      ev.detail.entity !== this._config.entity ||
      ev.detail.hidden === this._config.hidden
    ) {
      return;
    }
    this._config = { ...this._config, hidden: ev.detail.hidden };
  };

  private _toggleHidden(): void {
    if (this._config?.hidden === undefined) {
      return;
    }
    const hidden = !this._config.hidden;
    this._config = { ...this._config, hidden };
    fireEvent(this, "entity-visibility-changed", {
      entity: this._config.entity,
      hidden,
    });
  }

  private _toggleFavorite(ev: Event): void {
    ev.stopPropagation();
    if (!this._config) {
      return;
    }
    const { favorite, hidden, alert_select: alertSelect } = this._config;
    this._rememberFocus(
      "favorite",
      Boolean(favorite) && hidden === undefined && !alertSelect
    );
    fireEvent(this, "entity-favorite-changed", {
      entity: this._config.entity,
      favorite: !this._config.favorite,
    });
  }

  private _alertOptions = memoizeOne(
    (localize: LocalizeFunc): ControlSelectOption[] =>
      ALERT_LEVELS.map((level) => ({
        value: level,
        path: ALERT_ICONS[level],
        ariaLabel: localize(`ui.card.entity-visibility.alert_levels.${level}`),
      }))
  );

  private _alertSelected(
    ev: ValueChangedEvent<EntityVisibilityAlertLevel>
  ): void {
    ev.stopPropagation();
    if (!this._config?.alert || ev.detail.value === this._config.alert) {
      return;
    }
    this._rememberFocus("alert", ev.detail.value === "none");
    fireEvent(this, "entity-alert-changed", {
      entity: this._config.entity,
      severity: ev.detail.value === "none" ? undefined : ev.detail.value,
    });
  }

  private _cycleAlert(ev: Event): void {
    ev.stopPropagation();
    if (!this._config?.alert) {
      return;
    }
    const next =
      ALERT_LEVELS[
        (ALERT_LEVELS.indexOf(this._config.alert) + 1) % ALERT_LEVELS.length
      ];
    this._rememberFocus("alert");
    fireEvent(this, "entity-alert-changed", {
      entity: this._config.entity,
      severity: next === "none" ? undefined : next,
    });
  }

  static styles: CSSResultGroup = css`
    .wrapper {
      position: relative;
      height: 100%;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
    }
    hui-card,
    hui-warning {
      display: block;
      height: 100%;
    }
    .missing {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .missing-entity {
      font-weight: var(--ha-font-weight-medium);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wrapper[hidden-entity] hui-card {
      opacity: 0.8;
    }
    .wrapper[hidden-entity]::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px dotted var(--secondary-text-color);
      border-radius: inherit;
      pointer-events: none;
    }
    .control {
      position: absolute;
      inset: 0;
      z-index: 1;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      border-radius: inherit;
      cursor: pointer;
    }
    .control:focus-visible {
      outline: 2px solid var(--primary-color);
    }
    .actions {
      position: absolute;
      bottom: var(--ha-space-2);
      right: var(--ha-space-2);
      inset-inline-end: var(--ha-space-2);
      inset-inline-start: auto;
      z-index: 2;
      display: flex;
      gap: var(--ha-space-1);
      pointer-events: none;
    }
    .action {
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
      pointer-events: auto;
      color: var(--primary-text-color);
    }
    .action:focus-visible {
      outline: 2px solid var(--primary-color);
      border-radius: var(--ha-border-radius-circle);
    }
    .action.favorite {
      color: var(--primary-color);
    }
    .action.warning {
      color: var(--warning-color);
    }
    .action.alert {
      color: var(--error-color);
    }
    ha-control-select {
      pointer-events: auto;
      width: 96px;
      --control-select-thickness: 28px;
      --control-select-padding: 2px;
      --control-select-border-radius: var(--ha-border-radius-pill);
      --control-select-button-border-radius: var(--ha-border-radius-pill);
      --control-select-background: var(--secondary-background-color);
      --control-select-background-opacity: 1;
      --control-select-color: var(--secondary-text-color);
      --mdc-icon-size: 16px;
      border-radius: var(--ha-border-radius-pill);
      box-shadow: var(--ha-box-shadow-s);
    }
    ha-control-select.warning {
      --control-select-color: var(--warning-color);
    }
    ha-control-select.alert {
      --control-select-color: var(--error-color);
    }
    ha-svg-icon {
      display: flex;
      padding: var(--ha-space-1);
      border-radius: var(--ha-border-radius-circle);
      background: var(--secondary-background-color);
      box-shadow: var(--ha-box-shadow-s);
      --mdc-icon-size: 20px;
    }
    .eye {
      color: var(--primary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-visibility-card": HuiEntityVisibilityCard;
  }
  interface GlobalEventHandlersEventMap {
    "entity-visibility-changed": HASSDomEvent<
      HASSDomEvents["entity-visibility-changed"]
    >;
  }
  interface HASSDomEvents {
    "entity-visibility-changed": { entity: string; hidden: boolean };
    "entity-visibility-focus-lost": undefined;
    "entity-favorite-changed": { entity: string; favorite: boolean };
    "entity-alert-changed": {
      entity: string;
      severity: SecurityAlertSeverity | undefined;
    };
  }
}
