import { mdiClose } from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import {
  fireEvent,
  type HASSDomEvent,
} from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type { LovelaceDashboard } from "../../../../data/lovelace/dashboard";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import "../../../lovelace/editor/view-editor/hui-view-background-editor";
import type { LovelaceDashboardDetailsDialogParams } from "./show-dialog-lovelace-dashboard-detail";
import { pickAvailableDashboardUrlPath } from "./pick-available-dashboard-url-path";

const TABS = ["tab-settings", "tab-background"] as const;

@customElement("dialog-lovelace-dashboard-detail")
export class DialogLovelaceDashboardDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceDashboardDetailsDialogParams;

  @state() private _open = false;

  @state() private _urlPathChanged = false;

  @state() private _data?: Partial<LovelaceDashboard>;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @state() private _currTab: (typeof TABS)[number] = TABS[0];

  @state() private _backgroundConfig?: LovelaceConfig;

  public showDialog(params: LovelaceDashboardDetailsDialogParams) {
    this._params = params;
    this._error = undefined;
    this._urlPathChanged = false;
    this._currTab = TABS[0];
    this._backgroundConfig = params.lovelaceConfig;
    this._open = true;
    if (this._params.dashboard) {
      this._data = this._params.dashboard;
    } else {
      this._data = {
        show_in_sidebar: true,
        icon: this._params.suggestions?.icon,
        title: this._params.suggestions?.title ?? "",
        require_admin: false,
        mode: "storage",
      };
      if (this._params.suggestions?.title) {
        this._fillUrlPath(this._params.suggestions.title);
      }
    }
  }

  public closeDialog() {
    this._open = false;
  }

  private _dialogClosed() {
    this._params = undefined;
    this._data = undefined;
    this._backgroundConfig = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    const titleInvalid = !this._data.title || !this._data.title.trim();
    const dialogTitle = this._params.urlPath
      ? this._data.title ||
        this.hass.localize(
          "ui.panel.config.lovelace.dashboards.detail.edit_dashboard"
        )
      : this.hass.localize(
          "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
        );
    const showBackgroundTab =
      this._params.dashboard?.mode !== "yaml" &&
      Boolean(this._params.lovelaceConfig) &&
      Boolean(this._params.saveConfig);

    const cancelButton = html`
      <ha-button
        appearance="plain"
        slot="secondaryAction"
        @click=${this.closeDialog}
      >
        ${this.hass.localize("ui.common.cancel")}
      </ha-button>
    `;

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${showBackgroundTab ? nothing : dialogTitle}
        width=${showBackgroundTab ? "large" : "medium"}
        prevent-scrim-close
        @closed=${this._dialogClosed}
      >
        ${showBackgroundTab
          ? html`
              <ha-dialog-header show-border slot="header">
                <ha-icon-button
                  slot="navigationIcon"
                  @click=${this.closeDialog}
                  .label=${this.hass.localize("ui.common.close")}
                  .path=${mdiClose}
                ></ha-icon-button>
                <h2 slot="title">${dialogTitle}</h2>
                <ha-tab-group @wa-tab-show=${this._handleTabChanged}>
                  ${TABS.map(
                    (tab) => html`
                      <ha-tab-group-tab
                        slot="nav"
                        .panel=${tab}
                        .active=${this._currTab === tab}
                      >
                        ${this.hass.localize(
                          `ui.panel.lovelace.editor.edit_view.${tab.replace("-", "_")}`
                        )}
                      </ha-tab-group-tab>
                    `
                  )}
                </ha-tab-group>
              </ha-dialog-header>
            `
          : nothing}
        <div>
          ${this._renderContent(this._params, this._data, showBackgroundTab)}
        </div>
        <ha-dialog-footer slot="footer">
          ${this._params.urlPath
            ? html`
                ${this._params.dashboard?.mode === "storage"
                  ? html`
                      <ha-button
                        slot="secondaryAction"
                        variant="danger"
                        appearance="plain"
                        @click=${this._deleteDashboard}
                        .disabled=${this._submitting}
                      >
                        ${this.hass.localize(
                          "ui.panel.config.lovelace.dashboards.detail.delete"
                        )}
                      </ha-button>
                    `
                  : cancelButton}
              `
            : cancelButton}
          <ha-button
            slot="primaryAction"
            @click=${this._updateDashboard}
            .disabled=${(this._error && "url_path" in this._error) ||
            titleInvalid ||
            this._submitting}
            ?autofocus=${this._params.dashboard?.mode === "yaml"}
          >
            ${this._params.urlPath
              ? this._params.dashboard?.mode === "storage"
                ? this.hass.localize(
                    "ui.panel.config.lovelace.dashboards.detail.update"
                  )
                : this.hass.localize("ui.common.close")
              : this.hass.localize(
                  "ui.panel.config.lovelace.dashboards.detail.create"
                )}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderContent(
    params: LovelaceDashboardDetailsDialogParams,
    data: Partial<LovelaceDashboard>,
    showBackgroundTab: boolean
  ): string | TemplateResult<1> | typeof nothing {
    if (params.dashboard?.mode === "yaml") {
      return this.hass.localize(
        "ui.panel.config.lovelace.dashboards.cant_edit_yaml"
      );
    }

    if (this._currTab === "tab-background" && showBackgroundTab) {
      return html`
        <hui-view-background-editor
          .hass=${this.hass}
          .config=${this._backgroundConfig}
          @background-config-changed=${this._backgroundConfigChanged}
        ></hui-view-background-editor>
      `;
    }

    return html`
      <ha-form
        autofocus
        .schema=${this._schema(params, data.require_admin)}
        .data=${data}
        .hass=${this.hass}
        .error=${this._error}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  private _schema = memoizeOne(
    (params: LovelaceDashboardDetailsDialogParams, requireAdmin?: boolean) =>
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
          required: false,
          selector: {
            icon: {},
          },
        },
        ...(!params.dashboard
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
          disabled: params.isDefault && !requireAdmin,
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

  private _computeHelper = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    entry.name === "require_admin" && entry.disabled
      ? this.hass.localize(
          "ui.panel.config.lovelace.dashboards.panel_detail.require_admin_helper"
        )
      : "";

  private _valueChanged(
    ev: HASSDomEvent<{ value: Partial<LovelaceDashboard> }>
  ) {
    this._error = undefined;
    if (ev.detail.value.url_path !== this._data?.url_path) {
      this._urlPathChanged = true;
      if (
        !ev.detail.value.url_path ||
        ev.detail.value.url_path === "lovelace" ||
        !/^[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]+$/.test(ev.detail.value.url_path)
      ) {
        this._error = {
          url_path: this.hass.localize(
            "ui.panel.config.lovelace.dashboards.detail.url_error_msg"
          ),
        };
      }
    }
    if (ev.detail.value.title !== this._data?.title) {
      this._data = ev.detail.value;
      if (ev.detail.value.title) {
        this._fillUrlPath(ev.detail.value.title);
      }
    } else {
      this._data = ev.detail.value;
    }
  }

  private _backgroundConfigChanged(
    ev: HASSDomEvent<{ config: LovelaceConfig }>
  ) {
    this._backgroundConfig = ev.detail.config;
  }

  private _fillUrlPath(title: string) {
    if (this._urlPathChanged || !title) {
      return;
    }

    const slugifyTitle = slugify(title, "-");
    const baseSlug = slugifyTitle.includes("-")
      ? slugifyTitle
      : `dashboard-${slugifyTitle}`;
    this._data = {
      ...this._data,
      url_path:
        this._params?.takenUrlPaths !== undefined
          ? pickAvailableDashboardUrlPath(baseSlug, this._params.takenUrlPaths)
          : baseSlug,
    };
  }

  private async _updateDashboard() {
    if (!this._params || !this._data) {
      return;
    }

    if (this._params.urlPath && this._params.dashboard?.mode === "yaml") {
      this.closeDialog();
      return;
    }
    this._submitting = true;
    try {
      if (
        this._backgroundConfig &&
        this._params.saveConfig &&
        this._params.lovelaceConfig &&
        this._backgroundConfig.background !==
          this._params.lovelaceConfig.background
      ) {
        await this._params.saveConfig(this._backgroundConfig);
      }
      if (this._params.dashboard) {
        await this._params.updateDashboard({
          require_admin: this._data.require_admin ?? false,
          show_in_sidebar: this._data.show_in_sidebar ?? true,
          icon: this._data.icon || undefined,
          title: this._data.title ?? "",
        });
      } else if (this._params.createDashboard) {
        await this._params.createDashboard({
          require_admin: this._data.require_admin ?? false,
          show_in_sidebar: this._data.show_in_sidebar ?? true,
          icon: this._data.icon || undefined,
          title: this._data.title ?? "",
          url_path: this._data.url_path ?? "",
          mode: "storage",
        });
      }
      this.closeDialog();
    } catch (err: any) {
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
    } finally {
      this._submitting = false;
    }
  }

  private _handleTabChanged(
    ev: HASSDomEvent<{
      name: (typeof TABS)[number];
    }>
  ) {
    if (ev.detail.name === this._currTab) {
      return;
    }
    this._currTab = ev.detail.name;
  }

  private async _deleteDashboard() {
    if (!this._params) {
      return;
    }

    this._submitting = true;
    try {
      if (await this._params.removeDashboard()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog {
          --dialog-content-padding: var(--ha-space-6);
        }

        h2 {
          margin: 0;
          font-size: inherit;
          font-weight: inherit;
        }

        ha-tab-group-tab {
          flex: 1;
        }

        ha-tab-group-tab::part(base) {
          width: 100%;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-dashboard-detail": DialogLovelaceDashboardDetail;
  }
}
