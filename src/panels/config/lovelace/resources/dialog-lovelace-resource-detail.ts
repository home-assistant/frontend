import "@material/mwc-button/mwc-button";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { mdiClose } from "@mdi/js";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-form/ha-form";
import "../../../../components/ha-icon-button";
import type { SchemaUnion } from "../../../../components/ha-form/types";
import type { LovelaceResourcesMutableParams } from "../../../../data/lovelace/resource";
import type { HomeAssistant } from "../../../../types";
import type { LovelaceResourceDetailsDialogParams } from "./show-dialog-lovelace-resource-detail";

const detectResourceType = (url?: string) => {
  if (!url) {
    return undefined;
  }
  const ext = url.split(".").pop() || "";

  if (ext === "css") {
    return "css";
  }

  if (ext === "js") {
    return "module";
  }

  return undefined;
};

@customElement("dialog-lovelace-resource-detail")
export class DialogLovelaceResourceDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: LovelaceResourceDetailsDialogParams;

  @state() private _data?: Partial<LovelaceResourcesMutableParams>;

  @state() private _error?: Record<string, string>;

  @state() private _submitting = false;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(params: LovelaceResourceDetailsDialogParams): void {
    this._params = params;
    this._error = undefined;
    if (this._params.resource) {
      this._data = {
        url: this._params.resource.url,
        res_type: this._params.resource.type,
      };
    } else {
      this._data = {
        url: "",
      };
    }
  }

  private _dialogClosed(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const urlInvalid = !this._data?.url || this._data.url.trim() === "";

    const dialogTitle =
      this._params.resource?.url ||
      this.hass!.localize(
        "ui.panel.config.lovelace.resources.detail.new_resource"
      );

    const ariaLabel = this._params.resource?.url
      ? this.hass!.localize(
          "ui.panel.config.lovelace.resources.detail.edit_resource"
        )
      : this.hass!.localize(
          "ui.panel.config.lovelace.resources.detail.new_resource"
        );

    return html`
      <ha-md-dialog
        open
        disable-cancel-action
        @closed=${this._dialogClosed}
        .ariaLabel=${ariaLabel}
      >
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}> ${dialogTitle} </span>
        </ha-dialog-header>
        <div slot="content">
          <ha-alert
            alert-type="warning"
            .title=${this.hass!.localize(
              "ui.panel.config.lovelace.resources.detail.warning_header"
            )}
          >
            ${this.hass!.localize(
              "ui.panel.config.lovelace.resources.detail.warning_text"
            )}
          </ha-alert>

          <ha-form
            .schema=${this._schema(this._data)}
            .data=${this._data}
            .hass=${this.hass}
            .error=${this._error}
            .computeLabel=${this._computeLabel}
            @value-changed=${this._valueChanged}
          ></ha-form>
        </div>
        <div slot="actions">
          <mwc-button @click=${this.closeDialog}>
            ${this.hass!.localize("ui.common.cancel")}
          </mwc-button>
          <mwc-button
            @click=${this._updateResource}
            .disabled=${urlInvalid || !this._data?.res_type || this._submitting}
          >
            ${this._params.resource
              ? this.hass!.localize(
                  "ui.panel.config.lovelace.resources.detail.update"
                )
              : this.hass!.localize(
                  "ui.panel.config.lovelace.resources.detail.create"
                )}
          </mwc-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _schema = memoizeOne(
    (data) =>
      [
        {
          name: "url",
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: "res_type",
          required: true,
          selector: {
            select: {
              options: [
                {
                  value: "module",
                  label: this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.module"
                  ),
                },
                {
                  value: "css",
                  label: this.hass!.localize(
                    "ui.panel.config.lovelace.resources.types.css"
                  ),
                },
                ...(data.type === "js"
                  ? ([
                      {
                        value: "js",
                        label: this.hass!.localize(
                          "ui.panel.config.lovelace.resources.types.js"
                        ),
                      },
                    ] as const)
                  : []),
                ...(data.type === "html"
                  ? ([
                      {
                        value: "html",
                        label: this.hass!.localize(
                          "ui.panel.config.lovelace.resources.types.html"
                        ),
                      },
                    ] as const)
                  : []),
              ],
            },
          },
        },
      ] as const
  );

  private _computeLabel = (
    entry: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.lovelace.resources.detail.${
        entry.name === "res_type" ? "type" : entry.name
      }`
    );

  private _valueChanged(ev: CustomEvent) {
    this._data = ev.detail.value;
    if (!this._data!.res_type) {
      const type = detectResourceType(this._data!.url);
      if (!type) {
        return;
      }
      this._data = {
        ...this._data,
        res_type: type,
      };
    }
  }

  private async _updateResource() {
    if (!this._data?.res_type) {
      return;
    }

    this._submitting = true;
    try {
      if (this._params!.resource) {
        await this._params!.updateResource(this._data!);
      } else {
        await this._params!.createResource(
          this._data! as LovelaceResourcesMutableParams
        );
      }
      this._params = undefined;
    } catch (err: any) {
      this._error = { base: err?.message || "Unknown error" };
    } finally {
      this._submitting = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-resource-detail": DialogLovelaceResourceDetail;
  }
}
