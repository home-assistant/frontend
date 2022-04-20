import "@material/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-textfield";
import type { HaTextField } from "../../../../components/ha-textfield";
import type { AutomationConfig } from "../../../../data/automation";
import { convertThingTalk } from "../../../../data/cloud";
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

  @state() private _error?: string;

  @state() private _params?: ThingtalkDialogParams;

  @state() private _submitting = false;

  @state() private _placeholders?: PlaceholderContainer;

  @query("#input") private _input?: HaTextField;

  private _value?: string;

  private _config!: Partial<AutomationConfig>;

  public async showDialog(params: ThingtalkDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    if (params.input) {
      this._value = params.input;
      await this.updateComplete;
      this._generate();
    }
  }

  public closeDialog() {
    this._placeholders = undefined;
    this._params = undefined;
    if (this._input) {
      this._input.value = "";
    }
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeInitDialog() {
    if (this._placeholders) {
      return;
    }
    this.closeDialog();
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
          .skip=${this._skip}
          @closed=${this.closeDialog}
          @placeholders-filled=${this._handlePlaceholders}
        >
        </ha-thingtalk-placeholders>
      `;
    }
    return html`
      <ha-dialog
        open
        @closed=${this.closeInitDialog}
        .heading=${this.hass.localize(
          `ui.panel.config.automation.thingtalk.task_selection.header`
        )}
      >
        <div>
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
          <ha-textfield
            id="input"
            label="What should this automation do?"
            .value=${this._value}
            autofocus
            @keyup=${this._handleKeyUp}
          ></ha-textfield>
          <a
            href="https://almond.stanford.edu/"
            target="_blank"
            rel="noreferrer"
            class="attribution"
            >Powered by Almond</a
          >
        </div>
        <mwc-button class="left" @click=${this._skip} slot="secondaryAction">
          ${this.hass.localize(`ui.common.skip`)}
        </mwc-button>
        <mwc-button
          @click=${this._generate}
          .disabled=${this._submitting}
          slot="primaryAction"
        >
          ${this._submitting
            ? html`<ha-circular-progress
                active
                size="small"
                title="Creating your automation..."
              ></ha-circular-progress>`
            : ""}
          ${this.hass.localize(`ui.panel.config.automation.thingtalk.create`)}
        </mwc-button>
      </ha-dialog>
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
    } catch (err: any) {
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
    this.closeDialog();
  }

  private _skip = () => {
    this._params!.callback(undefined);
    this.closeDialog();
  };

  private _handleKeyUp(ev: KeyboardEvent) {
    if (ev.keyCode === 13) {
      this._generate();
    }
  }

  private _handleExampleClick(ev: Event) {
    this._input!.value = (ev.target as HTMLAnchorElement).innerText;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
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
