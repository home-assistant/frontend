import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-dialog";
import "../../../components/ha-form/ha-form";
import type { HaFormSchema } from "../../../components/ha-form/types";
import type { CustomShortcutItem } from "../../../data/frontend";
import { NavigationPathInfoController } from "../../../data/navigation-path-controller";
import type { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import type { EditShortcutDialogParams } from "./show-dialog-edit-shortcut";

@customElement("dialog-edit-shortcut")
export class DialogEditShortcut
  extends LitElement
  implements HassDialog<EditShortcutDialogParams>
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: EditShortcutDialogParams;

  @state() private _data?: CustomShortcutItem;

  @state() private _open = false;

  private _navInfo = new NavigationPathInfoController(this);

  public showDialog(params: EditShortcutDialogParams): void {
    this._params = params;
    this._data = { ...params.item };
    this._open = true;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    if ((changedProps.has("_data") || changedProps.has("hass")) && this.hass) {
      this._navInfo.update(this.hass, this._data?.path);
    }
  }

  public closeDialog(): boolean {
    this._open = false;
    return true;
  }

  private _dialogClosed(): void {
    this._params = undefined;
    this._data = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _schema = memoizeOne(
    (labelPlaceholder: string, iconPlaceholder: string) =>
      [
        {
          name: "path",
          required: true,
          selector: { navigation: {} },
        },
        {
          name: "label",
          selector: { text: { placeholder: labelPlaceholder } },
        },
        {
          name: "icon",
          selector: { icon: { placeholder: iconPlaceholder } },
        },
        {
          name: "color",
          selector: { ui_color: { default_color: "primary" } },
        },
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this._params || !this._data) {
      return nothing;
    }

    const info = this._navInfo.info;
    const labelPlaceholder = info.label || "";
    const iconPlaceholder = info.icon || "mdi:link";

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        .headerTitle=${this.hass.localize("ui.panel.home.editor.edit_shortcut")}
        width="small"
        @closed=${this._dialogClosed}
      >
        <ha-form
          .hass=${this.hass}
          .data=${this._data}
          .schema=${this._schema(labelPlaceholder, iconPlaceholder)}
          .computeLabel=${this._computeLabel}
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
          <ha-button slot="primaryAction" @click=${this._save}>
            ${this.hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _computeLabel = (schema: HaFormSchema) =>
    this.hass.localize(`ui.panel.home.editor.shortcut.${schema.name}` as any) ||
    this.hass.localize(
      `ui.panel.lovelace.editor.card.generic.${schema.name}` as any
    );

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    this._data = ev.detail.value as CustomShortcutItem;
  }

  private _save() {
    if (!this._params || !this._data?.path) return;
    const { path, label, icon, color } = this._data;
    this._params.saveCallback({
      path,
      label: label || undefined,
      icon: icon || undefined,
      color: color || undefined,
    });
    this.closeDialog();
  }

  static styles = [
    haStyleDialog,
    css`
      ha-dialog {
        --dialog-content-padding: var(--ha-space-6);
      }
      ha-form {
        display: block;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-edit-shortcut": DialogEditShortcut;
  }
}
