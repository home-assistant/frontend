import {
  LitElement,
  html,
  css,
  CSSResult,
  TemplateResult,
  property,
  customElement,
  query,
} from "lit-element";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-spinner/paper-spinner";
import "@material/mwc-button";

import "../../../../components/dialog/ha-paper-dialog";
import "./ha-thingtalk-placeholders";
import { ThingtalkDialogParams } from "../show-dialog-thingtalk";
import { PolymerChangedEvent } from "../../../../polymer-types";
import { haStyleDialog, haStyle } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
// tslint:disable-next-line
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { AutomationConfig } from "../../../../data/automation";
// tslint:disable-next-line
import { PlaceholderValues } from "./ha-thingtalk-placeholders";
import { convertThingTalk } from "../../../../data/cloud";

export interface Placeholder {
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
  @property() public hass!: HomeAssistant;
  @property() private _error?: string;
  @property() private _params?: ThingtalkDialogParams;
  @property() private _submitting: boolean = false;
  @property() private _opened = false;
  @property() private _placeholders?: PlaceholderContainer;

  @query("#input") private _input?: PaperInputElement;

  private _value!: string;
  private _config!: Partial<AutomationConfig>;

  public showDialog(params: ThingtalkDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._opened = true;
  }

  protected render(): TemplateResult | void {
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
        <h2>Create a new automation</h2>
        <paper-dialog-scrollable>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          Type below what this automation should do, and we will try to convert
          it into a Home Assistant automation. (only English is supported for
          now)<br /><br />
          For example:
          <ul @click=${this._handleExampleClick}>
            <li>
              <button class="link">
                Turn the lights on when I come home and the sun is set
              </button>
            </li>
            <li>
              <button class="link">
                Set the thermostat to 15 degrees when I leave the house
              </button>
            </li>
          </ul>
          <paper-input
            id="input"
            label="What should this automation do?"
            autofocus
            @keyup=${this._handleKeyUp}
          ></paper-input>
          <a
            href="https://almond.stanford.edu/"
            target="_blank"
            class="attribution"
            >Powered by Almond</a
          >
        </paper-dialog-scrollable>
        <div class="paper-dialog-buttons">
          <mwc-button class="left" @click="${this._skip}">
            Skip
          </mwc-button>
          <mwc-button @click="${this._generate}" .disabled=${this._submitting}>
            <paper-spinner
              ?active="${this._submitting}"
              alt="Creating your automation..."
            ></paper-spinner>
            Create automation
          </mwc-button>
        </div>
      </ha-paper-dialog>
    `;
  }

  private async _generate() {
    this._value = this._input!.value as string;
    if (!this._value) {
      this._error = "Enter a command or tap skip.";
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

    if (Object.keys(placeholders).length) {
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
        Object.entries(placeholder).forEach(([field, value]) => {
          this._config[type][index][field] = value;
        });
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
        mwc-button paper-spinner {
          width: 14px;
          height: 14px;
          margin-right: 20px;
        }
        paper-spinner {
          display: none;
        }
        paper-spinner[active] {
          display: block;
        }
        .error {
          color: var(--google-red-500);
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
