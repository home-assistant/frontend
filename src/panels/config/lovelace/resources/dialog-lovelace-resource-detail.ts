import "@material/mwc-button/mwc-button";
import { CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import { SchemaUnion } from "../../../../components/ha-form/types";
import { LovelaceResourcesMutableParams } from "../../../../data/lovelace";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { LovelaceResourceDetailsDialogParams } from "./show-dialog-lovelace-resource-detail";

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

  public closeDialog(): void {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }
    const urlInvalid = !this._data?.url || this._data.url.trim() === "";
    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(
          this.hass,
          this._params.resource
            ? this._params.resource.url
            : this.hass!.localize(
                "ui.panel.config.lovelace.resources.detail.new_resource"
              )
        )}
      >
        <div>
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
        ${this._params.resource
          ? html`
              <mwc-button
                slot="secondaryAction"
                class="warning"
                @click=${this._deleteResource}
                .disabled=${this._submitting}
              >
                ${this.hass!.localize(
                  "ui.panel.config.lovelace.resources.detail.delete"
                )}
              </mwc-button>
            `
          : nothing}
        <mwc-button
          slot="primaryAction"
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
      </ha-dialog>
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

  private async _deleteResource() {
    this._submitting = true;
    try {
      if (await this._params!.removeResource()) {
        this.closeDialog();
      }
    } finally {
      this._submitting = false;
    }
  }

  static get styles(): CSSResultGroup {
    return haStyleDialog;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-lovelace-resource-detail": DialogLovelaceResourceDetail;
  }
}
