import { consume, ContextEvent } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HomeAssistant } from "../../../src/types";
import { embedHassContext } from "./context";
import { readScriptData } from "./script-data";
import { embedThemeStyles } from "./theme-styles";

const pageProvider = (): HTMLElement =>
  document.querySelector("ha-embed-provider") ??
  document.body.appendChild(document.createElement("ha-embed-provider"));

/**
 * Renders a Lovelace card. The card uses the provider with the ID in
 * `provider`, else the closest provider around it, else the first provider on
 * the page. If the page has no provider, the card adds an empty one.
 */
@customElement("ha-embed-card")
export class HaEmbedCard extends LitElement {
  /**
   * The card configuration. Also read from a JSON or YAML script child, see
   * `readScriptData`.
   */
  @property({ type: Object }) public config?: LovelaceCardConfig;

  /** The ID of the `ha-embed-provider` to use. */
  @property() public provider?: string;

  @consume({ context: embedHassContext, subscribe: true })
  @state()
  private _hass?: HomeAssistant;

  // A provider that is not an ancestor, which gets the context requests of the
  // card and its content. Context requests only reach ancestors by themselves.
  private _linkedProvider?: HTMLElement;

  constructor() {
    super();
    this.addEventListener("context-request", (ev) => {
      if (!this._linkedProvider) {
        return;
      }
      ev.stopPropagation();
      this._linkedProvider.dispatchEvent(
        new ContextEvent(
          ev.context,
          ev.contextTarget,
          ev.callback,
          ev.subscribe
        )
      );
    });
  }

  public connectedCallback() {
    // Before super.connectedCallback(), which sends the context requests.
    this._linkedProvider = this.provider
      ? (document.getElementById(this.provider) ?? undefined)
      : this.closest("ha-embed-provider")
        ? undefined
        : pageProvider();
    super.connectedCallback();
    const config = readScriptData(this) as LovelaceCardConfig | undefined;
    if (config) {
      this.config = config;
    }
  }

  protected render() {
    if (!this._hass || !this.config) {
      return nothing;
    }
    return html`<div
      class=${classMap({ theme: true, dark: this._hass.themes.darkMode })}
    >
      <hui-card .hass=${this._hass} .config=${this.config}></hui-card>
    </div>`;
  }

  static styles = [
    embedThemeStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-card": HaEmbedCard;
  }
}
