import {
  html,
  css,
  LitElement,
  TemplateResult,
  CSSResult,
  customElement,
  property,
} from "lit-element";

import { safeDump, safeLoad } from "js-yaml";

import "@material/mwc-button";
import { HomeAssistant } from "../../../../types";
import { LovelaceCardConfig } from "../../../../data/lovelace";
import { LovelaceCardEditor } from "../../types";
import { getCardElementTag } from "../../common/get-card-element-tag";
import { computeRTL } from "../../../../common/util/compute_rtl";

import "../../../../components/ha-code-editor";
// This is not a duplicate import, one is for types, one is for element.
// tslint:disable-next-line
import { HaCodeEditor } from "../../../../components/ha-code-editor";
import { fireEvent } from "../../../../common/dom/fire_event";
import { EntityConfig } from "../../entity-rows/types";

declare global {
  interface HASSDomEvents {
    "entities-changed": {
      entities: EntityConfig[];
    };
    "config-changed": {
      config: LovelaceCardConfig;
      error?: string;
    };
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

  @property() private _yaml?: string;
  @property() private _config?: LovelaceCardConfig;
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

  public get hasError(): boolean {
    return this._error !== undefined;
  }

  private get _yamlEditor(): HaCodeEditor {
    return this.shadowRoot!.querySelector("ha-code-editor")! as HaCodeEditor;
  }

  public toggleMode() {
    this._GUImode = !this._GUImode;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._refreshYamlEditor();
  }

  protected render(): TemplateResult {
    return html`
      <div class="wrapper">
        ${this._GUImode
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
        <div class="buttons">
          <mwc-button
            @click=${this.toggleMode}
            ?disabled=${this._warning || this._error}
          >
            ${this.hass!.localize(
              this._GUImode
                ? "ui.panel.lovelace.editor.edit_card.show_code_editor"
                : "ui.panel.lovelace.editor.edit_card.show_visual_editor"
            )}
          </mwc-button>
        </div>
      </div>
    `;
  }

  protected updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has("_GUImode")) {
      if (this._GUImode === false) {
        // Refresh code editor when switching to yaml mode
        this._refreshYamlEditor(true);
      }
      fireEvent(this as HTMLElement, "iron-resize");
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

        const tag = getCardElementTag(cardType);

        // Check if the card type exists
        const elClass = customElements.get(tag);
        if (!elClass) {
          throw new Error(`Unknown card type encountered: ${cardType}.`);
        }

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
      }

      // Setup GUI editor and check that it can handle the current config
      try {
        this._configElement!.setConfig(this.value);
      } catch (err) {
        throw Error(`WARNING: ${err.message}`);
      }

      // Perform final setup
      this._configElement!.hass = this.hass;
      this._configElement!.addEventListener("config-changed", (ev) =>
        this._handleUIConfigChanged(ev as UIConfigChangedEvent)
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
      .buttons {
        text-align: right;
        padding: 8px 0px;
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
