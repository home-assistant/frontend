import { mdiDotsVertical, mdiRestart } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-svg-icon";
import "../../../../components/ha-dialog";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { PanelMutableParams } from "../../../../data/panel";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { PanelDetailDialogParams } from "./show-dialog-panel-detail";

interface PanelDetailData {
  title: string;
  icon?: string;
  require_admin: boolean;
  show_in_sidebar: boolean;
}

@customElement("dialog-panel-detail")
export class DialogPanelDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: PanelDetailDialogParams;

  @state() private _data?: PanelDetailData;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @state() private _open = false;

  public showDialog(params: PanelDetailDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._data = {
      title: params.title,
      icon: params.icon,
      require_admin: params.requireAdmin,
      show_in_sidebar: params.showInSidebar,
    };
    this._open = true;
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    const titleInvalid = !this._data.title || !this._data.title.trim();

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        prevent-scrim-close
        header-title=${this.hass.localize(
          "ui.panel.config.lovelace.dashboards.panel_detail.edit_panel"
        )}
        @closed=${this._dialogClosed}
      >
        <ha-dropdown slot="headerActionItems" placement="bottom-end">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item @click=${this._resetPanel}>
            <ha-svg-icon slot="icon" .path=${mdiRestart}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.lovelace.dashboards.panel_detail.reset_to_default"
            )}
          </ha-dropdown-item>
        </ha-dropdown>
        <ha-form
          autofocus
          .schema=${this._schema(
            this._params.isDefault,
            this._data.require_admin
          )}
          .data=${this._data}
          .hass=${this.hass}
          .error=${this._error}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            @click=${this._updatePanel}
            .disabled=${titleInvalid || this._submitting}
          >
            ${this.hass.localize(
              "ui.panel.config.lovelace.dashboards.detail.update"
            )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _schema = memoizeOne(
    (isDefault: boolean, requireAdmin: boolean) =>
      [
        {
          name: "title",
          required: true,
          selector: { text: {} },
        },
        {
          name: "icon",
          required: false,
          selector: { icon: {} },
        },
        {
          name: "require_admin",
          required: true,
          disabled: isDefault && !requireAdmin,
          selector: { boolean: {} },
        },
        {
          name: "show_in_sidebar",
          required: true,
          selector: { boolean: {} },
        },
      ] as const
  );

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.lovelace.dashboards.panel_detail.${entry.name}`
    );

  private _computeHelper = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    entry.name === "require_admin" && entry.disabled
      ? this.hass.localize(
          "ui.panel.config.lovelace.dashboards.panel_detail.require_admin_helper"
        )
      : "";

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    this._data = ev.detail.value;
  }

  private async _handleError(err: any) {
    let localizedErrorMessage: string | undefined;
    if (err?.translation_domain && err?.translation_key) {
      const localize = await this.hass.loadBackendTranslation(
        "exceptions",
        err.translation_domain
      );
      localizedErrorMessage = localize(
        `component.${err.translation_domain}.exceptions.${err.translation_key}.message`,
        err.translation_placeholders
      );
    }
    this._error = {
      base: localizedErrorMessage || err?.message || "Unknown error",
    };
  }

  private async _resetPanel() {
    this._submitting = true;
    try {
      await this._params!.updatePanel({
        title: null,
        icon: null,
        require_admin: null,
        show_in_sidebar: null,
      });
      this.closeDialog();
    } catch (err: any) {
      this._handleError(err);
    } finally {
      this._submitting = false;
    }
  }

  private async _updatePanel() {
    this._submitting = true;
    try {
      const updates: PanelMutableParams = {};

      if (this._data!.title !== this._params!.title) {
        updates.title = this._data!.title;
      }
      if ((this._data!.icon || undefined) !== this._params!.icon) {
        updates.icon = this._data!.icon || null;
      }
      if (this._data!.require_admin !== this._params!.requireAdmin) {
        updates.require_admin = this._data!.require_admin;
      }
      if (this._data!.show_in_sidebar !== this._params!.showInSidebar) {
        updates.show_in_sidebar = this._data!.show_in_sidebar;
      }

      if (Object.keys(updates).length > 0) {
        await this._params!.updatePanel(updates);
      }
      this.closeDialog();
    } catch (err: any) {
      this._handleError(err);
    } finally {
      this._submitting = false;
    }
  }

  static styles = haStyleDialog;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-panel-detail": DialogPanelDetail;
  }
}
