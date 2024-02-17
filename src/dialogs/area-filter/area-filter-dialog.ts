import "@material/mwc-list/mwc-list";
import { mdiDrag, mdiEye, mdiEyeOff } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import { fireEvent } from "../../common/dom/fire_event";
import type { AreaFilterValue } from "../../components/ha-area-filter";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-icon-button";
import "../../components/ha-list-item";
import "../../components/ha-sortable";
import { areaCompare } from "../../data/area_registry";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { HassDialog } from "../make-dialog-manager";
import { AreaFilterDialogParams } from "./show-area-filter-dialog";

@customElement("dialog-area-filter")
export class DialogAreaFilter
  extends LitElement
  implements HassDialog<AreaFilterDialogParams>
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _dialogParams?: AreaFilterDialogParams;

  @state() private _hidden: string[] = [];

  @state() private _areas: string[] = [];

  public showDialog(dialogParams: AreaFilterDialogParams): void {
    this._dialogParams = dialogParams;
    this._hidden = dialogParams.initialValue?.hidden ?? [];
    const order = dialogParams.initialValue?.order ?? [];
    const allAreas = Object.keys(this.hass!.areas);
    this._areas = allAreas.concat().sort(areaCompare(this.hass!.areas, order));
  }

  public closeDialog(): void {
    this._dialogParams = undefined;
    this._hidden = [];
    this._areas = [];
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _submit(): void {
    const order = this._areas.filter((area) => !this._hidden.includes(area));
    const value: AreaFilterValue = {
      hidden: this._hidden,
      order,
    };
    this._dialogParams?.submit?.(value);
    this.closeDialog();
  }

  private _cancel(): void {
    this._dialogParams?.cancel?.();
    this.closeDialog();
  }

  private _areaMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    const { oldIndex, newIndex } = ev.detail;

    const areas = this._areas.concat();

    const option = areas.splice(oldIndex, 1)[0];
    areas.splice(newIndex, 0, option);

    this._areas = areas;
  }

  protected render() {
    if (!this._dialogParams || !this.hass) {
      return nothing;
    }

    const allAreas = this._areas;

    return html`
      <ha-dialog
        open
        @closed=${this._cancel}
        .heading=${this._dialogParams.title ??
        this.hass.localize("ui.components.area-filter.title")}
      >
        <ha-sortable
          draggable-selector=".draggable"
          handle-selector=".handle"
          @item-moved=${this._areaMoved}
        >
          <mwc-list class="areas">
            ${repeat(
              allAreas,
              (area) => area,
              (area, _idx) => {
                const isVisible = !this._hidden.includes(area);
                const name = this.hass!.areas[area]?.name || area;
                return html`
                  <ha-list-item
                    class=${classMap({
                      hidden: !isVisible,
                      draggable: isVisible,
                    })}
                    hasMeta
                    graphic="icon"
                    noninteractive
                  >
                    ${isVisible
                      ? html`<ha-svg-icon
                          class="handle"
                          .path=${mdiDrag}
                          slot="graphic"
                        ></ha-svg-icon>`
                      : nothing}
                    ${name}
                    <ha-icon-button
                      tabindex="0"
                      class="action"
                      .path=${isVisible ? mdiEye : mdiEyeOff}
                      slot="meta"
                      .label=${this.hass!.localize(
                        `ui.components.area-filter.${
                          isVisible ? "hide" : "show"
                        }`,
                        { area: name }
                      )}
                      .area=${area}
                      @click=${this._toggle}
                    ></ha-icon-button>
                  </ha-list-item>
                `;
              }
            )}
          </mwc-list>
        </ha-sortable>
        <ha-button slot="secondaryAction" dialogAction="cancel">
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button @click=${this._submit} slot="primaryAction">
          ${this.hass.localize("ui.common.submit")}
        </ha-button>
      </ha-dialog>
    `;
  }

  _toggle(ev) {
    const area = ev.target.area;
    const hidden = [...(this._hidden ?? [])];
    if (hidden.includes(area)) {
      hidden.splice(hidden.indexOf(area), 1);
    } else {
      hidden.push(area);
    }
    this._hidden = hidden;
    const nonHiddenAreas = this._areas.filter(
      (ar) => !this._hidden.includes(ar)
    );
    const hiddenAreas = this._areas.filter((ar) => this._hidden.includes(ar));
    this._areas = [...nonHiddenAreas, ...hiddenAreas];
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          /* Place above other dialogs */
          --dialog-z-index: 104;
          --dialog-content-padding: 0;
        }
        ha-list-item {
          overflow: visible;
        }
        .hidden {
          color: var(--disabled-text-color);
        }
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
        .actions {
          display: flex;
          flex-direction: row;
        }
        ha-icon-button {
          display: block;
          margin: -12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-area-filter": DialogAreaFilter;
  }
}
