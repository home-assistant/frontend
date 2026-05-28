import { consume } from "@lit/context";
import { parseISO } from "date-fns";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import { transform } from "../common/decorators/transform";
import { relativeTime } from "../common/datetime/relative_time";
import { capitalizeFirstLetter } from "../common/string/capitalize-first-letter";
import { internationalizationContext } from "../data/context";
import type { FrontendLocaleData } from "../data/translation";
import type { LocalizeFunc } from "../common/translations/localize";
import type { HomeAssistantInternationalization } from "../types";

@customElement("ha-relative-time")
class HaRelativeTime extends ReactiveElement {
  @property({ attribute: false }) public datetime?: string | Date;

  @property({ type: Boolean }) public capitalize = false;

  @state()
  @consumeLocalize()
  private _localize?: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale?: FrontendLocaleData;

  private _interval?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearInterval();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    if (this.datetime) {
      this._startInterval();
    }
  }

  protected createRenderRoot() {
    return this;
  }

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);
    this._updateRelative();
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    this._updateRelative();
  }

  private _clearInterval(): void {
    if (this._interval) {
      window.clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  private _startInterval(): void {
    this._clearInterval();

    // update every 60 seconds
    this._interval = window.setInterval(() => this._updateRelative(), 60000);
  }

  private _updateRelative(): void {
    if (!this._localize || !this._locale) {
      return;
    }

    if (!this.datetime) {
      this.innerHTML = this._localize("ui.components.relative_time.never");
    } else {
      const date =
        typeof this.datetime === "string"
          ? parseISO(this.datetime)
          : this.datetime;

      const relTime = relativeTime(date, this._locale);
      this.innerHTML = this.capitalize
        ? capitalizeFirstLetter(relTime)
        : relTime;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-relative-time": HaRelativeTime;
  }
}
