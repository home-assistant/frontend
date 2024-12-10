import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiPlus } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textarea";
import "../../../../components/ha-textfield";
import "../../../../components/ha-labels-picker";
import "../../category/ha-category-picker";
import "../../../../components/ha-expansion-panel";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-assist-chip";

import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type {
  AutomationRenameDialogParams,
  ScriptRenameDialogParams,
} from "./show-dialog-automation-rename";

@customElement("ha-dialog-automation-rename")
class DialogAutomationRename extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _error?: string;

  @state() private _category?: string;

  @state() private _labels?: string[];

  @state() private _visibleOptionals: string[] = [];

  private _params!: AutomationRenameDialogParams | ScriptRenameDialogParams;

  private _newName?: string;

  private _newIcon?: string;

  private _newDescription?: string;

  public showDialog(
    params: AutomationRenameDialogParams | ScriptRenameDialogParams
  ): void {
    this._opened = true;
    this._params = params;
    this._newIcon = "icon" in params.config ? params.config.icon : undefined;
    this._newName =
      params.config.alias ||
      this.hass.localize(
        `ui.panel.config.${this._params.domain}.editor.default_name`
      );
    this._newDescription = params.config.description || "";
    this._labels = params.labels || [];
    this._category = params.category || "";

    this._visibleOptionals = [
      this._newDescription! ? "description" : "",
      this._category! ? "category" : "",
      this._labels.length > 0 ? "labels" : "",
    ];
  }

  public closeDialog(): void {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._visibleOptionals = [];
  }

  protected _renderOptionalChip(id: string, label: string) {
    if (this._visibleOptionals.includes(id)) {
      return nothing;
    }

    return html`
      <ha-assist-chip id=${id} @click=${this._addOptional} label=${label}>
        <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
      </ha-assist-chip>
    `;
  }

  protected render() {
    if (!this._opened) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            this._params.config.alias
              ? "ui.panel.config.automation.editor.rename"
              : "ui.panel.config.automation.editor.save"
          )
        )}
      >
        ${this._error
          ? html`<ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.config.automation.editor.missing_name"
              )}</ha-alert
            >`
          : ""}
        <ha-textfield
          dialogInitialFocus
          .value=${this._newName}
          .placeholder=${this.hass.localize(
            `ui.panel.config.${this._params.domain}.editor.default_name`
          )}
          .label=${this.hass.localize(
            "ui.panel.config.automation.editor.alias"
          )}
          required
          type="string"
          @input=${this._valueChanged}
        ></ha-textfield>

        ${this._params.domain === "script"
          ? html`
              <ha-icon-picker
                .hass=${this.hass}
                .label=${this.hass.localize(
                  "ui.panel.config.automation.editor.icon"
                )}
                .value=${this._newIcon}
                @value-changed=${this._iconChanged}
              >
                <ha-domain-icon
                  slot="fallback"
                  domain=${this._params.domain}
                  .hass=${this.hass}
                >
                </ha-domain-icon>
              </ha-icon-picker>
            `
          : nothing}
        ${this._visibleOptionals.includes("description")
          ? html` <ha-textarea
              .label=${this.hass.localize(
                "ui.panel.config.automation.editor.description.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.config.automation.editor.description.placeholder"
              )}
              name="description"
              autogrow
              .value=${this._newDescription}
              @input=${this._valueChanged}
            ></ha-textarea>`
          : nothing}
        ${this._visibleOptionals.includes("category")
          ? html` <ha-category-picker
              .hass=${this.hass}
              .scope=${this._params.domain}
              .value=${this._category}
              @value-changed=${this._categoryChanged}
            ></ha-category-picker>`
          : nothing}
        ${this._visibleOptionals.includes("labels")
          ? html` <ha-labels-picker
              .hass=${this.hass}
              .value=${this._labels}
              @value-changed=${this._labelsChanged}
            ></ha-labels-picker>`
          : nothing}

        <ha-chip-set>
          ${this._renderOptionalChip(
            "description",
            this.hass.localize(
              "ui.panel.config.automation.editor.dialog.add_description"
            )
          )}
          ${this._renderOptionalChip(
            "category",
            this.hass.localize(
              "ui.panel.config.automation.editor.dialog.add_category"
            )
          )}
          ${this._renderOptionalChip(
            "labels",
            this.hass.localize(
              "ui.panel.config.automation.editor.dialog.add_labels"
            )
          )}
        </ha-chip-set>

        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass.localize("ui.dialogs.generic.cancel")}
        </mwc-button>
        <mwc-button @click=${this._save} slot="primaryAction">
          ${this.hass.localize(
            this._params.config.alias
              ? "ui.panel.config.automation.editor.rename"
              : "ui.panel.config.automation.editor.save"
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _addOptional(ev) {
    const option: string = ev.target.id;
    this._visibleOptionals = [...this._visibleOptionals, option];
  }

  private _categoryChanged(ev: CustomEvent): void {
    this._category = ev.detail.value;
  }

  private _labelsChanged(ev: CustomEvent) {
    this._labels = ev.detail.value;
  }

  private _iconChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._newIcon = ev.detail.value || undefined;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    if (target.name === "description") {
      this._newDescription = target.value;
    } else {
      this._newName = target.value;
    }
  }

  private _save(): void {
    if (!this._newName) {
      this._error = "Name is required";
      return;
    }
    if (this._params.domain === "script") {
      this._params.updateConfig(
        {
          ...this._params.config,
          alias: this._newName,
          description: this._newDescription,
          icon: this._newIcon,
        },
        this._category,
        this._labels
      );
    } else {
      this._params.updateConfig(
        {
          ...this._params.config,
          alias: this._newName,
          description: this._newDescription,
        },
        this._category,
        this._labels
      );
    }

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-textfield,
        ha-textarea,
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-chip-set {
          display: block;
        }
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-chip-set {
          margin-top: 16px;
        }
        ha-alert {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-automation-rename": DialogAutomationRename;
  }
}
