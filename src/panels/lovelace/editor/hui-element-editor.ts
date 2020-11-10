import "@material/mwc-button";
import { safeDump, safeLoad } from "js-yaml";
import {
  css,
  CSSResult,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  query,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/ha-circular-progress";
import "../../../components/ha-code-editor";
import type { HaCodeEditor } from "../../../components/ha-code-editor";
import type {
  LovelaceCardConfig,
  LovelaceConfig,
} from "../../../data/lovelace";
import type { HomeAssistant } from "../../../types";
import { handleStructError } from "../common/structs/handle-errors";
import type { LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceHeaderFooterConfig } from "../header-footer/types";
import type { LovelaceGenericElementEditor } from "../types";
import "./config-elements/hui-generic-entity-row-editor";
import { GUISupportError } from "./gui-support-error";
import { EditSubElementEvent, GUIModeChangedEvent } from "./types";

export interface ConfigChangedEvent {
  config: LovelaceCardConfig | LovelaceRowConfig | LovelaceHeaderFooterConfig;
  error?: string;
  guiModeAvailable?: boolean;
}

declare global {
  interface HASSDomEvents {
    "config-changed": ConfigChangedEvent;
    "GUImode-changed": GUIModeChangedEvent;
    "edit-detail-element": EditSubElementEvent;
  }
}

export interface UIConfigChangedEvent extends Event {
  detail: {
    config: LovelaceCardConfig | LovelaceRowConfig | LovelaceHeaderFooterConfig;
  };
}

export abstract class HuiElementEditor<T> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @internalProperty() private _yaml?: string;

  @internalProperty() private _config?: T;

  @internalProperty() private _configElement?: LovelaceGenericElementEditor;

  @internalProperty() private _configElementType?: string;

  @internalProperty() private _GUImode = true;

  // Error: Configuration broken - do not save
  @internalProperty() private _error?: string;

  // Warning: GUI editor can't handle configuration - ok to save
  @internalProperty() private _warnings?: string[];

  @internalProperty() private _loading = false;

  @query("ha-code-editor") _yamlEditor?: HaCodeEditor;

  public get yaml(): string {
    if (!this._yaml) {
      this._yaml = safeDump(this._config);
    }
    return this._yaml || "";
  }

  public set yaml(_yaml: string) {
    this._yaml = _yaml;
    try {
      this._config = safeLoad(this.yaml);
      this._error = undefined;
    } catch (err) {
      this._error = err.message;
    }
    this._setConfig();
  }

  public get value(): T | undefined {
    return this._config;
  }

  public set value(config: T | undefined) {
    if (this._config && deepEqual(config, this._config)) {
      return;
    }
    this._config = config;
    this._yaml = undefined;
    this._error = undefined;
    this._setConfig();
  }

  private _setConfig(): void {
    if (!this._error) {
      try {
        this._updateConfigElement();
        this._error = undefined;
      } catch (err) {
        this._error = err.message;
      }
    }

    fireEvent(this, "config-changed", {
      config: this.value! as any,
      error: this._error,
      guiModeAvailable: !(this.hasWarning || this.hasError),
    });
  }

  public get hasWarning(): boolean {
    return this._warnings !== undefined;
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

  public toggleMode() {
    this.GUImode = !this.GUImode;
  }

  public refreshYamlEditor(focus = false) {
    if (this._configElement?.refreshYamlEditor) {
      this._configElement.refreshYamlEditor(focus);
    }
    if (!this._yamlEditor?.codemirror) {
      return;
    }
    this._yamlEditor.codemirror.refresh();
    if (focus) {
      this._yamlEditor.codemirror.focus();
    }
  }

  protected async getConfigElement(): Promise<
    LovelaceGenericElementEditor | undefined
  > {
    return undefined;
  }

  protected get configElementType(): string | undefined {
    return this.value ? (this.value as any).type : undefined;
  }

  protected render(): TemplateResult {
    return html`
      <div class="wrapper">
        ${this.GUImode
          ? html`
              <div class="gui-editor">
                ${this._loading
                  ? html`
                      <ha-circular-progress
                        active
                        alt="Loading"
                        class="center margin-bot"
                      ></ha-circular-progress>
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
                  .error=${Boolean(this._error)}
                  .rtl=${computeRTL(this.hass)}
                  @value-changed=${this._handleYAMLChanged}
                  @keydown=${this._ignoreKeydown}
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
        ${this._warnings
          ? html`
              <div class="warning">
                UI editor is not supported for this config:
                <br />
                <ul>
                  ${this._warnings.map((warning) => html`<li>${warning}</li>`)}
                </ul>
                You can still edit your config in yaml.
              </div>
            `
          : ""}
      </div>
    `;
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (this._configElement && changedProperties.has("hass")) {
      this._configElement.hass = this.hass;
    }
    if (
      this._configElement &&
      "lovelace" in this._configElement &&
      changedProperties.has("lovelace")
    ) {
      this._configElement.lovelace = this.lovelace;
    }
  }

  private _handleUIConfigChanged(ev: UIConfigChangedEvent) {
    ev.stopPropagation();
    const config = ev.detail.config;
    this.value = (config as unknown) as T;
  }

  private _handleYAMLChanged(ev: CustomEvent) {
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

    let configElement: LovelaceGenericElementEditor | undefined;

    try {
      this._error = undefined;
      this._warnings = undefined;

      if (this._configElementType !== this.configElementType) {
        // If the type has changed, we need to load a new GUI editor

        if (!this.configElementType) {
          throw new Error(`No type defined`);
        }

        this._configElementType = this.configElementType;

        this._loading = true;
        configElement = await this.getConfigElement();

        if (!configElement) {
          throw new Error(
            `No visual editor available for: ${this.configElementType}`
          );
        }

        configElement.hass = this.hass;
        if ("lovelace" in configElement) {
          configElement.lovelace = this.lovelace;
        }
        configElement.addEventListener("config-changed", (ev) =>
          this._handleUIConfigChanged(ev as UIConfigChangedEvent)
        );

        this._configElement = configElement;
      }

      // Setup GUI editor and check that it can handle the current config
      try {
        this._configElement!.setConfig(this.value);
      } catch (err) {
        throw new GUISupportError(
          "Config is not supported",
          handleStructError(err)
        );
      }
    } catch (err) {
      if (err instanceof GUISupportError) {
        this._warnings = err.warnings ?? [err.message];
      } else {
        this._error = err;
      }
      this.GUImode = false;
    } finally {
      this._loading = false;
    }
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
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
      .error,
      .warning {
        word-break: break-word;
      }
      .error {
        color: var(--error-color);
      }
      .warning {
        color: var(--warning-color);
      }
      .warning ul {
        margin: 4px 0;
      }
      ha-circular-progress {
        display: block;
        margin: auto;
      }
    `;
  }
}
