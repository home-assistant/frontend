import { ContextEvent } from "@lit/context";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../src/common/decorators/consume";
import { computeRTLDirection } from "../../../src/common/util/compute_rtl";
import type { LovelaceCardConfig } from "../../../src/data/lovelace/config/card";
import { handleAction } from "../../../src/panels/lovelace/common/handle-action";
import "../../../src/panels/lovelace/cards/hui-card";
import type { HomeAssistant } from "../../../src/types";
import { embedHassContext } from "./context";
import { readScriptData } from "./script-data";
import { embedThemeStyles } from "./theme-styles";

const pageProvider = (): HTMLElement =>
  document.querySelector("ha-embed-provider") ??
  document.body.appendChild(document.createElement("ha-embed-provider"));

// Looks past shadow roots, so a card inside another component still finds
// the provider around that component.
const insideProvider = (element: Element): boolean => {
  let current: Element | null = element;

  while (current) {
    if (current.closest("ha-embed-provider")) {
      return true;
    }

    const root = current.getRootNode();
    current = root instanceof ShadowRoot ? root.host : null;
  }

  return false;
};

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

  @state()
  @consume({ context: embedHassContext, subscribe: true })
  private _hass?: HomeAssistant;

  // A provider that is not an ancestor, which gets the context requests of the
  // card and its content. Context requests only reach ancestors by themselves.
  private _linkedProvider?: HTMLElement;

  private _scriptRead = false;

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
    // Cards fire their tap, hold and double tap actions for the app to handle
    this.addEventListener("hass-action", (ev) => {
      if (this._hass) {
        // The element that fired the action, so that fire-dom-event reaches
        // listeners inside custom cards, as in action-mixin
        const node = (ev.composedPath()[0] as HTMLElement | undefined) ?? this;
        handleAction(node, this._hass, ev.detail.config, ev.detail.action);
      }
    });
  }

  public connectedCallback() {
    // Before super.connectedCallback(), which sends the context requests.
    this._linkedProvider = this.provider
      ? (document.getElementById(this.provider) ?? undefined)
      : insideProvider(this)
        ? undefined
        : pageProvider();
    super.connectedCallback();

    // Only once, so that moving the card keeps a config set since
    if (this._scriptRead) {
      return;
    }

    this._scriptRead = true;

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
      dir=${computeRTLDirection(this._hass)}
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
      /* The text styles the app sets on html and body, so that the card does
         not inherit the text styles of the page that embeds it. */
      .theme {
        color: var(--primary-text-color);
        font-family: var(--ha-font-family-body);
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-body);
        line-height: normal;
        letter-spacing: normal;
        text-align: start;
        -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
        -webkit-font-smoothing: var(--ha-font-smoothing);
      }
      /* What setDirectionStyles sets on the app for a right-to-left language,
         here only for the card */
      .theme[dir="rtl"] {
        --direction: rtl;
        --float-start: right;
        --float-end: left;
        --scale-direction: -1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-embed-card": HaEmbedCard;
  }
}
