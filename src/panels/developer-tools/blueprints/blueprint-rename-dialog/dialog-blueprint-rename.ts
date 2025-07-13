import "@material/mwc-button";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiClose, mdiPlus } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-domain-icon";
import "../../../../components/ha-icon-picker";
import "../../../../components/ha-textarea";
import "../../../../components/ha-textfield";
import "../../../../components/ha-labels-picker";
import "../../../config/category/ha-category-picker";
import "../../../../components/ha-expansion-panel";
import "../../../../components/chips/ha-chip-set";
import "../../../../components/chips/ha-assist-chip";
import "../../../../components/ha-area-picker";

import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { RenameDialogParams } from "./show-dialog-blueprint-rename";

@customElement("ha-dialog-blueprint-rename")
class DialogBlueprintRename extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _error?: string;

  @state() private _visibleOptionals: string[] = [];

  private _params!: RenameDialogParams;

  private _newPath!: string;

  private _newName!: string;

  private _newDescription!: string;

  private _newAuthor!: string;

  private _newMinimumVersion!: string;

  public showDialog(params: RenameDialogParams): void {
    this._opened = true;
    this._params = params;
    this._newPath = params.path || "";
    this._newName =
      params.blueprint.metadata.name ||
      this.hass.localize(
        `ui.panel.developer-tools.tabs.blueprints.editor.default_name`
      );
    this._newDescription = params.blueprint.metadata.description || "";
    this._newAuthor = params.blueprint.metadata.author || "";
    this._newMinimumVersion =
      params.blueprint.metadata.homeassistant?.min_version || "";

    this._visibleOptionals = [
      this._newDescription ? "description" : "",
      this._newAuthor ? "author" : "",
      this._newMinimumVersion ? "minimumVersion" : "",
    ];
  }

  public closeDialog(): boolean {
    this._params.onClose();

    if (this._opened) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._opened = false;
    this._visibleOptionals = [];
    return true;
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
        .heading=${this.hass.localize(
          this._params.blueprint.alias
            ? "ui.panel.developer-tools.tabs.blueprints.editor.rename"
            : "ui.panel.developer-tools.tabs.blueprints.editor.save"
        )}
      >
        <ha-dialog-header slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <span slot="title"
            >${this.hass.localize(
              this._params.blueprint.alias
                ? "ui.panel.developer-tools.tabs.blueprints.editor.rename"
                : "ui.panel.developer-tools.tabs.blueprints.editor.save"
            )}</span
          >
        </ha-dialog-header>
        ${this._error
          ? html` <ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.missing_path"
              )}
            </ha-alert>`
          : ""}
        <ha-textfield
          dialogInitialFocus
          .value=${this._newPath}
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.blueprints.editor.path"
          )}
          name="path"
          required
          type="string"
          @input=${this._valueChanged}
        ></ha-textfield>
        ${this._error
          ? html` <ha-alert alert-type="error"
              >${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.missing_name"
              )}
            </ha-alert>`
          : ""}
        <ha-textfield
          .value=${this._newName}
          .placeholder=${this.hass.localize(
            `ui.panel.developer-tools.tabs.blueprints.editor.default_name`
          )}
          .label=${this.hass.localize(
            "ui.panel.developer-tools.tabs.blueprints.editor.name"
          )}
          name="name"
          required
          type="string"
          @input=${this._valueChanged}
        ></ha-textfield>

        ${this._visibleOptionals.includes("description")
          ? html` <ha-textarea
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.description.label"
              )}
              name="description"
              autogrow
              .value=${this._newDescription}
              @input=${this._valueChanged}
            ></ha-textarea>`
          : nothing}
        ${this._visibleOptionals.includes("author")
          ? html` <ha-textfield
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.author.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.author.placeholder"
              )}
              name="author"
              autogrow
              .value=${this._newAuthor}
              @input=${this._valueChanged}
            ></ha-textfield>`
          : nothing}
        ${this._visibleOptionals.includes("minimumVersion")
          ? html` <ha-textfield
              .label=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.minimum_version.label"
              )}
              .placeholder=${this.hass.localize(
                "ui.panel.developer-tools.tabs.blueprints.editor.minimum_version.placeholder"
              )}
              name="minimumVersion"
              autogrow
              .value=${this._newMinimumVersion}
              @input=${this._valueChanged}
            ></ha-textfield>`
          : nothing}

        <ha-chip-set>
          ${this._renderOptionalChip(
            "description",
            this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.dialog.add_description"
            )
          )}
          ${this._renderOptionalChip(
            "author",
            this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.dialog.add_author"
            )
          )}
          ${this._renderOptionalChip(
            "minimumVersion",
            this.hass.localize(
              "ui.panel.developer-tools.tabs.blueprints.editor.dialog.add_minimum_version"
            )
          )}
        </ha-chip-set>

        <div slot="primaryAction">
          <mwc-button @click=${this.closeDialog}>
            ${this.hass.localize("ui.common.cancel")}
          </mwc-button>
          <mwc-button @click=${this._save}>
            ${this.hass.localize(
              this._params.blueprint.metadata.name
                ? "ui.panel.developer-tools.tabs.blueprints.editor.rename"
                : "ui.panel.developer-tools.tabs.blueprints.editor.save"
            )}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _addOptional(ev) {
    ev.stopPropagation();
    const option: string = ev.target.id;
    this._visibleOptionals = [...this._visibleOptionals, option];
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const target = ev.target as any;
    switch (target.name) {
      case "path":
        this._newPath = target.value;
        break;
      case "name":
        this._newName = target.value;
        break;
      case "description":
        this._newDescription = target.value;
        break;
      case "author":
        this._newAuthor = target.value;
        break;
      case "minimumVersion":
        this._newMinimumVersion = target.value;
        break;
    }
  }

  private _save(): void {
    if (!this._newName) {
      this._error = "Name is required";
      return;
    }

    this._params.updateBlueprint({
      ...this._params.blueprint,
      metadata: {
        ...this._params.blueprint.metadata,
        name: this._newName,
        description: this._newDescription || undefined,
        author: this._newAuthor || undefined,
        homeassistant: this._newMinimumVersion
          ? {
              min_version: this._newMinimumVersion,
            }
          : undefined,
      },
    });
    this._params.updatePath(this._newPath);

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0 24px 24px 24px;
        }

        @media all and (min-width: 500px) {
          ha-dialog {
            --mdc-dialog-min-width: min(500px, 95vw);
            --mdc-dialog-max-width: min(500px, 95vw);
          }
        }

        ha-textfield,
        ha-textarea,
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-area-picker {
          display: block;
        }
        ha-icon-picker,
        ha-category-picker,
        ha-labels-picker,
        ha-area-picker,
        ha-chip-set,
        ha-textfield {
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
    "ha-dialog-blueprint-rename": DialogBlueprintRename;
  }
}
