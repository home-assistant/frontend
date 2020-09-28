import { safeDump, safeLoad } from "js-yaml";
import {
  css,
  CSSResult,
  customElement,
  internalProperty,
  LitElement,
  property,
  query,
} from "lit-element";
import { html, TemplateResult } from "lit-html";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeRTL } from "../../../common/util/compute_rtl";
import { deepEqual } from "../../../common/util/deep-equal";
import "../../../components/ha-circular-progress";
import "../../../components/ha-code-editor";
import type { HaCodeEditor } from "../../../components/ha-code-editor";
import { HomeAssistant } from "../../../types";
import { handleStructError } from "../common/structs/handle-errors";
import {
  DOMAIN_TO_ELEMENT_TYPE,
  getRowElementClass,
} from "../create-element/create-row-element";
import { LovelaceRowConfig } from "../entity-rows/types";
import { LovelaceRowEditor } from "../types";
import { GUISupportError } from "./gui-support-error";

export interface RowConfigChangedEvent {
  config: LovelaceRowConfig;
  error?: string;
  guiModeAvailable?: boolean;
}

declare global {
  interface HASSDomEvents {
    "row-config-changed": RowConfigChangedEvent;
  }
}

@customElement("hui-entity-row-editor")
export class HuiEntityRowEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _yaml?: string;

  @internalProperty() private _config?: LovelaceRowConfig;

  @internalProperty() private _configElement?: LovelaceRowEditor;

  @internalProperty() private _configElType?: string;

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

  public get value(): LovelaceRowConfig | undefined {
    return this._config;
  }

  public set value(config: LovelaceRowConfig | undefined) {
    if (this._config && deepEqual(config, this._config)) {
      return;
    }

    this._config = config;
    this._yaml = undefined;
    this._error = undefined;
    this._setConfig();
  }

  private _setConfig() {
    if (!this._error) {
      try {
        this._updateConfigElement();
        this._error = undefined;
      } catch (err) {
        this._error = err.message;
      }
    }
    fireEvent(this, "row-config-changed", {
      config: this.value!,
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

  protected updated(changedProperties) {
    super.updated(changedProperties);
    if (this._configElement && changedProperties.has("hass")) {
      this._configElement.hass = this.hass;
    }
  }

  private _handleUIConfigChanged(ev: HASSDomEvent<RowConfigChangedEvent>) {
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

    let rowType: string;
    if (!this.value.type && "entity" in this.value) {
      // @ts-ignore
      const domain = computeDomain(this.value.entity);
      rowType = `${
        DOMAIN_TO_ELEMENT_TYPE![domain] ||
        DOMAIN_TO_ELEMENT_TYPE!._domain_not_found
      }-entity`;
    } else {
      rowType = this.value.type!;
    }

    let configElement = this._configElement;
    try {
      this._error = undefined;
      this._warnings = undefined;

      if (this._configElType !== rowType) {
        // If the row type has changed, we need to load a new GUI editor
        if (!rowType) {
          throw new Error("No row type defined");
        }

        const elClass = await getRowElementClass(rowType);

        this._loading = true;
        // Check if a GUI editor exists
        if (elClass && elClass.getConfigElement) {
          configElement = await elClass.getConfigElement();
        } else {
          configElement = undefined;
          throw new GUISupportError(
            `No visual editor available for: ${rowType}`
          );
        }

        this._configElement = configElement;
        this._configElType = rowType;

        // Perform final setup
        this._configElement.hass = this.hass;
        this._configElement.addEventListener("row-config-changed", (ev) =>
          this._handleUIConfigChanged(ev as HASSDomEvent<RowConfigChangedEvent>)
        );
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-entity-row-editor": HuiEntityRowEditor;
  }
}
