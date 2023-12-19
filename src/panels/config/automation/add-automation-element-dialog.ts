import "@material/mwc-list/mwc-list";
import { mdiClose, mdiContentPaste, mdiPlus } from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { stringCompare } from "../../../common/string/compare";
import { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-header-bar";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-button-prev";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import {
  ACTION_BUILDING_BLOCKS_GROUPS,
  ACTION_GROUPS,
  ACTION_ICONS,
} from "../../../data/action";
import { AutomationElementGroup } from "../../../data/automation";
import {
  CONDITION_BUILDING_BLOCKS_GROUPS,
  CONDITION_GROUPS,
  CONDITION_ICONS,
} from "../../../data/condition";
import { TRIGGER_GROUPS, TRIGGER_ICONS } from "../../../data/trigger";
import { HassDialog } from "../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import {
  AddAutomationElementDialogParams,
  PASTE_VALUE,
} from "./show-add-automation-element-dialog";

const TYPES = {
  trigger: { groups: TRIGGER_GROUPS, icons: TRIGGER_ICONS },
  condition: {
    groups: CONDITION_GROUPS,
    building_blocks: CONDITION_BUILDING_BLOCKS_GROUPS,
    icons: CONDITION_ICONS,
  },
  action: {
    groups: ACTION_GROUPS,
    building_blocks: ACTION_BUILDING_BLOCKS_GROUPS,
    icons: ACTION_ICONS,
  },
};

@customElement("add-automation-element-dialog")
class DialogAddAutomationElement extends LitElement implements HassDialog {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: AddAutomationElementDialogParams;

  @state() private _group?: string;

  @state() private _prev?: string;

  public showDialog(params): void {
    this._params = params;
  }

  public closeDialog(): void {
    if (this._params) {
      fireEvent(this, "dialog-closed", { dialog: this.localName });
    }
    this._params = undefined;
    this._group = undefined;
    this._prev = undefined;
  }

  private _processedTypes = memoizeOne(
    (
      type: AddAutomationElementDialogParams["type"],
      buildingBlocks: AddAutomationElementDialogParams["building_block"],
      group: string | undefined,
      localize: LocalizeFunc
    ): {
      key: string;
      name: string;
      description: string;
      icon: string;
      group: boolean;
    }[] => {
      const groupKey = buildingBlocks ? "building_blocks" : "groups";
      const groups: AutomationElementGroup = group
        ? TYPES[type][groupKey][group].members
        : TYPES[type][groupKey];

      return Object.entries(groups)
        .map(([key, options]) => ({
          group: Boolean(options.members),
          key,
          name: localize(
            // @ts-ignore
            `ui.panel.config.automation.editor.${type}s.${
              options.members ? "groups" : "type"
            }.${key}.label`
          ),
          description: localize(
            // @ts-ignore
            `ui.panel.config.automation.editor.${type}s.${
              options.members ? "groups" : "type"
            }.${key}.description${options.members ? "" : ".picker"}`
          ),
          icon: options.icon || TYPES[type].icons[key],
        }))
        .sort((a, b) => {
          if (a.group && b.group) {
            return 0;
          }
          if (a.group && !b.group) {
            return 1;
          }
          if (!a.group && b.group) {
            return -1;
          }
          return stringCompare(a.name, b.name, this.hass.locale.language);
        });
    }
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const items = this._processedTypes(
      this._params.type,
      this._params.building_block,
      this._group,
      this.hass.localize
    );

    return html`
      <ha-dialog open hideActions @closed=${this.closeDialog} .heading=${true}>
        <div slot="heading">
          <ha-header-bar>
            <span slot="title"
              >${this._group
                ? this.hass.localize(
                    // @ts-ignore
                    `ui.panel.config.automation.editor.${this._params.type}s.groups.${this._group}.label`
                  )
                : this.hass.localize(
                    `ui.panel.config.automation.editor.${this._params.type}s.add`
                  )}</span
            >
            ${this._group
              ? html`<ha-icon-button-prev
                  slot="navigationIcon"
                  @click=${this._back}
                ></ha-icon-button-prev>`
              : html`<ha-icon-button
                  .path=${mdiClose}
                  slot="navigationIcon"
                  dialogAction="cancel"
                ></ha-icon-button>`}
          </ha-header-bar>
        </div>
        <mwc-list
          innerRole="listbox"
          itemRoles="option"
          rootTabbable
          dialogInitialFocus
        >
          ${this._params.clipboardItem &&
          (!this._group ||
            items.find((item) => item.key === this._params!.clipboardItem))
            ? html`<ha-list-item
                twoline
                activated
                class="paste"
                .value=${PASTE_VALUE}
                graphic="icon"
                hasMeta
                @request-selected=${this._selected}
              >
                ${this.hass.localize(
                  `ui.panel.config.automation.editor.${this._params.type}s.paste`
                )}
                <span slot="secondary"
                  >${this.hass.localize(
                    // @ts-ignore
                    `ui.panel.config.automation.editor.${this._params.type}s.type.${this._params.clipboardItem}.label`
                  )}</span
                >
                <ha-svg-icon
                  slot="graphic"
                  .path=${mdiContentPaste}
                ></ha-svg-icon
                ><ha-svg-icon slot="meta" .path=${mdiPlus}></ha-svg-icon>
              </ha-list-item>`
            : ""}
          ${items.map(
            (item) => html`
              <ha-list-item
                .twoline=${Boolean(item.description)}
                .value=${item.key}
                .group=${item.group}
                graphic="icon"
                hasMeta
                @request-selected=${this._selected}
              >
                ${item.name}
                <span slot="secondary">${item.description}</span>
                <ha-svg-icon slot="graphic" .path=${item.icon}></ha-svg-icon>
                ${item.group
                  ? html`<ha-icon-next slot="meta"></ha-icon-next>`
                  : html`<ha-svg-icon
                      slot="meta"
                      .path=${mdiPlus}
                    ></ha-svg-icon>`}
              </ha-list-item>
            `
          )}
        </mwc-list>
      </ha-dialog>
    `;
  }

  private _back() {
    if (this._prev) {
      this._group = this._prev;
      this._prev = undefined;
      return;
    }
    this._group = undefined;
  }

  private _selected(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const item = ev.currentTarget;
    if (item.group) {
      this._prev = this._group;
      this._group = item.value;
      return;
    }
    this._params!.add(item.value);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
          --mdc-dialog-max-height: 60vh;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
          }
        }
        ha-header-bar {
          --mdc-theme-on-primary: var(--primary-text-color);
          --mdc-theme-primary: var(--mdc-theme-surface);
          margin-top: 8px;
          display: block;
        }
        ha-icon-next {
          width: 24px;
        }
        .paste {
          --mdc-theme-primary: var(--primary-text-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "add-automation-element-dialog": DialogAddAutomationElement;
  }
}
