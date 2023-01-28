import { PropertyValues, ReactiveElement } from "lit";
import { property } from "lit/decorators";
import { navigate, NavigateOptions } from "../../common/navigate";
import { deepEqual } from "../../common/util/deep-equal";
import { CustomPanelInfo } from "../../data/panel_custom";
import { HomeAssistant, Route } from "../../types";
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

export class HaPanelCustom extends ReactiveElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public route!: Route;

  @property() public panel!: CustomPanelInfo;

  private _setProperties?: (props: Record<string, unknown>) => void | undefined;

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
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupPanel();
  }

  protected update(changedProps: PropertyValues) {
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
            "name",
            config.name,
            "link",
            tempA.href
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
          border: 0;
          width: 100%;
          height: 100%;
          display: block;
          background-color: var(--primary-background-color);
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

customElements.define("ha-panel-custom", HaPanelCustom);
