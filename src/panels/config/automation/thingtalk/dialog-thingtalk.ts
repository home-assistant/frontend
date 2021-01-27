import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import "../../../../components/dialog/ha-paper-dialog";
import "../../../../components/ha-circular-progress";
import type { AutomationConfig } from "../../../../data/automation";
import { convertThingTalk } from "../../../../data/cloud";
import type { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./ha-thingtalk-placeholders";
import type { PlaceholderValues } from "./ha-thingtalk-placeholders";
import type { ThingtalkDialogParams } from "./show-dialog-thingtalk";

export interface Placeholder {
  name: string;
  index: number;
  fields: string[];
  domains: string[];
  device_classes?: string[];
}

export interface PlaceholderContainer {
  [key: string]: Placeholder[];
}

@customElement("ha-dialog-thinktalk")
class DialogThingtalk extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _error?: string;

  @internalProperty() private _params?: ThingtalkDialogParams;

  @internalProperty() private _submitting = false;

  @internalProperty() private _opened = false;

  @internalProperty() private _placeholders?: PlaceholderContainer;

  @query("#input") private _input?: PaperInputElement;

  private _value?: string;

  private _config!: Partial<AutomationConfig>;

  public async showDialog(params: ThingtalkDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._opened = true;
    if (params.input) {
      this._value = params.input;
      await this.updateComplete;
      this._generate();
    }
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    if (this._placeholders) {
      return html`
        <ha-thingtalk-placeholders
          .hass=${this.hass}
          .placeholders=${this._placeholders}
          .opened=${this._opened}
          .skip=${() => this._skip()}
          @opened-changed=${this._openedChanged}
          @placeholders-filled=${this._handlePlaceholders}
        >
        </ha-thingtalk-placeholders>
      `;
    }
    return html`
      <ha-paper-dialog
        with-backdrop
        .opened=${this._opened}
        @opened-changed=${this._openedChanged}
      >
        <h2>
          ${this.hass.localize(
            `ui.panel.config.automation.thingtalk.task_selection.header`
          )}
        </h2>
        <paper-dialog-scrollable>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${this.hass.localize(
            `ui.panel.config.automation.thingtalk.task_selection.introduction`
          )}<br /><br />
          ${this.hass.localize(
            `ui.panel.config.automation.thingtalk.task_selection.language_note`
          )}<br /><br />
          ${this.hass.localize(
            `ui.panel.config.automation.thingtalk.task_selection.for_example`
          )}
          <ul @click=${this._handleExampleClick}>
            <li>
              <button class="link">
                Turn off the lights when I leave home
              </button>
            </li>
            <li>
              <button class="link">
                Turn on the lights when the sun is set
              </button>
            </li>
            <li>
              <button class="link">
                Notify me if the door opens and I am not at home
              </button>
            </li>
            <li>
              <button class="link">
                Turn the light on when motion is detected
              </button>
            </li>
          </ul>
          <paper-input
            id="input"
            label="What should this automation do?"
            .value=${this._value}
            autofocus
            @keyup=${this._handleKeyUp}
          ></paper-input>
          <a
            href="https://almond.stanford.edu/"
            target="_blank"
            rel="noreferrer"
            class="attribution"
            >Powered by Almond</a
          >
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button class="left" @click="${this._skip}">
            ${this.hass.localize(`ui.common.skip`)}
          </mwc-button>
          <mwc-button @click="${this._generate}" .disabled=${this._submitting}>
            ${this._submitting
              ? html`<ha-circular-progress
                  active
                  size="small"
                  title="Creating your automation..."
                ></ha-circular-progress>`
              : ""}
            ${this.hass.localize(`ui.panel.config.automation.thingtalk.create`)}
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private async _generate() {
    this._value = this._input!.value as string;
    if (!this._value) {
      this._error = this.hass.localize(
        `ui.panel.config.automation.thingtalk.task_selection.error_empty`
      );
      return;
    }
    this._submitting = true;
    let config: Partial<AutomationConfig>;
    let placeholders: PlaceholderContainer;
    try {
      const result = await convertThingTalk(this.hass, this._value);
      config = result.config;
      placeholders = result.placeholders;
    } catch (err) {
      this._error = err.message;
      this._submitting = false;
      return;
    }

    this._submitting = false;

    if (!Object.keys(config).length) {
      this._error = this.hass.localize(
        `ui.panel.config.automation.thingtalk.task_selection.error_unsupported`
      );
    } else if (Object.keys(placeholders).length) {
      this._config = config;
      this._placeholders = placeholders;
    } else {
      this._sendConfig(this._value, config);
    }
  }

  private _handlePlaceholders(ev: CustomEvent) {
    const placeholderValues = ev.detail.value as PlaceholderValues;
    Object.entries(placeholderValues).forEach(([type, values]) => {
      Object.entries(values).forEach(([index, placeholder]) => {
        const devices = Object.values(placeholder);
        if (devices.length === 1) {
          Object.entries(devices[0]).forEach(([field, value]) => {
            this._config[type][index][field] = value;
          });
          return;
        }
        const automation = { ...this._config[type][index] };
        const newAutomations: any[] = [];
        devices.forEach((fields) => {
          const newAutomation = { ...automation };
          Object.entries(fields).forEach(([field, value]) => {
            newAutomation[field] = value;
          });
          newAutomations.push(newAutomation);
        });
        this._config[type].splice(index, 1, ...newAutomations);
      });
    });
    this._sendConfig(this._value, this._config);
  }

  private _sendConfig(input, config) {
    this._params!.callback({ alias: input, ...config });
    this._closeDialog();
  }

  private _skip() {
    this._params!.callback(undefined);
    this._closeDialog();
  }

  private _closeDialog() {
    this._placeholders = undefined;
    if (this._input) {
      this._input.value = null;
    }
    this._opened = false;
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>): void {
    if (!ev.detail.value) {
      this._closeDialog();
    }
  }

  private _handleKeyUp(ev: KeyboardEvent) {
    if (ev.keyCode === 13) {
      this._generate();
    }
  }

  private _handleExampleClick(ev: Event) {
    this._input!.value = (ev.target as HTMLAnchorElement).innerText;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-paper-dialog {
          max-width: 500px;
        }
        mwc-button.left {
          margin-right: auto;
        }
        .error {
          color: var(--error-color);
        }
        .attribution {
          color: var(--secondary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-thinktalk": DialogThingtalk;
  }
}
