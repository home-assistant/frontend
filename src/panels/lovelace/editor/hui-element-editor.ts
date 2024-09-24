import { dump, load } from "js-yaml";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { property, query, state } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import { handleStructError } from "../../../common/structs/handle-errors";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/ha-alert";
import "../../../components/ha-circular-progress";
import "../../../components/ha-code-editor";
import type { HaCodeEditor } from "../../../components/ha-code-editor";
import { LovelaceConfig } from "../../../data/lovelace/config/types";
import type { HomeAssistant } from "../../../types";
import type {
  LovelaceConfigForm,
  LovelaceGenericElementEditor,
} from "../types";
import type { HuiFormEditor } from "./config-elements/hui-form-editor";
import { GUISupportError } from "./gui-support-error";
import { EditSubElementEvent, GUIModeChangedEvent } from "./types";

export interface ConfigChangedEvent<T extends object = object> {
  config: T;
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

export interface UIConfigChangedEvent<T extends object = object> extends Event {
  detail: {
    config: T;
  };
}

export abstract class HuiElementEditor<
  T extends object = object,
  C = any,
> extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public lovelace?: LovelaceConfig;

  @property({ attribute: false }) public context?: C;

  @state() private _yaml?: string;

  @state() private _config?: T;

  @state() private _configElement?: LovelaceGenericElementEditor;

  @state() private _guiMode = true;

  // Error: Configuration broken - do not save
  @state() private _errors?: string[];

  // Warning: GUI editor can't handle configuration - ok to save
  @state() private _warnings?: string[];

  @state() private _guiSupported?: boolean;

  @state() private _loading = false;

  @query("ha-code-editor") _yamlEditor?: HaCodeEditor;

  public get yaml(): string {
    if (!this._yaml) {
      this._yaml = dump(this._config);
    }
    return this._yaml || "";
  }

  public set yaml(_yaml: string) {
    this._yaml = _yaml;
    try {
      this._config = load(this.yaml) as any;
      this._errors = undefined;
    } catch (err: any) {
      this._errors = [err.message];
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
    this._errors = undefined;
    this._setConfig();
  }

  private _setConfig(): void {
    if (!this._errors) {
      try {
        this._updateConfigElement();
      } catch (err: any) {
        this._errors = [err.message];
      }
    }

    this.updateComplete.then(() => {
      fireEvent(this, "config-changed", {
        config: this.value! as any,
        error: this._errors?.join(", "),
        guiModeAvailable: !(
          this.hasWarning ||
          this.hasError ||
          this._guiSupported === false
        ),
      });
    });
  }

  public get hasWarning(): boolean {
    return this._warnings !== undefined && this._warnings.length > 0;
  }

  public get hasError(): boolean {
    return this._errors !== undefined && this._errors.length > 0;
  }

  public get GUImode(): boolean {
    return this._guiMode;
  }

  public set GUImode(guiMode: boolean) {
    this._guiMode = guiMode;
    this.updateComplete.then(() => {
      fireEvent(this as HTMLElement, "GUImode-changed", {
        guiMode,
        guiModeAvailable: !(
          this.hasWarning ||
          this.hasError ||
          this._guiSupported === false
        ),
      });
    });
  }

  public toggleMode() {
    this.GUImode = !this.GUImode;
  }

  public focusYamlEditor() {
    if (this._configElement?.focusYamlEditor) {
      this._configElement.focusYamlEditor();
    }
    if (!this._yamlEditor?.codemirror) {
      return;
    }
    this._yamlEditor.codemirror.focus();
  }

  protected async getConfigElement(): Promise<
    LovelaceGenericElementEditor | undefined
  > {
    return undefined;
  }

  protected async getConfigForm(): Promise<LovelaceConfigForm | undefined> {
    return undefined;
  }

  protected renderConfigElement(): TemplateResult {
    return html`${this._configElement}`;
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
                        indeterminate
                        class="center margin-bot"
                      ></ha-circular-progress>
                    `
                  : this.renderConfigElement()}
              </div>
            `
          : html`
              <div class="yaml-editor">
                <ha-code-editor
                  mode="yaml"
                  autofocus
                  autocomplete-entities
                  autocomplete-icons
                  .hass=${this.hass}
                  .value=${this.yaml}
                  .error=${Boolean(this._errors)}
                  @value-changed=${this._handleYAMLChanged}
                  @keydown=${this._ignoreKeydown}
                  dir="ltr"
                ></ha-code-editor>
              </div>
            `}
        ${this._guiSupported === false && this._loading === false
          ? html`
              <ha-alert
                alert-type="info"
                .title=${this.hass.localize(
                  "ui.errors.config.visual_editor_not_supported"
                )}
              >
                ${this.hass.localize(
                  "ui.errors.config.visual_editor_not_supported_reason_type"
                )}
                <br />
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>
            `
          : nothing}
        ${this.hasError
          ? html`
              <ha-alert
                alert-type="error"
                .title=${this.hass.localize(
                  "ui.errors.config.configuration_error"
                )}
              >
                <ul>
                  ${this._errors!.map((error) => html`<li>${error}</li>`)}
                </ul>
              </ha-alert>
            `
          : nothing}
        ${this.hasWarning
          ? html`
              <ha-alert
                alert-type="warning"
                .title=${this.hass.localize(
                  "ui.errors.config.visual_editor_not_supported"
                )}
              >
                <ul>
                  ${this._warnings!.map((warning) => html`<li>${warning}</li>`)}
                </ul>
                ${this.hass.localize("ui.errors.config.edit_in_yaml_supported")}
              </ha-alert>
            `
          : nothing}
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
    if (this._configElement && changedProperties.has("context")) {
      this._configElement.context = this.context;
    }
  }

