import { consume } from "@lit/context";
import { parseISO } from "date-fns";
import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { relativeTime } from "../common/datetime/relative_time";
import { capitalizeFirstLetter } from "../common/string/capitalize-first-letter";
import { internationalizationContext } from "../data/context";
import type { HomeAssistantInternationalization } from "../types";

@customElement("ha-relative-time")
class HaRelativeTime extends ReactiveElement {
  @property({ attribute: false }) public datetime?: string | Date;

  @property() public format: Intl.RelativeTimeFormatStyle = "long";

  @property({ type: Boolean }) public capitalize = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  private _timeout?: number;

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearTimeout();
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._updateRelative();
  }

  protected createRenderRoot() {
    return this;
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    this._updateRelative();
  }

  private _clearTimeout(): void {
    if (this._timeout) {
      window.clearTimeout(this._timeout);
      this._timeout = undefined;
    }
  }

  private _updateRelative(): void {
    this._clearTimeout();

    if (!this._i18n) {
      return;
    }

    if (!this.datetime) {
      this.textContent = this._i18n.localize(
        "ui.components.relative_time.never"
      );
      return;
    }

    const date =
      typeof this.datetime === "string"
        ? parseISO(this.datetime)
        : this.datetime;

    const relTime = relativeTime(
      date,
      this._i18n.locale,
      undefined,
      true,
      this.format
    );
    this.textContent = this.capitalize
      ? capitalizeFirstLetter(relTime)
      : relTime;

    // Keep the relative time counting up on its own. Refresh every second
    // while the difference is still measured in seconds, otherwise every
    // minute.
    const secondsDiff = Math.abs(Date.now() - date.getTime()) / 1000;
    this._timeout = window.setTimeout(
      () => this._updateRelative(),
      secondsDiff < 60 ? 1000 : 60000
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-relative-time": HaRelativeTime;
  }
}
