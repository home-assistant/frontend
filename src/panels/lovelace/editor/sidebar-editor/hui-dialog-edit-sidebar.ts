import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeRTL } from "../../../../common/util/compute_rtl";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog";
import "../../../../components/ha-dialog-footer";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-tab-group";
import "../../../../components/ha-tab-group-tab";
import {
  DEFAULT_SIDEBAR_MOBILE_POSITION,
  DEFAULT_SIDEBAR_POSITION,
  SIDEBAR_MOBILE_POSITIONS,
  SIDEBAR_POSITIONS,
  type LovelaceViewSidebarConfig,
  type SidebarPosition,
} from "../../../../data/lovelace/config/view";
import { showAlertDialog } from "../../../../dialogs/generic/show-dialog-box";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { DirtyStateProviderMixin } from "../../../../mixins/dirty-state-provider-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant, ValueChangedEvent } from "../../../../types";
import { getAtPath, setAtPath } from "../lovelace-path";
import "../section-editor/hui-section-visibility-editor";
import type { EditSidebarDialogParams } from "./show-edit-sidebar-dialog";

const TABS = ["settings", "visibility"] as const;

type Tab = (typeof TABS)[number];

const computeSide = (position: SidebarPosition, isRTL: boolean) => {
  if (position === "start") {
    return isRTL ? "right" : "left";
  }
  return isRTL ? "left" : "right";
};

@customElement("hui-dialog-edit-sidebar")
export class HuiDialogEditSidebar
  extends DirtyStateProviderMixin<LovelaceViewSidebarConfig>()(LitElement)
  implements HassDialog<EditSidebarDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditSidebarDialogParams;

  @state() private _config?: LovelaceViewSidebarConfig;

  @state() private _tab: Tab = "settings";

  @state() private _open = false;

  @state() private _saving = false;

  public showDialog(params: EditSidebarDialogParams): void {
    this._params = params;
    this._config =
      getAtPath<LovelaceViewSidebarConfig>(
        params.lovelace.config,
        params.path
      ) ?? {};
    this._initDirtyTracking({ type: "deep" }, this._config);
    this._tab = "settings";
    this._open = true;
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._config = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _schema = memoizeOne(
    (localize: LocalizeFunc, isRTL: boolean) =>
      [
        {
          name: "position",
          required: true,
          selector: {
            select: {
              mode: "box",
              options: SIDEBAR_POSITIONS.map((position) => ({
                value: position,
                label: localize(
                  `ui.panel.lovelace.editor.sidebar.position_options.${computeSide(position, isRTL)}`
                ),
                image: {
                  src: `/static/images/form/sidebar_position_${position}.svg`,
                  src_dark: `/static/images/form/sidebar_position_${position}_dark.svg`,
                  flip_rtl: true,
                },
              })),
            },
          },
        },
        {
          name: "mobile_position",
          required: true,
          selector: {
            select: {
              mode: "box",
              options: SIDEBAR_MOBILE_POSITIONS.map((position) => ({
                value: position,
                label: localize(
                  `ui.panel.lovelace.editor.sidebar.mobile_position_options.${position}`
                ),
                image: {
                  src: `/static/images/form/sidebar_mobile_position_${position}.svg`,
                  src_dark: `/static/images/form/sidebar_mobile_position_${position}_dark.svg`,
                  flip_rtl: true,
                },
              })),
            },
          },
        },
        {
          name: "content_label",
          visible: { field: "mobile_position", value: "tabs" },
          selector: { text: {} },
        },
        {
          name: "sidebar_label",
          visible: { field: "mobile_position", value: "tabs" },
          selector: { text: {} },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this._params || !this._config) {
      return nothing;
    }

    const data = {
      ...this._config,
      position: this._config.position ?? DEFAULT_SIDEBAR_POSITION,
      mobile_position:
        this._config.mobile_position ?? DEFAULT_SIDEBAR_MOBILE_POSITION,
    };

    const isRTL = computeRTL(
      this.hass.language,
      this.hass.translationMetadata.translations
    );

    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.lovelace.editor.sidebar.settings"
        )}
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <ha-tab-group @wa-tab-show=${this._tabChanged}>
          ${TABS.map(
            (tab) => html`
              <ha-tab-group-tab
                slot="nav"
                .panel=${tab}
                .active=${this._tab === tab}
              >
                ${this.hass.localize(
                  `ui.panel.lovelace.editor.sidebar.tab_${tab}`
                )}
              </ha-tab-group-tab>
            `
          )}
        </ha-tab-group>
        ${
          this._tab === "settings"
            ? html`
                <ha-form
                  autofocus
                  .hass=${this.hass}
                  .data=${data}
                  .schema=${this._schema(this.hass.localize, isRTL)}
                  .computeLabel=${this._computeLabel}
                  @value-changed=${this._valueChanged}
                ></ha-form>
              `
            : html`
                <hui-section-visibility-editor
                  .hass=${this.hass}
                  .config=${this._config}
                  @value-changed=${this._valueChanged}
                ></hui-section-visibility-editor>
              `
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            .disabled=${this._saving || !this.isDirtyState}
            .loading=${this._saving}
            @click=${this._save}
          >
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => this.hass.localize(`ui.panel.lovelace.editor.sidebar.${schema.name}`);

  private _tabChanged(ev: CustomEvent<{ name: Tab }>) {
    this._tab = ev.detail.name;
  }

  private _valueChanged(ev: ValueChangedEvent<LovelaceViewSidebarConfig>) {
    ev.stopPropagation();
    this._config = ev.detail.value;
    this._updateDirtyState(this._config);
  }

  private async _save() {
    if (!this._params || !this._config) {
      return;
    }
    const { lovelace, path } = this._params;
    this._saving = true;
    try {
      await lovelace.saveConfig(setAtPath(lovelace.config, path, this._config));
      this.closeDialog();
    } catch (err: any) {
      showAlertDialog(this, {
        text: `${this.hass.localize(
          "ui.panel.lovelace.editor.sidebar.saving_failed"
        )}: ${err.message}`,
      });
    } finally {
      this._saving = false;
    }
  }

  static styles = [
    haStyleDialog,
    css`
      ha-tab-group {
        display: block;
        margin-bottom: var(--ha-space-4);
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

declare global {
  interface HTMLElementTagNameMap {
    "hui-dialog-edit-sidebar": HuiDialogEditSidebar;
  }
}