  private _handleUIConfigChanged(ev: UIConfigChangedEvent<T>) {
    ev.stopPropagation();
    const config = ev.detail.config;
    Object.keys(config).forEach((key) => {
      if (config[key] === undefined) {
        delete config[key];
      }
    });
    this.value = config as unknown as T;
  }

  private _handleYAMLChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newYaml = ev.detail.value;
    if (newYaml !== this.yaml) {
      this.yaml = newYaml;
    }
  }

  protected async unloadConfigElement(): Promise<void> {
    this._configElement = undefined;
    this._guiSupported = undefined;
  }

  protected async loadConfigElement(): Promise<void> {
    if (this._configElement) return;

    let configElement = await this.getConfigElement();

    if (!configElement) {
      const form = await this.getConfigForm();
      if (form) {
        await import("./config-elements/hui-form-editor");
        configElement = document.createElement("hui-form-editor");
        const { schema, assertConfig, computeLabel, computeHelper } = form;
        (configElement as HuiFormEditor).schema = schema;
        if (computeLabel) {
          (configElement as HuiFormEditor).computeLabel = computeLabel;
        }
        if (computeHelper) {
          (configElement as HuiFormEditor).computeHelper = computeHelper;
        }
        if (assertConfig) {
          (configElement as HuiFormEditor).assertConfig = assertConfig;
        }
      }
    }

    if (configElement) {
      configElement.hass = this.hass;
      if ("lovelace" in configElement) {
        configElement.lovelace = this.lovelace;
      }
      configElement.context = this.context;
      configElement.addEventListener("config-changed", (ev) =>
        this._handleUIConfigChanged(ev as UIConfigChangedEvent<T>)
      );
      this._guiSupported = true;
    } else {
      this._guiSupported = false;
    }

    this._configElement = configElement;
  }

  private async _updateConfigElement(): Promise<void> {
    if (!this.value) {
      return;
    }

    try {
      this._errors = undefined;
      this._warnings = undefined;

      await this.loadConfigElement();

      if (this._configElement) {
        // Setup GUI editor and check that it can handle the current config
        try {
          this._configElement.setConfig(this.value);
        } catch (err: any) {
          const msgs = handleStructError(this.hass, err);
          throw new GUISupportError(
            "Config is not supported",
            msgs.warnings,
            msgs.errors
          );
        }
      } else {
        this._guiSupported = false;
        this.GUImode = false;
      }
    } catch (err: any) {
      if (err instanceof GUISupportError) {
        this._warnings = err.warnings ?? [err.message];
        this._errors = err.errors || undefined;
      } else {
        this._errors = [err.message];
      }
      this.GUImode = false;
    } finally {
      this._loading = false;
    }
  }

  private _ignoreKeydown(ev: KeyboardEvent) {
    ev.stopPropagation();
  }

  static get styles(): CSSResultGroup {
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
      ha-code-editor {
        --code-mirror-max-height: calc(100vh - 245px);
      }
      ha-circular-progress {
        display: block;
        margin: auto;
      }
    `;
  }
}
