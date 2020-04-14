import "@material/mwc-button";
import { safeDump, safeLoad } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTL } from "../../../../common/util/compute_rtl";
import "../../../../components/ha-code-editor";
import type { HaCodeEditor } from "../../../../components/ha-code-editor";
import type {
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../../../data/lovelace";
import type { HomeAssistant } from "../../../../types";
import { getCardElementClass } from "../../create-element/create-card-element";
import type { EntityConfig } from "../../entity-rows/types";
import type { LovelaceCardEditor } from "../../types";
import type { GUIModeChangedEvent } from "../types";

export interface ConfigChangedEvent {
  config: LovelaceCardConfig;
  error?: string;
  guiModeAvailable?: boolean;
}

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": ConfigChangedEvent;
    "GUImode-changed": GUIModeChangedEvent;
  }
}

export interface UIConfigChangedEvent extends Event {
  detail: {
    config: LovelaceCardConfig;
  };
}

@customElement("hui-card-editor")
export class HuiCardEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public lovelace?: LovelaceConfig;

  @property() private _yaml?: string;

  @property() private _config?: LovelaceCardConfig;

  @property() private _configElement?: LovelaceCardEditor;

  @property() private _configElType?: string;

  @property() private _GUImode = true;

  // Error: Configuration broken - do not save
  @property() private _error?: string;

  // Warning: GUI editor can't handle configuration - ok to save
  @property() private _warning?: string;

  @property() private _loading = false;

  public get yaml(): string {
    return this._yaml || "";
  }

  public set yaml(_yaml: string) {
    this._yaml = _yaml;
    try {
      this._config = safeLoad(this.yaml);
      this._updateConfigElement();
      this._error = undefined;
    } catch (err) {
      this._error = err.message;
    }
    fireEvent(this, "config-changed", {
      config: this.value!,
      error: this._error,
      guiModeAvailable: !(this.hasWarning || this.hasError),
    });
  }

  public get value(): LovelaceCardConfig | undefined {
    return this._config;
  }

  public set value(config: LovelaceCardConfig | undefined) {
    if (JSON.stringify(config) !== JSON.stringify(this._config || {})) {
      this.yaml = safeDump(config);
    }
  }

  public get hasWarning(): boolean {
    return this._warning !== undefined;
  }

  public get hasError(): boolean {
    return this._error !== undefined;
  }

  public get GUImode(): boolean {
    return this._GUImode;
  }

  public set GUImode(guiMode: boolean) {
    this._GUImode = guiMode;
    fireEvent(this as HTMLElement, "GUImode-changed", {
      guiMode,
      guiModeAvailable: !(this.hasWarning || this.hasError),
    });
  }

  private get _yamlEditor(): HaCodeEditor {
    return this.shadowRoot!.querySelector("ha-code-editor")! as HaCodeEditor;
  }

  public toggleMode() {
    this.GUImode = !this.GUImode;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._refreshYamlEditor();
  }

  protected render(): TemplateResult {
    return html`
      <div class="wrapper">
        ${this.GUImode
          ? html`
              <div class="gui-editor">
                ${this._loading
                  ? html`
                      <paper-spinner
                        active
                        alt="Loading"
                        class="center margin-bot"
                      ></paper-spinner>
                    `
                  : this._configElement}
              </div>
            `
          : html`
              <div class="yaml-editor">
                <ha-code-editor
                  mode="yaml"
                  autofocus
                  .value=${this.yaml}
                  .error=${this._error}
                  .rtl=${computeRTL(this.hass)}
                  @value-changed=${this._handleYAMLChanged}
                ></ha-code-editor>
              </div>
            `}
        ${this._error
          ? html`
              <div class="error">
                ${this._error}
              </div>
            `
          : ""}
        ${this._warning
          ? html`
              <div class="warning">
                ${this._warning}
              </div>
            `
          : ""}
      </div>
    `;
  }

  protected updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has("_GUImode")) {
      if (this.GUImode === false) {
        // Refresh code editor when switching to yaml mode
        this._refreshYamlEditor(true);
      }
      fireEvent(this as HTMLElement, "iron-resize");
    }

    if (this._configElement && changedProperties.has("hass")) {
      this._configElement.hass = this.hass;
    }
    if (this._configElement && changedProperties.has("lovelace")) {
      this._configElement.lovelace = this.lovelace;
    }
  }

  private _refreshYamlEditor(focus = false) {
    // wait on render
    setTimeout(() => {
      if (this._yamlEditor && this._yamlEditor.codemirror) {
        this._yamlEditor.codemirror.refresh();
        if (focus) {
          this._yamlEditor.codemirror.focus();
        }
      }
      fireEvent(this as HTMLElement, "iron-resize");
    }, 1);
  }

  private _handleUIConfigChanged(ev: UIConfigChangedEvent) {
    ev.stopPropagation();
    const config = ev.detail.config;
    this.value = config;
  }

  private _handleYAMLChanged(ev) {
    ev.stopPropagation();
    const newYaml = ev.detail.value;
    if (newYaml !== this.yaml) {
      this.yaml = newYaml;
    }
  }

  private async _updateConfigElement(): Promise<void> {
    if (!this.value) {
      return;
    }

    const cardType = this.value.type;
    let configElement = this._configElement;
    try {
      this._error = undefined;
      this._warning = undefined;

      if (this._configElType !== cardType) {
        // If the card type has changed, we need to load a new GUI editor
        if (!this.value.type) {
          throw new Error("No card type defined");
        }

        const elClass = await getCardElementClass(cardType);

        this._loading = true;
        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
          configElement = await elClass.getConfigElement();
        } else {
          configElement = undefined;
          throw Error(`WARNING: No visual editor available for: ${cardType}`);
        }

        this._configElement = configElement;
        this._configElType = cardType;

        // Perform final setup
        this._configElement.hass = this.hass;
        this._configElement.lovelace = this.lovelace;
        this._configElement.addEventListener("config-changed", (ev) =>
          this._handleUIConfigChanged(ev as UIConfigChangedEvent)
        );
      }

      // Setup GUI editor and check that it can handle the current config
      try {
        this._configElement!.setConfig(this.value);
      } catch (err) {
        throw Error(`WARNING: ${err.message}`);
      }
    } catch (err) {
      if (err.message.startsWith("WARNING:")) {
        this._warning = err.message.substr(8);
      } else {
        this._error = err;
      }
      this.GUImode = false;
    } finally {
      this._loading = false;
      fireEvent(this, "iron-resize");
    }
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: flex;
      }
      .wrapper {
        width: 100%;
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
      paper-spinner {
        display: block;
        margin: auto;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-card-editor": HuiCardEditor;
  }
}
