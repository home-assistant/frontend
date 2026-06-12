import { consume } from "@lit/context";
import { addDays, differenceInMilliseconds, startOfDay } from "date-fns";
import type { HassConfig } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { transform } from "../common/decorators/transform";
import { absoluteTime } from "../common/datetime/absolute_time";
import { configContext, internationalizationContext } from "../data/context";
import type {
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../types";

const SAFE_MARGIN = 5 * 1000;

@customElement("ha-absolute-time")
class HaAbsoluteTime extends ReactiveElement {
  @property({ attribute: false }) public datetime?: string | Date;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config?: HassConfig;

  private _timeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTimeout();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.datetime) {
      this._updateNextDay();
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._updateAbsolute();
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    this._updateAbsolute();
  }

  private _clearTimeout(): void {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _updateNextDay(): void {
    this._clearTimeout();

    const now = new Date();
    const nextDay = addDays(startOfDay(now), 1);
    const ms = differenceInMilliseconds(nextDay, now) + SAFE_MARGIN;

    this._timeout = window.setTimeout(() => {
      this._updateNextDay();
      this._updateAbsolute();
    }, ms);
  }

  private _updateAbsolute(): void {
    if (!this._i18n || !this._config) {
      return;
    }

    if (!this.datetime) {
      this.innerHTML = this._i18n.localize("ui.components.absolute_time.never");
    } else {
      this.innerHTML = absoluteTime(
        new Date(this.datetime),
        this._i18n.locale,
        this._config
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-absolute-time": HaAbsoluteTime;
  }
}
