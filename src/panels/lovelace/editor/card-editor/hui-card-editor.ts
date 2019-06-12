import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
  property,
} from "lit-element";

import yaml from "js-yaml";

import "@material/mwc-button";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { LovelaceCardEditor } from "../../types";
import { getCardElementTag } from "../../common/get-card-element-tag";

import "../../components/hui-yaml-editor";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HuiYamlEditor } from "../../components/hui-yaml-editor";
import { fireEvent } from "../../../../common/dom/fire_event";
import { EntityConfig } from "../../entity-rows/types";

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": {
      config: LovelaceCardConfig;
    };
  }
}

@customElement("hui-card-editor")
export class HuiCardEditor extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public value?;

  @property() private _yaml?: string | undefined;
  @property() private _configElement?: LovelaceCardEditor;
  @property() private _configElType?: string;
  @property() private _GUImode: boolean = true;
  // Error: Configuration broken - do not save
  @property() private _error?: string;
  // Warning: GUI editor can't handle configuration - ok to save
  @property() private _warning?: string;
  @property() private _loading: boolean = false;

  public get yaml(): string {
    return this._yaml || "";
  }
  public set yaml(_yaml: string) {
    this._yaml = _yaml;
    this._updateConfigElement();
    // TODO: Defer this to next redraw? How?
    setTimeout(() => this._yamlEditor.codemirror.refresh(), 1);
    fireEvent(this, "config-changed", { config: this.config! });
  }

  public get config(): LovelaceCardConfig | undefined {
    try {
      return yaml.safeLoad(this.yaml);
    } catch (err) {
      this._error = err;
      return { type: "error", error: err.message };
    }
  }
  public set config(config: LovelaceCardConfig | undefined) {
    this.yaml = yaml.safeDump(config);
  }

  public get error(): boolean {
    return this._error !== undefined;
  }

  private get _yamlEditor(): HuiYamlEditor {
    return this.shadowRoot!.querySelector("hui-yaml-editor")!;
  }

  protected render(): TemplateResult {
    return html`
      <div style="width: 100%;">
        <div class="gui-editor" ?hidden="${this._GUImode === false}">
          ${this._loading
            ? html`
                <paper-spinner
                  ?active="${this._loading}"
                  alt="Loading"
                  class="center margin-bot"
                ></paper-spinner>
              `
            : this._warning || this._error
            ? ""
            : this._configElement}
        </div>
        <div class="yaml-editor" ?hidden="${this._GUImode === true}">
          <hui-yaml-editor
            .hass="${this.hass}"
            .value="${this.yaml}"
            @yaml-changed="${this._handleYAMLChanged}"
          ></hui-yaml-editor>
          <div class="error">
            ${this._error}
          </div>
          <div class="warning">
            ${this._warning}
          </div>
        </div>
        <div class="buttons">
          <mwc-button
            @click="${() => (this._GUImode = !this._GUImode)}"
            ?disabled="${this._warning || this._error}"
            ?unelevated="${this._GUImode === false}"
          >
            <ha-icon .icon="${"mdi:code-braces"}"></ha-icon>
          </mwc-button>
        </div>
      </div>
    `;
  }

  static get styles(): CSSResult {
    return css`
      :host {
        margin: 0 10px;
        display: flex;
      }
      .hidden {
        display: none;
      }
      .gui-editor,
      .yaml-editor {
        padding: 8px 0px;
      }
      .error {
        color: #ef5350;
      }
      .warning {
        color: #ffa726;
      }
      .buttons {
        text-align: right;

        padding: 8px 0px;
        border-top: 1px solid #e8e8e8;
      }
    `;
  }

  protected async firstUpdated() {
    this.config = this.value;
  }

  protected updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has("_GUImode")) {
      if (this._GUImode === false) {
        // Refresh code editor when switching to yaml mode
        this._yamlEditor.codemirror.refresh();
        this._yamlEditor.codemirror.focus();
      }
      fireEvent(this as HTMLElement, "iron-resize");
    }
  }

  private _handleUIConfigChanged(ev) {
    ev.stopPropagation();
    const config = ev.detail.config;
    if (JSON.stringify(config) !== JSON.stringify(this.config)) {
      this.config = config;
    }
  }
  private _handleYAMLChanged(ev) {
    ev.stopPropagation();
    const newYaml = ev.detail.value;
    if (newYaml !== this.yaml) {
      this.yaml = newYaml;
    }
  }

  private async _updateConfigElement(): Promise<void> {
    if (!this.config) {
      return;
    }

    const cardType = this.config.type;
    let configElement = this._configElement;
    try {
      this._error = undefined;
      this._warning = undefined;

      if (this._configElType !== cardType) {
        // If the card type has changed, we need to load a new GUI editor
        if (!this.config.type) {
          throw new Error("No card type defined");
        }

        const tag = getCardElementTag(cardType);

        // Check if the card type exists
        const elClass = customElements.get(tag);
        if (!elClass) {
          throw new Error(`Unknown card type encountered: ${cardType}.`);
        }

        try {
          // Check if the card config works
          const testElement = new elClass();
          testElement.setConfig(this.config);
        } catch (err) {
          throw new Error(err.message);
        }

        this._loading = true;
        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
          configElement = await elClass.getConfigElement();
        } else {
          configElement = undefined;
          throw Error(`WARNING: No GUI editor available for: ${cardType}`);
        }

        this._configElement = configElement;
        this._configElType = cardType;
      }

      // Setup GUI editor and check that it can handle the current config
      try {
        this._configElement!.setConfig(this.config);
      } catch (err) {
        throw Error(`WARNING: ${err.message}`);
      }

      // Perform final setup
      this._configElement!.hass = this.hass;
      this._configElement!.addEventListener("config-changed", (ev) =>
        this._handleUIConfigChanged(ev)
      );

      return;
    } catch (err) {
      if (err.message.startsWith("WARNING:")) {
        this._warning = err.message.substr(8);
      } else {
        this._error = err;
      }
      this._GUImode = false;
    } finally {
      this._loading = false;
      fireEvent(this as HTMLElement, "iron-resize");
    }
    return;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-editor": HuiCardEditor;
  }
}
