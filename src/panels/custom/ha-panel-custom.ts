import type { PropertyValues } from "lit";
import { ReactiveElement } from "lit";
import { customElement, property } from "lit/decorators";
import type { NavigateOptions } from "../../common/navigate";
import { navigate } from "../../common/navigate";
import { deepEqual } from "../../common/util/deep-equal";
import type { CustomPanelInfo } from "../../data/panel_custom";
import type { HomeAssistant, Route } from "../../types";
import { createCustomPanelElement } from "../../util/custom-panel/create-custom-panel-element";
import {
  getUrl,
  loadCustomPanel,
} from "../../util/custom-panel/load-custom-panel";
import { setCustomPanelProperties } from "../../util/custom-panel/set-custom-panel-properties";

declare global {
  interface HTMLElementTagNameMap {
    "ha-panel-custom": HaPanelCustom;
  }
  interface Window {
    customPanel: HaPanelCustom | undefined;
  }
}

@customElement("ha-panel-custom")
export class HaPanelCustom extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public panel!: CustomPanelInfo;

  private _setProperties?: (props: Record<string, unknown>) => void;

  private _wasDisconnected = false;

  protected createRenderRoot() {
    return this;
  }

  // Since navigate fires events on `window`, we need to expose this as a function
  // to allow custom panels to forward their location changes to the main window
  // instead of their iframe window.
  public navigate = (path: string, options?: NavigateOptions) =>
    navigate(path, options);

  public registerIframe(initialize, setProperties) {
    initialize(this.panel, {
      hass: this.hass,
      narrow: this.narrow,
      route: this.route,
    });
    this._setProperties = setProperties;
    this.querySelector("iframe")?.classList.add("loaded");
  }

  public connectedCallback() {
    super.connectedCallback();
    // Only rebuild when reattached after a real disconnect (the 5-minute
    // suspendWhenHidden timer in partial-panel-resolver). On first mount,
    // update() handles creation via the panel-changed branch, so calling
    // _createPanel here too would start a duplicate loadCustomPanel().
    if (this._wasDisconnected && this.panel) {
      this._wasDisconnected = false;
      this._createPanel(this.panel);
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._wasDisconnected = true;
    this._cleanupPanel();
  }

  protected update(changedProps: PropertyValues<this>) {
    super.update(changedProps);
    if (changedProps.has("panel")) {
      // Clean up old things if we had a panel and the new one is different.
      const oldPanel = changedProps.get("panel") as CustomPanelInfo | undefined;
      if (!deepEqual(oldPanel, this.panel)) {
        if (oldPanel) {
          this._cleanupPanel();
        }
        this._createPanel(this.panel);
        return;
      }
    }
    if (!this._setProperties) {
      return;
    }
    const props = {};
    // @ts-ignore
    for (const key of changedProps.keys()) {
      props[key] = this[key];
    }
    this._setProperties(props);
  }

  private _cleanupPanel() {
    delete window.customPanel;
    this._setProperties = undefined;
    while (this.lastChild) {
      this.removeChild(this.lastChild);
    }
  }

  private _createPanel(panel: CustomPanelInfo) {
    this.style.backgroundColor = "var(--primary-background-color)";

    const config = panel.config!._panel_custom;
    const panelUrl = getUrl(config);

    const tempA = document.createElement("a");
    tempA.href = panelUrl.url;

    if (
      !config.trust_external &&
      !["localhost", "127.0.0.1", location.hostname].includes(tempA.hostname)
    ) {
      if (
        !confirm(
          `${this.hass.localize(
            "ui.panel.custom.external_panel.question_trust",
            { name: config.name, link: tempA.href }
          )}

           ${this.hass.localize(
             "ui.panel.custom.external_panel.complete_access"
           )}

           (${this.hass.localize(
             "ui.panel.custom.external_panel.hide_message"
           )})`
        )
      ) {
        return;
      }
    }

    if (!config.embed_iframe) {
      loadCustomPanel(config).then(
        () => {
          // loadCustomPanel caches its Promise, so a detach/reattach cycle
          // during load can fan out multiple .then callbacks onto it. Skip
          // any that arrive after we've already populated or been removed.
          if (!this.isConnected || this._setProperties) {
            return;
          }
          const element = createCustomPanelElement(config);
          this._setProperties = (props) =>
            setCustomPanelProperties(element, props);
          setCustomPanelProperties(element, {
            panel,
            hass: this.hass,
            narrow: this.narrow,
            route: this.route,
          });
          this.appendChild(element);
        },
        () => {
          alert(`Unable to load custom panel from ${tempA.href}`);
        }
      );
      return;
    }

    window.customPanel = this;
    const titleAttr = this.panel.title ? `title="${this.panel.title}"` : "";
    this.innerHTML = `
      <style>
        iframe {
          border: none;
          width: 100%;
          height: 100vh;
          height: 100dvh;
          display: block;
          background-color: var(--primary-background-color);
          opacity: 0;
          transition: opacity var(--ha-animation-duration-normal) ease;
        }
        iframe.loaded {
          opacity: 1;
        }
      </style>
      <iframe ${titleAttr}></iframe>`.trim();
    const iframeDoc = this.querySelector("iframe")!.contentWindow!.document;
    iframeDoc.open();
    iframeDoc.write(
      `<!doctype html><script src='${window.customPanelJS}'></script>`
    );
    iframeDoc.close();
  }
}
