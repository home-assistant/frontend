import { ContextEvent } from "@lit/context";
import type { TemplateResult } from "lit";
import { html, LitElement, nothing } from "lit";
import { property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { consume } from "../../../src/common/decorators/consume";
import { computeRTLDirection } from "../../../src/common/util/compute_rtl";
import { handleAction } from "../../../src/panels/lovelace/common/handle-action";
import type { HomeAssistant } from "../../../src/types";
import { embedHassContext } from "./context";
import type { ScriptObject } from "./script-data";
import { readScriptObject } from "./script-data";

const pageProvider = (): HTMLElement =>
  document.querySelector("ha-embed-provider") ??
  document.body.appendChild(document.createElement("ha-embed-provider"));

// Looks past shadow roots, so an element inside another component still
// finds the provider around that component.
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
 * The base of the embed elements that render dashboard content. The element
 * uses the provider with the ID in `provider`, else the closest provider
 * around it, else the first provider on the page. If the page has no
 * provider, the element adds an empty one.
 */
export abstract class EmbedElement<
  Config extends ScriptObject,
> extends LitElement {
  /**
   * The configuration of the content, the same as in a dashboard. Also read
   * from a JSON or YAML script child, see `readScriptObject`.
   */
  @property({ type: Object }) public config?: Config;

  /** The ID of the `ha-embed-provider` to use. */
  @property() public provider?: string;

  @state()
  @consume({ context: embedHassContext, subscribe: true })
  protected _hass?: HomeAssistant;

  // A provider that is not an ancestor, which gets the context requests of the
  // element and its content. Context requests only reach ancestors by
  // themselves.
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
        const [origin] = ev.composedPath();
        const node = origin instanceof HTMLElement ? origin : this;

        handleAction(node, this._hass, ev.detail.config, ev.detail.action);
      }
    });
    // The page's address belongs to the page, so only a hash on it, such as
    // an anchor, navigates there. The browser does that itself, as the app's
    // navigate() doesn't scroll to the anchor.
    this.addEventListener("hass-navigate", (ev) => {
      const { path, replace } = ev.detail;

      ev.preventDefault();

      if (!path.startsWith("#")) {
        this.navigateTo(path, replace);
      } else if (replace) {
        window.location.replace(path);
      } else {
        window.location.hash = path;
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

    // Only once, so that moving the element keeps a config set since
    if (this._scriptRead) {
      return;
    }

    this._scriptRead = true;

    const data = readScriptObject(this);

    if (data !== undefined) {
      this.setScriptData(data);
    }
  }

  /**
   * A navigate action of the content, other than to a hash on the page. It
   * leaves the page where it is, like actions that open a dialog. `replace`
   * is the action's `navigation_replace`.
   */
  protected navigateTo(_path: string, _replace?: boolean) {
    // Nothing to navigate to, outside a dashboard
  }

  /** Whether the data of a script child is a configuration of the content. */
  protected abstract isConfig(data: ScriptObject): data is Config;

  /** Sets the data of a JSON or YAML script child, see `readScriptObject`. */
  protected setScriptData(data: ScriptObject) {
    if (this.isConfig(data)) {
      this.config = data;
    }
  }

  /** The content, or `undefined` while there is nothing to render. */
  protected abstract renderContent(
    hass: HomeAssistant
  ): TemplateResult | undefined;

  // The content in the theme of the provider
  protected render() {
    const hass = this._hass;
    const content = hass && this.renderContent(hass);

    if (!hass || !content) {
      return nothing;
    }

    return html`<div
      class=${classMap({ theme: true, dark: hass.themes.darkMode })}
      dir=${computeRTLDirection(hass)}
    >
      ${content}
    </div>`;
  }
}
