import {
  mdiClose,
  mdiDotsVertical,
  mdiMenuDown,
  mdiPlaylistEdit,
  mdiPlus,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { deepEqual } from "../../../../common/util/deep-equal";
import "../../../../components/ha-button";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dropdown";
import "../../../../components/ha-dropdown-item";
import "../../../../components/ha-yaml-editor";
import type { HaYamlEditor } from "../../../../components/ha-yaml-editor";
import type { LovelaceBadgeConfig } from "../../../../data/lovelace/config/badge";
import { ensureBadgeConfig } from "../../../../data/lovelace/config/badge";
import type { LovelaceCardConfig } from "../../../../data/lovelace/config/card";
import type {
  LovelaceViewConfig,
  LovelaceViewHeaderConfig,
} from "../../../../data/lovelace/config/view";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../dialogs/generic/show-dialog-box";
import {
  haStyleDialog,
  haStyleDialogFixedTop,
} from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import { showSaveSuccessToast } from "../../../../util/toast-saved-success";
import { replaceView } from "../config-util";
import {
  getViewHeaderFontStack,
  VIEW_HEADER_FONTS,
} from "../../views/hui-view-header";
import "./hui-view-header-heading-field";
import "./hui-view-header-badges-field";
import "./hui-view-header-settings-editor";
import "../../cards/hui-card";
import "../../badges/hui-badge";
import type { EditViewHeaderDialogParams } from "./show-edit-view-header-dialog";
import type { HaDropdownSelectEvent } from "../../../../components/ha-dropdown";

@customElement("hui-dialog-edit-view-header")
export class HuiDialogEditViewHeader extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _params?: EditViewHeaderDialogParams;

  // Whether the optional sub-heading row is revealed.
  @state() private _subtitleShown = false;

  // Whether the heading is being edited as code (YAML) rather than as chips.
  @state() private _headingCode = false;

  @state() private _headerConfig?: LovelaceViewHeaderConfig;

  @state() private _badges?: LovelaceBadgeConfig[];

  @state() private _headingError?: string;

  @state() private _saving = false;

  @state() private _dirty = false;

  @state() private _yamlMode = false;

  @query("ha-yaml-editor") private _yamlEditor?: HaYamlEditor;

  @state() private _open = false;

  protected updated(changedProperties: PropertyValues) {
    if (this._yamlMode && changedProperties.has("_yamlMode")) {
      this._yamlEditor?.setValue({
        header: this._headerConfig,
        badges: this._badges,
      });
    }
  }

  public showDialog(params: EditViewHeaderDialogParams): void {
    this._params = params;
    const view = params.lovelace.config.views[
      params.viewIndex
    ] as LovelaceViewConfig;

    this._headerConfig = view.header ?? {};
    this._badges = (view.badges ?? []).map(ensureBadgeConfig);
    this._subtitleShown = !!this._parseHeading().subtitle;
    this._headingCode = false;
    this._headingError = undefined;
    this._dirty = false;
    this._yamlMode = false;
    this._open = true;
  }

  public closeDialog(): boolean {
    if (this._dirty) {
      this._confirmCancel();
      return false;
    }
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._open = false;
    this._params = undefined;
    this._headerConfig = undefined;
    this._badges = undefined;
    this._subtitleShown = false;
    this._headingCode = false;
    this._headingError = undefined;
    this._yamlMode = false;
    this._dirty = false;
    this._saving = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _confirmCancel() {
    // Make sure the open state of this dialog is handled before the open state of confirm dialog
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    const confirm = await showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.unsaved_changes"
      ),
      text: this.hass!.localize(
        "ui.panel.lovelace.editor.edit_card.confirm_cancel"
      ),
      dismissText: this.hass!.localize("ui.common.stay"),
      confirmText: this.hass!.localize("ui.common.leave"),
    });
    if (confirm) {
      this._dirty = false;
      this.closeDialog();
    }
  }

  protected render() {
    if (!this._params || !this.hass || !this._headerConfig || !this._badges) {
      return nothing;
    }

    return html`
      <ha-dialog
        .open=${this._open}
        width="large"
        prevent-scrim-close
        @closed=${this._dialogClosed}
        class=${classMap({
          "yaml-mode": this._yamlMode,
        })}
      >
        <span slot="headerTitle">
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.dialog_title"
          )}
        </span>
        <ha-dropdown
          slot="headerActionItems"
          placement="bottom-end"
          @wa-select=${this._handleAction}
        >
          <ha-icon-button
            slot="trigger"
            .label=${this.hass!.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          <ha-dropdown-item value="toggle-mode">
            ${this.hass!.localize(
              `ui.panel.lovelace.editor.edit_view_header.edit_${!this._yamlMode ? "yaml" : "ui"}`
            )}
            <ha-svg-icon slot="icon" .path=${mdiPlaylistEdit}></ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>
        ${
          this._yamlMode
            ? html`
                <ha-yaml-editor
                  autofocus
                  in-dialog
                  @value-changed=${this._viewYamlChanged}
                ></ha-yaml-editor>
              `
            : this._renderBody()
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="primaryAction"
            .disabled=${!this._dirty || this._saving || !!this._headingError}
            @click=${this._save}
            .loading=${this._saving}
          >
            ${this.hass!.localize("ui.common.save")}</ha-button
          >
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private async _handleAction(ev: HaDropdownSelectEvent) {
    const action = ev.detail.item.value;

    if (action === "toggle-mode") {
      this._toggleYamlMode();
    }
  }

  private _toggleYamlMode(): void {
    this._yamlMode = !this._yamlMode;
  }

  // Single-page WYSIWYG editor: preview, then Heading / Badges / Layout.
  private _renderBody() {
    return html`
      <div class="preview-wrapper">
        <span class="preview-label"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.preview"
          )}</span
        >
        <div class="header-preview">${this._renderPreview()}</div>
      </div>
      ${this._renderContent()}
    `;
  }

  private _renderContent() {
    const { title, subtitle } = this._parseHeading();
    return html`
      <div class="section">
        <span class="section-title"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.tab_heading"
          )}</span
        >
        ${
          this._headingCode
            ? html`
                <ha-yaml-editor
                  .hass=${this.hass}
                  .defaultValue=${this._headerConfig!.card ?? {}}
                  @value-changed=${this._headingCodeChanged}
                ></ha-yaml-editor>
              `
            : html`
                <hui-view-header-heading-field
                  .hass=${this.hass}
                  .content=${title}
                  @heading-content-changed=${this._titleChanged}
                ></hui-view-header-heading-field>
                ${this._renderFontControl()}
                ${
                  this._subtitleShown
                    ? html`
                        <div class="subheading-row">
                          <hui-view-header-heading-field
                            .hass=${this.hass}
                            .content=${subtitle}
                            @heading-content-changed=${this._subtitleChanged}
                          ></hui-view-header-heading-field>
                          <ha-icon-button
                            .label=${this.hass!.localize(
                              "ui.panel.lovelace.editor.edit_view_header.remove_subheading"
                            )}
                            .path=${mdiClose}
                            @click=${this._removeSubheading}
                          ></ha-icon-button>
                        </div>
                      `
                    : html`
                        <ha-button
                          appearance="plain"
                          class="add-heading"
                          @click=${this._addSubheading}
                        >
                          <ha-svg-icon
                            slot="start"
                            .path=${mdiPlus}
                          ></ha-svg-icon>
                          ${this.hass!.localize(
                            "ui.panel.lovelace.editor.edit_view_header.add_heading"
                          )}
                        </ha-button>
                      `
                }
              `
        }
        <button class="link-button" @click=${this._toggleHeadingCode}>
          ${this.hass!.localize(
            this._headingCode
              ? "ui.panel.lovelace.editor.edit_view_header.edit_visually"
              : "ui.panel.lovelace.editor.edit_view_header.edit_as_code"
          )}
        </button>
      </div>
      <div class="section">
        <span class="section-title"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.tab_badges"
          )}</span
        >
        <hui-view-header-badges-field
          .hass=${this.hass}
          .lovelaceConfig=${this._params!.lovelace.config}
          .badges=${this._badges}
          @badges-changed=${this._badgesChanged}
        ></hui-view-header-badges-field>
        <hui-view-header-settings-editor
          class="badge-settings"
          compact
          scope="badges"
          .hass=${this.hass}
          .config=${this._headerConfig}
          @config-changed=${this._headerConfigChanged}
        ></hui-view-header-settings-editor>
      </div>
      <div class="section">
        <span class="section-title"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.tab_layout"
          )}</span
        >
        <hui-view-header-settings-editor
          compact
          scope="layout"
          .hass=${this.hass}
          .config=${this._headerConfig}
          @config-changed=${this._headerConfigChanged}
        ></hui-view-header-settings-editor>
      </div>
    `;
  }

  // ---- heading (title + optional sub-heading) -------------------------------

  // The heading card content is one markdown string: the first line is the
  // title (rendered big via a leading "#"), any following line the sub-heading.
  private _parseHeading(): { title: string; subtitle: string } {
    const content =
      typeof this._headerConfig?.card?.content === "string"
        ? this._headerConfig.card.content
        : "";
    const nl = content.indexOf("\n");
    const firstLine = nl === -1 ? content : content.slice(0, nl);
    const subtitle = nl === -1 ? "" : content.slice(nl + 1);
    return { title: firstLine.replace(/^#\s*/, ""), subtitle };
  }

  private _buildHeadingCard(title: string, subtitle: string): void {
    const lines: string[] = [];
    if (title) {
      lines.push(`# ${title}`);
    }
    if (subtitle) {
      lines.push(subtitle);
    }
    const content = lines.join("\n");
    const card = content
      ? {
          ...this._headerConfig?.card,
          type: "markdown",
          text_only: true,
          content,
        }
      : undefined;
    this._headerConfig = { ...this._headerConfig, card };
    this._headingError = undefined;
    this._dirty = true;
  }

  private _titleChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._buildHeadingCard(ev.detail.content, this._parseHeading().subtitle);
  }

  private _subtitleChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._buildHeadingCard(this._parseHeading().title, ev.detail.content);
  }

  private _addSubheading(): void {
    this._subtitleShown = true;
  }

  private _removeSubheading(): void {
    this._subtitleShown = false;
    this._buildHeadingCard(this._parseHeading().title, "");
  }

  private _toggleHeadingCode(): void {
    this._headingCode = !this._headingCode;
    // Re-sync the sub-heading row state when returning to the visual editor.
    if (!this._headingCode) {
      this._subtitleShown = !!this._parseHeading().subtitle;
    }
  }

  private _headingCodeChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    const card = ev.detail.value as LovelaceCardConfig | undefined;
    this._headerConfig = {
      ...this._headerConfig,
      card: card && Object.keys(card).length ? card : undefined,
    };
    this._headingError = undefined;
    this._dirty = true;
  }

  // ---- title font -----------------------------------------------------------

  private _renderFontControl() {
    const current = this._headerConfig?.title_font ?? "default";
    const currentStack = getViewHeaderFontStack(current);
    return html`
      <div class="font-row">
        <span class="font-label"
          >${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.font_label"
          )}</span
        >
        <ha-dropdown class="font-dropdown" @wa-select=${this._titleFontChanged}>
          <button
            slot="trigger"
            class="font-select"
            style=${currentStack ? `font-family: ${currentStack}` : ""}
          >
            <span
              >${this.hass!.localize(
                `ui.panel.lovelace.editor.edit_view_header.font_options.${current}` as const
              )}</span
            >
            <ha-svg-icon .path=${mdiMenuDown}></ha-svg-icon>
          </button>
          ${VIEW_HEADER_FONTS.map(
            (font) => html`
              <ha-dropdown-item
                value=${font.id}
                style=${font.stack ? `font-family: ${font.stack}` : ""}
              >
                ${this.hass!.localize(
                  `ui.panel.lovelace.editor.edit_view_header.font_options.${font.id}` as const
                )}
              </ha-dropdown-item>
            `
          )}
        </ha-dropdown>
      </div>
    `;
  }

  private _titleFontChanged(ev: HaDropdownSelectEvent): void {
    ev.stopPropagation();
    const value = ev.detail.item.value;
    if ((this._headerConfig?.title_font ?? "default") === value) {
      return;
    }
    this._headerConfig = {
      ...this._headerConfig,
      title_font: value === "default" ? undefined : value,
    };
    this._dirty = true;
  }

  private _headerConfigChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (
      ev.detail &&
      ev.detail.config &&
      !deepEqual(this._headerConfig, ev.detail.config)
    ) {
      this._headerConfig = ev.detail.config;
      this._dirty = true;
    }
  }

  private _badgesChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._badges = ev.detail.badges;
    this._dirty = true;
  }

  private _viewYamlChanged(ev: CustomEvent) {
    ev.stopPropagation();
    if (!ev.detail.isValid) {
      return;
    }
    const value = ev.detail.value as {
      header?: LovelaceViewHeaderConfig;
      badges?: LovelaceBadgeConfig[];
    };
    this._headerConfig = value.header ?? {};
    this._badges = (value.badges ?? []).map(ensureBadgeConfig);
    this._dirty = true;
  }

  private async _save(): Promise<void> {
    if (!this._params || !this._headerConfig || !this._badges) {
      return;
    }

    this._saving = true;

    try {
      const view = this._params.lovelace.config.views[
        this._params.viewIndex
      ] as LovelaceViewConfig;
      const newView: LovelaceViewConfig = {
        ...view,
        header: this._headerConfig,
        badges: this._badges,
      };
      const newConfig = replaceView(
        this.hass!,
        this._params.lovelace.config,
        this._params.viewIndex,
        newView
      );
      await this._params.lovelace.saveConfig(newConfig);
      showSaveSuccessToast(this, this.hass!);
      this._dirty = false;
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

  private _renderPreview() {
    const card = this._headerConfig?.card;
    const badges = this._badges ?? [];

    if (!card && badges.length === 0) {
      return html`
        <div class="preview-empty">
          ${this.hass!.localize(
            "ui.panel.lovelace.editor.edit_view_header.preview_empty"
          )}
        </div>
      `;
    }

    const layout = this._headerConfig?.layout ?? "center";
    const badgesPosition = this._headerConfig?.badges_position ?? "bottom";
    const titleFontStack = getViewHeaderFontStack(
      this._headerConfig?.title_font
    );

    return html`
      <div class="preview-header layout-${layout} badges-${badgesPosition}">
        ${
          card
            ? html`
                <div
                  class="preview-heading"
                  style=${
                    titleFontStack
                      ? `--ha-font-family-heading: ${titleFontStack}`
                      : ""
                  }
                >
                  <hui-card
                    preview
                    .hass=${this.hass}
                    .config=${card}
                  ></hui-card>
                </div>
              `
            : nothing
        }
        ${
          badges.length
            ? html`
                <div class="preview-badges">
                  ${badges.map(
                    (badge) => html`
                      <hui-badge
                        preview
                        .hass=${this.hass}
                        .config=${badge}
                      ></hui-badge>
                    `
                  )}
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      haStyleDialogFixedTop,
      css`
        ha-dialog.yaml-mode {
          --dialog-content-padding: 0;
        }
        .section {
          margin-top: var(--ha-space-8);
        }
        .section-title {
          display: block;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          margin-bottom: var(--ha-space-3);
        }
        .subheading-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-2);
          margin-top: var(--ha-space-3);
        }
        .subheading-row hui-view-header-heading-field {
          flex: 1;
          min-width: 0;
        }
        .add-heading {
          margin-top: var(--ha-space-2);
        }
        .font-row {
          display: flex;
          align-items: center;
          gap: var(--ha-space-3);
          margin-top: var(--ha-space-3);
        }
        .font-label {
          font-size: var(--ha-font-size-m);
          color: var(--secondary-text-color);
        }
        .font-select {
          display: inline-flex;
          align-items: center;
          gap: var(--ha-space-2);
          appearance: none;
          cursor: pointer;
          padding: 6px 10px;
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-md);
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-family: inherit;
          font-size: var(--ha-font-size-m);
        }
        .link-button {
          display: block;
          appearance: none;
          border: 0;
          background: none;
          cursor: pointer;
          padding: 0;
          margin-top: var(--ha-space-3);
          color: var(--primary-color);
          font-family: inherit;
          font-size: var(--ha-font-size-m);
        }
        .badge-settings {
          display: block;
          margin-top: var(--ha-space-4);
        }
        .preview-wrapper {
          margin-bottom: var(--ha-space-4);
        }
        .preview-label {
          display: block;
          font-size: var(--ha-font-size-s);
          font-weight: var(--ha-font-weight-medium);
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: var(--ha-space-2);
        }
        .header-preview {
          border: 1px solid var(--divider-color);
          border-radius: var(--ha-border-radius-lg);
          background: var(--primary-background-color);
          padding: var(--ha-space-4);
          overflow: hidden;
        }
        .preview-empty {
          color: var(--secondary-text-color);
          text-align: center;
          padding: var(--ha-space-6) 0;
          font-style: italic;
        }
        .preview-header {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-3);
        }
        .preview-header.layout-start {
          align-items: flex-start;
          --card-text-align: start;
        }
        .preview-header.layout-center,
        .preview-header.layout-responsive {
          align-items: center;
          --card-text-align: center;
        }
        .preview-header.badges-top {
          flex-direction: column-reverse;
        }
        .preview-header.layout-inline {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: var(--ha-space-4);
        }
        .preview-header.layout-inline .preview-heading {
          width: auto;
          flex: 1;
        }
        .preview-header.layout-inline .preview-badges {
          justify-content: flex-end;
        }
        .preview-heading {
          width: 100%;
          max-width: 700px;
        }
        .preview-badges {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-2);
        }
        .preview-header.layout-start .preview-badges {
          justify-content: flex-start;
        }
        .preview-header.layout-center .preview-badges,
        .preview-header.layout-responsive .preview-badges {
          justify-content: center;
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
