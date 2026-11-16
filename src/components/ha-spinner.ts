import Spinner from "@home-assistant/webawesome/dist/components/spinner/spinner";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";

@customElement("ha-spinner")
export class HaSpinner extends Spinner {
  @property() public size?: "tiny" | "small" | "medium" | "large";

  /**
   * Accessible name of the progress indicator, forwarded to the inner
   * `progressbar`. Name what is in progress, like "Installing update",
   * rather than its state. Defaults to the translated "Loading".
   */
  @property({ type: String, attribute: "aria-label", reflect: false })
  public override ariaLabel: string | null = null;

  @state() @consumeLocalize() private _localize?: LocalizeFunc;

  // Same template as wa-spinner, which always names the progressbar with an
  // untranslated "Loading" and ignores the host's aria-label.
  public override render() {
    const label =
      this.ariaLabel || this._localize?.("ui.common.loading") || "Loading";

    return html`
      <svg
        part="base spinner"
        role="progressbar"
        aria-label=${label}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle class="track" />
        <circle class="indicator" />
      </svg>
    `;
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);

    if (changedProps.has("size")) {
      switch (this.size) {
        case "tiny":
          this.style.setProperty("--ha-spinner-size", "16px");
          break;
        case "small":
          this.style.setProperty("--ha-spinner-size", "28px");
          break;
        case "medium":
          this.style.setProperty("--ha-spinner-size", "48px");
          break;
        case "large":
          this.style.setProperty("--ha-spinner-size", "68px");
          break;
        case undefined:
          this.style.removeProperty("--ha-progress-ring-size");
          break;
      }
    }
  }

  static get styles(): CSSResultGroup {
    return [
      Spinner.styles,
      css`
        :host {
          --indicator-color: var(
            --ha-spinner-indicator-color,
            var(--primary-color)
          );
          --track-color: var(--ha-spinner-divider-color, var(--divider-color));
          --track-width: 4px;
          --speed: 3.5s;
          font-size: var(--ha-spinner-size, 48px);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-spinner": HaSpinner;
  }
}
