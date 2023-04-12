import "@material/mwc-button";
import "@material/mwc-list";
import { mdiClose } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-check-list-item";
import "../../../components/search-input";
import {
  computeEntityRegistryName,
  ExtEntityRegistryEntry,
} from "../../../data/entity_registry";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import "./entity-voice-settings";
import { ExposeEntityDialogParams } from "./show-dialog-expose-entity";

@customElement("dialog-expose-entity")
class DialogExposeEntity extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: ExposeEntityDialogParams;

  @state() private _filter?: string;

  @state() private _selected: string[] = [];

  public async showDialog(params: ExposeEntityDialogParams): Promise<void> {
    this._params = params;
  }

  public closeDialog(): void {
    this._params = undefined;
    this._selected = [];
    this._filter = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._params) {
      return nothing;
    }

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${this.hass.localize(
          "ui.panel.config.voice_assistants.expose.expose_dialog.header"
        )}
      >
        <div slot="heading">
          <h2 class="header">
            ${this.hass.localize(
              "ui.panel.config.voice_assistants.expose.expose_dialog.header"
            )}
          </h2>
          <ha-icon-button
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            dialogAction="close"
            class="header_button"
          ></ha-icon-button>
          <search-input
            .hass=${this.hass}
            .filter=${this._filter}
            @value-changed=${this._filterChanged}
          ></search-input>
        </div>
        <mwc-list multi>
          ${this._filterEntities(
            this._params.extendedEntities,
            this._filter
          ).map((entity) => this._renderItem(entity))}
        </mwc-list>
        <mwc-button
          slot="primaryAction"
          @click=${this._expose}
          .disabled=${this._selected.length === 0}
        >
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.expose.expose_dialog.expose_entities",
            { count: this._selected.length }
          )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _handleSelected(ev) {
    if (ev.detail.source !== "property") {
      return;
    }
    const entityId = ev.target.value;
    if (ev.detail.selected) {
      if (this._selected.includes(entityId)) {
        return;
      }
      this._selected = [...this._selected, entityId];
    } else {
      this._selected = this._selected.filter((item) => item !== entityId);
    }
  }

  private _filterChanged(e) {
    this._filter = e.detail.value;
  }

  private _filterEntities = memoizeOne(
    (RegEntries: Record<string, ExtEntityRegistryEntry>, filter?: string) =>
      Object.values(RegEntries).filter(
        (entity) =>
          this._params!.filterAssistants.some(
            (ass) => !entity.options?.[ass]?.should_expose
          ) &&
          (!filter ||
            entity.entity_id.includes(filter) ||
            computeEntityRegistryName(this.hass!, entity)?.includes(filter))
      )
  );

  private _renderItem = (entity: ExtEntityRegistryEntry) => {
    const entityState = this.hass.states[entity.entity_id];
    return html`<ha-check-list-item
      graphic="icon"
      .value=${entity.entity_id}
      .selected=${this._selected.includes(entity.entity_id)}
      @request-selected=${this._handleSelected}
    >
      <ha-state-icon
        title=${ifDefined(entityState?.state)}
        slot="graphic"
        .state=${entityState}
      ></ha-state-icon>
      ${computeEntityRegistryName(this.hass!, entity)}
    </ha-check-list-item>`;
  };

  private _expose() {
    this._params!.exposeEntities(this._selected);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        search-input {
          width: 100%;
          display: block;
          padding: 24px 16px 0;
          box-sizing: border-box;
        }
        .header {
          pointer-events: auto;
          -webkit-font-smoothing: antialiased;
          font-family: var(
            --mdc-typography-headline6-font-family,
            var(--mdc-typography-font-family, Roboto, sans-serif)
          );
          font-size: var(--mdc-typography-headline6-font-size, 1.25rem);
          line-height: var(--mdc-typography-headline6-line-height, 2rem);
          font-weight: var(--mdc-typography-headline6-font-weight, 500);
          letter-spacing: var(
            --mdc-typography-headline6-letter-spacing,
            0.0125em
          );
          text-decoration: var(
            --mdc-typography-headline6-text-decoration,
            inherit
          );
          text-transform: var(
            --mdc-typography-headline6-text-transform,
            inherit
          );
          display: block;
          position: relative;
          flex-shrink: 0;
          box-sizing: border-box;
          margin: 0 0 1px;
          padding: 24px 24px 0 24px;
          padding-bottom: 15px;
          color: var(--mdc-dialog-heading-ink-color, rgba(0, 0, 0, 0.87));
          border-bottom: 1px solid rgba(0, 0, 0, 0.12);
          margin-bottom: 0;
          border-color: var(
            --mdc-dialog-scroll-divider-color,
            rgba(0, 0, 0, 0.12)
          );
        }
        .header_button {
          position: absolute;
          right: 16px;
          top: 14px;
          text-decoration: none;
          color: inherit;
        }
        .header_button {
          inset-inline-start: initial;
          inset-inline-end: 16px;
          direction: var(--direction);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-expose-entity": DialogExposeEntity;
  }
}
