import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { CoreFrontendUserData } from "../../../../data/frontend";
import {
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
  LovelaceDashboardMutableParams,
} from "../../../../data/lovelace";
import { DEFAULT_PANEL, setDefaultPanel } from "../../../../data/panel";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { LovelaceDashboardDetailsDialogParams } from "./show-dialog-lovelace-dashboard-detail";

@customElement("dialog-lovelace-dashboard-detail")
export class DialogLovelaceDashboardDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceDashboardDetailsDialogParams;

  @state() private _urlPathChanged = false;

  @state() private _data?: Partial<LovelaceDashboard>;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  public showDialog(params: LovelaceDashboardDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._urlPathChanged = false;
    if (this._params.dashboard) {
      this._data = this._params.dashboard;
    } else {
      this._data = {
        show_in_sidebar: true,
        icon: undefined,
        title: "",
        require_admin: false,
        mode: "storage",
      };
    }
  }

  public closeDialog(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }
    const defaultPanelUrlPath = this.hass.defaultPanel;
    const titleInvalid = !this._data.title || !this._data.title.trim();

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.urlPath
            ? this._data.title ||
                this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.detail.edit_dashboard"
                )
            : this.hass.localize(
                "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
              )
        )}
      >
        <div>
          ${this._params.dashboard && !this._params.dashboard.id
            ? this.hass.localize(
                "ui.panel.config.lovelace.dashboards.cant_edit_yaml"
              )
            : this._params.urlPath === "lovelace"
            ? this.hass.localize(
                "ui.panel.config.lovelace.dashboards.cant_edit_default"
              )
            : html`
                <ha-form
                  .schema=${this._schema(this._params, this.hass.userData)}
                  .data=${this._data}
                  .hass=${this.hass}
                  .error=${this._error}
                  .computeLabel=${this._computeLabel}
                  @value-changed=${this._valueChanged}
                ></ha-form>
              `}
        </div>
        ${this._params.urlPath
          ? html`
              ${this._params.dashboard?.id
                ? html`
                    <mwc-button
                      slot="secondaryAction"
                      class="warning"
                      @click=${this._deleteDashboard}
                      .disabled=${this._submitting}
                    >
                      ${this.hass.localize(
                        "ui.panel.config.lovelace.dashboards.detail.delete"
                      )}
                    </mwc-button>
                  `
                : ""}
              <mwc-button
                slot="secondaryAction"
                @click=${this._toggleDefault}
                .disabled=${this._params.urlPath === "lovelace" &&
                defaultPanelUrlPath === "lovelace"}
              >
                ${this._params.urlPath === defaultPanelUrlPath
                  ? this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.remove_default"
                    )
                  : this.hass.localize(
                      "ui.panel.config.lovelace.dashboards.detail.set_default"
                    )}
              </mwc-button>
            `
          : ""}
        <mwc-button
          slot="primaryAction"
          @click=${this._updateDashboard}
          .disabled=${(this._error && "url_path" in this._error) ||
          titleInvalid ||
          this._submitting}
          dialogInitialFocus
        >
          ${this._params.urlPath
            ? this._params.dashboard?.id
              ? this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.detail.update"
                )
              : this.hass.localize("ui.common.close")
            : this.hass.localize(
                "ui.panel.config.lovelace.dashboards.detail.create"
              )}
        </mwc-button>
      </ha-dialog>
    `;
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
        ...(!params.dashboard && userData?.showAdvanced
          ? ([
              {
                name: "url_path",
                required: true,
                selector: { text: {} },
              },
            ] as const)
          : []),
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
      ] as const
  );

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
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
          url_path: this.hass.localize(
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
    if ((this.hass.userData?.showAdvanced && this._urlPathChanged) || !title) {
      return;
    }

    const slugifyTitle = slugify(title, "-");
    this._data = {
      ...this._data,
      url_path: slugifyTitle.includes("-")
        ? slugifyTitle
        : `dashboard-${slugifyTitle}`,
    };
  }

  private _toggleDefault() {
    const urlPath = this._params?.urlPath;
    if (!urlPath) {
      return;
    }
    setDefaultPanel(
      this,
      urlPath === this.hass.defaultPanel ? DEFAULT_PANEL : urlPath
    );
  }

  private async _updateDashboard() {
    if (this._params?.urlPath && !this._params.dashboard?.id) {
      this.closeDialog();
    }
    this._submitting = true;
    try {
      if (this._params!.dashboard) {
        const values: Partial<LovelaceDashboardMutableParams> = {
          require_admin: this._data!.require_admin,
          show_in_sidebar: this._data!.show_in_sidebar,
          icon: this._data!.icon || undefined,
          title: this._data!.title,
        };
        await this._params!.updateDashboard(values);
      } else {
        await this._params!.createDashboard(
          this._data as LovelaceDashboardCreateParams
        );
      }
      this.closeDialog();
    } catch (err: any) {
      this._error = { base: err?.message || "Unknown error" };
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteDashboard() {
    this._submitting = true;
    try {
      if (await this._params!.removeDashboard()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [haStyleDialog, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-dashboard-detail": DialogLovelaceDashboardDetail;
  }
}
