import "@material/mwc-button/mwc-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { fireEvent } from "../../../src/common/dom/fire_event";
import "../../../src/components/ha-icon-input";
import "../../../src/components/ha-switch";
import { showConfirmationDialog } from "../../../src/dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../src/resources/styles";
import type { HomeAssistant } from "../../../src/types";

@customElement("hassio-repository-editor")
export class HassioRepositoryEditor extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() private _options: string[] = [];

  @query("#option_input") private _optionInput?: PaperInputElement;

  @property() private _opened = false;

  @property() private _platform?: string;

  @property() private _error?: string;

  @property() private _submitting = false;

  @query(".form") private _form?: HTMLDivElement;

  public async showDialog(): Promise<void> {
    this._platform = undefined;
    this._item = undefined;
    this._opened = true;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._opened = false;
    this._error = "";
  }

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        .open=${this._opened}
        @closing=${this.closeDialog}
        class=${classMap({ "button-left": !this._platform })}
        scrimClickAction
        escapeKeyAction
        heading="Manage Add-on repositories"
      >
        <div class="form">
          Repositories:
          ${this._options.length
            ? this._options.map((option, index) => {
                return html`
                  <paper-item class="option">
                    <paper-item-body> ${option} </paper-item-body>
                    <paper-icon-button
                      .index=${index}
                      title="Remove"
                      @click=${this._removeOption}
                      icon="hassio:delete"
                    ></paper-icon-button>
                  </paper-item>
                `;
              })
            : html`
                <paper-item>
                  No repositories
                </paper-item>
              `}
          <div class="layout horizontal bottom">
            <paper-input
              class="flex-auto"
              id="repository_input"
              label="Add repository"
              @keydown=${this._handleKeyAdd}
            ></paper-input>
            <mwc-button @click=${this._addOption}>Add</mwc-button>
          </div>
        </div>
        <mwc-button
          slot="primaryAction"
          @click="${this._createItem}"
          .disabled=${this._submitting}
        >
          ${this.hass!.localize("ui.panel.config.helpers.dialog.create")}
        </mwc-button>
        <mwc-button
          slot="secondaryAction"
          @click="${this._goBack}"
          .disabled=${this._submitting}
        >
          Back
        </mwc-button>

        <mwc-button slot="primaryAction" @click="${this.closeDialog}">
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _platformPicked(ev: Event): void {
    this._platform = (ev.currentTarget! as any).platform;
    this._focusForm();
  }

  private async _focusForm(): Promise<void> {
    await this.updateComplete;
    (this._form?.lastElementChild as HTMLElement).focus();
  }

  private _goBack() {
    this._platform = undefined;
    this._item = undefined;
    this._error = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog.button-left {
          --justify-action-buttons: flex-start;
        }
        paper-icon-item {
          cursor: pointer;
        }
        .form {
          color: var(--primary-text-color);
        }
        .option {
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          margin-top: 4px;
        }
        mwc-button {
          margin-left: 8px;
        }
        ha-paper-dropdown-menu {
          display: block;
        }
      `,
    ];
  }

  public focus() {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  private _handleKeyAdd(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.keyCode !== 13) {
      return;
    }
    this._addOption();
  }

  private _addOption() {
    const input = this._optionInput;
    if (!input || !input.value) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: { ...this._item, options: [...this._options, input.value] },
    });
    input.value = "";
  }

  private async _removeOption(ev: Event) {
    if (
      !(await showConfirmationDialog(this, {
        title: "Delete this item?",
        text: "Are you sure you want to delete this item?",
      }))
    ) {
      return;
    }
    const index = (ev.target as any).index;
    const options = [...this._options];
    options.splice(index, 1);
    fireEvent(this, "value-changed", {
      value: { ...this._item, options },
    });
  }

  private _valueChanged(ev: CustomEvent) {
    if (!this.new && !this._item) {
      return;
    }
    ev.stopPropagation();
    const configValue = (ev.target as any).configValue;
    const value = ev.detail.value;
    if (this[`_${configValue}`] === value) {
      return;
    }
    const newValue = { ...this._item };
    if (!value) {
      delete newValue[configValue];
    } else {
      newValue[configValue] = ev.detail.value;
    }
    fireEvent(this, "value-changed", {
      value: newValue,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-repository-editor": HassioRepositoryEditor;
  }
}
