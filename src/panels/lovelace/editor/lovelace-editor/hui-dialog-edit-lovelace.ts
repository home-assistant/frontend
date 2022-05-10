import "@material/mwc-button";
import { CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import "../../../../components/ha-circular-progress";
import "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import { HaFormSchema } from "../../../../components/ha-form/types";
import { CoreFrontendUserData } from "../../../../data/frontend";
import {
  LovelaceConfig,
  LovelaceDashboard,
  LovelaceDashboardMutableParams,
  updateDashboard,
} from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { LovelaceDashboardDetailsDialogParams } from "../../../config/lovelace/dashboards/show-dialog-lovelace-dashboard-detail";
import type { Lovelace } from "../../types";
import "./hui-lovelace-editor";

@customElement("hui-dialog-edit-lovelace")
export class HuiDialogEditLovelace extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _lovelace?: Lovelace;

  @state() private _config?: LovelaceConfig;

  @state() private _params?: LovelaceDashboardDetailsDialogParams;

  @state() private _urlPathChanged = false;

  @state() private _data?: Partial<LovelaceDashboard>;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  public showDialog(lovelace: Lovelace): void {
    this._lovelace = lovelace;
    const { views, ...lovelaceConfig } = this._lovelace!.config;
    this._config = lovelaceConfig as LovelaceConfig;
  }

  public closeDialog(): void {
    this._config = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    return html`
      <ha-dialog
        open
        .heading=${this.hass!.localize(
          "ui.panel.lovelace.editor.edit_lovelace.header"
        )}
      >
        <div>
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_lovelace.explanation"
          )}
          <hui-lovelace-editor
            .hass=${this.hass}
            .config=${this._config}
            @lovelace-config-changed=${this._ConfigChanged}
            dialogInitialFocus
          ></hui-lovelace-editor>

          <ha-form
            .schema=${this._schema(this._params, this.hass!.userData)}
            .data=${this._data}
            .hass=${this.hass}
            .error=${this._error}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <mwc-button @click=${this.closeDialog} slot="secondaryAction">
          ${this.hass!.localize("ui.common.cancel")}
        </mwc-button>
        <mwc-button
          .disabled=${!this._config || this._submitting}
          @click=${this._save}
          slot="primaryAction"
        >
          ${this._submitting
            ? html`<ha-circular-progress
                active
                size="small"
                title="Saving"
              ></ha-circular-progress>`
            : ""}
          ${this.hass!.localize("ui.common.save")}</mwc-button
        >
      </ha-dialog>
    `;
  }

  private async _save(): Promise<void> {
    if (!this._config) {
      return;
    }
    if (!this._isConfigChanged()) {
      this.closeDialog();
      return;
    }

    this._submitting = true;
    const lovelace = this._lovelace!;

    const config: LovelaceConfig = {
      ...lovelace.config,
      ...this._config,
    };

    try {
      await lovelace.saveConfig(config);
      this.closeDialog();
    } catch (err: any) {
      alert(`Saving failed: ${err.message}`);
    } finally {
      this._submitting = false;
    }
  }

  private _ConfigChanged(ev: CustomEvent): void {
    if (ev.detail && ev.detail.config) {
      this._config = ev.detail.config;
    }
  }

  private _isConfigChanged(): boolean {
    const { views, ...lovelaceConfig } = this._lovelace!.config;
    return JSON.stringify(this._config) !== JSON.stringify(lovelaceConfig);
  }

  private _schema = memoizeOne(
    (
      params: LovelaceDashboardDetailsDialogParams,
      userData: CoreFrontendUserData | null | undefined
    ) =>
      [
        {
          name: "title",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "icon",
          required: true,
          selector: {
            icon: {},
          },
        },
        !params.dashboard &&
          userData?.showAdvanced && {
            name: "url_path",
            required: true,
            selector: { text: {} },
          },
        {
          name: "require_admin",
          required: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "show_in_sidebar",
          required: true,
          selector: {
            boolean: {},
          },
        },
        {
          name: "hide_header",
          required: true,
          selector: {
            boolean: {},
          },
        },
      ].filter(Boolean)
  );

  private _computeLabel = (entry: HaFormSchema): string =>
    this.hass!.localize(
      `ui.panel.config.lovelace.dashboards.detail.${
        entry.name === "show_in_sidebar"
          ? "show_sidebar"
          : entry.name === "url_path"
          ? "url"
          : entry.name
      }`
    );

  private _valueChanged(ev: CustomEvent) {
    this._error = undefined;
    const value = ev.detail.value;
    if (value.url_path !== this._data?.url_path) {
      this._urlPathChanged = true;
      if (
        !value.url_path ||
        value.url_path === "lovelace" ||
        !/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/.test(value.url_path)
      ) {
        this._error = {
          url_path: this.hass!.localize(
            "ui.panel.config.lovelace.dashboards.detail.url_error_msg"
          ),
        };
      }
    }
    if (value.title !== this._data?.title) {
      this._data = value;
      this._fillUrlPath(value.title);
    } else {
      this._data = value;
    }
  }

  private _fillUrlPath(title: string) {
    if ((this.hass!.userData?.showAdvanced && this._urlPathChanged) || !title) {
      return;
    }

    const slugifyTitle = slugify(title, "-");
    this._data = {
      ...this._data,
      url_path: slugifyTitle.includes("-")
        ? slugifyTitle
        : `lovelace-${slugifyTitle}`,
    };
  }

  private async _updateDashboard() {
    if (this._params?.urlPath && !this._params.dashboard?.id) {
      this.closeDialog();
    }
    this._submitting = true;
    try {
      const values: Partial<LovelaceDashboardMutableParams> = {
        require_admin: this._data!.require_admin,
        show_in_sidebar: this._data!.show_in_sidebar,
        icon: this._data!.icon || undefined,
        title: this._data!.title,
        hide_header: this._data!.hide_header || false,
      };
      await updateDashboard(this.hass!, "", values);

      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err?.message || "Unknown error" };
    } finally {
      this._submitting = false;
    }
  }

  static styles: CSSResultGroup = haStyleDialog;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-lovelace": HuiDialogEditLovelace;
  }
}
