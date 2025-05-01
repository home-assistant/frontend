import type { ActionDetail } from "@material/mwc-list";
import { mdiClose, mdiDotsVertical, mdiPlaylistEdit } from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { stopPropagation } from "../../../../common/dom/stop_propagation";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-list-item";
import "../../../../components/ha-spinner";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceViewHeaderConfig } from "../../../../data/lovelace/config/view";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "./hui-view-header-settings-editor";
import type { EditViewHeaderDialogParams } from "./show-edit-view-header-dialog";

@customElement("hui-dialog-edit-view-header")
export class HuiDialogEditViewHeader extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: EditViewHeaderDialogParams;

  @state() private _config?: LovelaceViewHeaderConfig;

  @state() private _saving = false;

  @state() private _dirty = false;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _editor?: HaYamlEditor;

  protected updated(changedProperties: PropertyValues) {
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      const config = {
        ...this._config,
      };
      this._editor?.setValue(config);
    }
  }

  public showDialog(params: EditViewHeaderDialogParams): void {
    this._params = params;

    this._dirty = false;
    this._config = this._params.config;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._config = undefined;
    this._yamlMode = false;
    this._dirty = false;
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this.hass) {
      return nothing;
    }

    let content;

    if (this._yamlMode) {
      content = html`
        <ha-yaml-editor
          .hass=${this.hass}
          dialogInitialFocus
          @value-changed=${this._viewYamlChanged}
        ></ha-yaml-editor>
      `;
    } else {
      content = html`
        <hui-view-header-settings-editor
          .hass=${this.hass}
          .config=${this._config}
          @config-changed=${this._configChanged}
        ></hui-view-header-settings-editor>
      `;
    }

    const title = this.hass.localize(
      "ui.panel.lovelace.editor.edit_view_header.header"
    );

    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        @closed=${this.closeDialog}
        .heading=${title}
        class=${classMap({
          "yaml-mode": this._yamlMode,
        })}
      >
        <ha-dialog-header show-border slot="heading">
          <ha-icon-button
            slot="navigationIcon"
            dialogAction="cancel"
            .label=${this.hass!.localize("ui.common.close")}
            .path=${mdiClose}
          ></ha-icon-button>
          <h2 slot="title">${title}</h2>
          <ha-button-menu
            slot="actionItems"
            fixed
            corner="BOTTOM_END"
            menu-corner="END"
            @action=${this._handleAction}
            @closed=${stopPropagation}
          >
            <ha-icon-button
              slot="trigger"
              .label=${this.hass!.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-list-item graphic="icon">
              ${this.hass!.localize(
                `ui.panel.lovelace.editor.edit_view_header.edit_${!this._yamlMode ? "yaml" : "ui"}`
              )}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlaylistEdit}
              ></ha-svg-icon>
            </ha-list-item>
          </ha-button-menu>
        </ha-dialog-header>
        ${content}
        <ha-button
          slot="primaryAction"
          .disabled=${!this._config || this._saving || !this._dirty}
          @click=${this._save}
        >
          ${this._saving
            ? html`<ha-spinner size="small" aria-label="Saving"></ha-spinner>`
            : nothing}
          ${this.hass!.localize("ui.common.save")}</ha-button
        >
      </ha-dialog>
    `;
  }

  private async _handleAction(ev: CustomEvent<ActionDetail>) {
    ev.stopPropagation();
    ev.preventDefault();
    switch (ev.detail.index) {
      case 0:
        this._yamlMode = !this._yamlMode;
        break;
    }
  }

  private _configChanged(ev: CustomEvent): void {
    if (
      ev.detail &&
      ev.detail.config &&
      !deepEqual(this._config, ev.detail.config)
    ) {
      this._config = ev.detail.config;
      this._dirty = true;
    }
  }

  private _viewYamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    this._config = ev.detail.value;
    this._dirty = true;
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._config) {
      return;
    }

    this._saving = true;

    try {
      await this._params.saveConfig(this._config);
      this.closeDialog();
    } catch (err: any) {
      showAlertDialog(this, {
        text: `${this.hass!.localize(
          "ui.panel.lovelace.editor.edit_view_header.saving_failed"
        )}: ${err.message}`,
      });
    } finally {
      this._saving = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          /* Set the top top of the dialog to a fixed position, so it doesnt jump when the content changes size */
          --vertical-align-dialog: flex-start;
          --dialog-surface-margin-top: 40px;
        }

        @media all and (max-width: 450px), all and (max-height: 500px) {
          /* When in fullscreen dialog should be attached to top */
          ha-dialog {
            --dialog-surface-margin-top: 0px;
          }
        }
        ha-dialog.yaml-mode {
          --dialog-content-padding: 0;
        }
        h2 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }

        @media all and (min-width: 600px) {
          ha-dialog {
            --mdc-dialog-min-width: 600px;
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-view-header": HuiDialogEditViewHeader;
  }
}
