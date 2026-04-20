import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { slugify } from "../../../../common/string/slugify";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-dialog";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LovelaceConfig } from "../../../../data/lovelace/config/types";
import type {
  LovelaceDashboard,
  LovelaceDashboardCreateParams,
  LovelaceDashboardMutableParams,
} from "../../../../data/lovelace/dashboard";
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

  public showDialog(params: LovelaceDashboardDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    this._urlPathChanged = false;
    this._currTab = TABS[0];
    this._backgroundConfig = params.lovelaceConfig;
    this._open = true;
    if (this._params.dashboard) {
      this._data = this._params.dashboard;
    } else {
      const suggestions = this._params.suggestions;
      this._data = {
        show_in_sidebar: true,
        icon: suggestions?.icon,
        title: suggestions?.title ?? "",
        require_admin: false,
        mode: "storage",
      };
      if (suggestions?.title) {
        this._fillUrlPath(suggestions.title);
      }
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
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
    const showBackgroundTab =
      Boolean(this._params.lovelaceConfig) && Boolean(this._params.saveConfig);

    let content: string | TemplateResult<1> | typeof nothing = nothing;

    if (this._params.dashboard?.mode === "yaml") {
      content = this.hass.localize(
        "ui.panel.config.lovelace.dashboards.cant_edit_yaml"
      );
    } else if (this._currTab === "tab-background" && showBackgroundTab) {
      content = html`
        <hui-view-background-editor
          .hass=${this.hass}
          .config=${this._backgroundConfig}
          @background-config-changed=${this._backgroundConfigChanged}
        ></hui-view-background-editor>
      `;
    } else {
      content = html`
        <ha-form
          autofocus
          .schema=${this._schema(this._params, this._data?.require_admin)}
          .data=${this._data}
          .hass=${this.hass}
          .error=${this._error}
          .computeLabel=${this._computeLabel}
          .computeHelper=${this._computeHelper}
          @value-changed=${this._valueChanged}
        ></ha-form>
      `;
    }

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
        width=${showBackgroundTab ? "large" : "medium"}
        header-title=${this._params.urlPath
          ? this._data.title ||
            this.hass.localize(
              "ui.panel.config.lovelace.dashboards.detail.edit_dashboard"
            )
          : this.hass.localize(
              "ui.panel.config.lovelace.dashboards.detail.new_dashboard"
            )}
        prevent-scrim-close
        @closed=${this._dialogClosed}
        class=${classMap({
          "has-background-tab": showBackgroundTab,
        })}
      >
        ${showBackgroundTab
          ? html`<ha-tab-group @wa-tab-show=${this._handleTabChanged}>
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
            </ha-tab-group>`
          : nothing}
        <div>${content}</div>
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

  private _backgroundConfigChanged(
    ev: CustomEvent<{ config: LovelaceConfig }>
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
    const taken = this._params?.takenUrlPaths;
    this._data = {
      ...this._data,
      url_path:
        taken !== undefined
          ? pickAvailableDashboardUrlPath(baseSlug, taken)
          : baseSlug,
    };
  }

  private async _updateDashboard() {
    if (this._params?.urlPath && this._params.dashboard?.mode === "yaml") {
      this.closeDialog();
      return;
    }
    this._submitting = true;
    try {
      if (
        this._backgroundConfig &&
        this._params?.saveConfig &&
        this._params.lovelaceConfig &&
        this._backgroundConfig.background !==
          this._params.lovelaceConfig.background
      ) {
        await this._params.saveConfig(this._backgroundConfig);
      }
      if (this._params!.dashboard) {
        const values: Partial<LovelaceDashboardMutableParams> = {
          require_admin: this._data!.require_admin,
          show_in_sidebar: this._data!.show_in_sidebar,
          icon: this._data!.icon || undefined,
          title: this._data!.title,
        };
        await this._params!.updateDashboard(values);
      } else if (this._params!.createDashboard) {
        await this._params!.createDashboard(
          this._data as LovelaceDashboardCreateParams
        );
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
    ev: CustomEvent<{
      name: (typeof TABS)[number];
    }>
  ): void {
    const newTab = ev.detail.name;
    if (newTab === this._currTab) {
      return;
    }
    this._currTab = newTab;
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
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog.has-background-tab {
          --dialog-content-padding: 0 24px 24px;
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
