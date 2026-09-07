import { mdiDelete, mdiPencil, mdiRemote } from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import type { HASSDomEvent } from "../../../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../../../common/translations/localize";
import type {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../../../components/data-table/ha-data-table";
import "../../../../../components/ha-button";
import "../../../../../components/ha-icon-overflow-menu";
import "../../../../../components/ha-svg-icon";
import type { InfraredCommand } from "../../../../../data/infrared";
import {
  createInfraredCommand,
  deleteInfraredCommand,
  subscribeInfraredCommands,
  subscribeInfraredReceiver,
  updateInfraredCommand,
} from "../../../../../data/infrared";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-tabs-subpage-data-table";
import type { PageNavigation } from "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import { showInfraredRecordCommandDialog } from "./show-dialog-infrared-record-command";

@customElement("infrared-commands-page")
export class InfraredCommandsPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @state() private _commands: InfraredCommand[] = [];

  private _tabs: PageNavigation[] = [
    {
      translationKey: "ui.panel.config.infrared.commands_navigation",
      path: "/config/infrared/commands",
    },
  ];

  public hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeInfraredCommands(this.hass, (commands) => {
        this._commands = commands;
      }),
    ];
  }

  private _columns = memoizeOne(
    (localize: LocalizeFunc): DataTableColumnContainer<InfraredCommand> => ({
      name: {
        title: localize("ui.panel.config.infrared.name"),
        main: true,
        sortable: true,
        filterable: true,
        flex: 2,
        direction: "asc",
      },
      actions: {
        lastFixed: true,
        title: "",
        label: localize("ui.panel.config.generic.headers.actions"),
        type: "overflow-menu",
        showNarrow: true,
        template: (command) => html`
          <ha-icon-overflow-menu
            narrow
            .items=${[
              {
                path: mdiPencil,
                label: localize("ui.common.rename"),
                action: () => this._rename(command),
              },
              {
                path: mdiDelete,
                warning: true,
                label: localize("ui.common.delete"),
                action: () => this._delete(command),
              },
            ]}
          ></ha-icon-overflow-menu>
        `,
      },
    })
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${this._tabs}
        back-path="/config/infrared"
        clickable
        has-fab
        .columns=${this._columns(this.hass.localize)}
        .data=${this._commands}
        .noDataText=${this.hass.localize(
          "ui.panel.config.infrared.no_commands"
        )}
        @row-click=${this._handleRowClicked}
      >
        <ha-button slot="fab" size="l" @click=${this._record}>
          <ha-svg-icon slot="start" .path=${mdiRemote}></ha-svg-icon>
          ${this.hass.localize("ui.panel.config.infrared.record.button")}
        </ha-button>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const command = this._commands.find((item) => item.id === ev.detail.id);
    if (command) {
      this._rename(command);
    }
  }

  private _record() {
    showInfraredRecordCommandDialog(this, {
      commands: this._commands,
      subscribeReceiver: (entityId, callback) =>
        subscribeInfraredReceiver(this.hass, entityId, callback),
      createCommand: (values) => createInfraredCommand(this.hass, values),
    });
  }

  private async _rename(command: InfraredCommand) {
    const name = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.infrared.rename.title"),
      inputLabel: this.hass.localize("ui.panel.config.infrared.name"),
      defaultValue: command.name,
      confirmText: this.hass.localize("ui.common.save"),
    });
    if (!name || name === command.name) {
      return;
    }
    try {
      await updateInfraredCommand(this.hass, command.id, { name });
    } catch (err: any) {
      showAlertDialog(this, { text: err?.message || "Unknown error" });
    }
  }

  private async _delete(command: InfraredCommand) {
    if (
      !(await showConfirmationDialog(this, {
        title: this.hass.localize("ui.panel.config.infrared.delete.title"),
        text: this.hass.localize("ui.panel.config.infrared.delete.text", {
          name: command.name,
        }),
        confirmText: this.hass.localize("ui.common.delete"),
        dismissText: this.hass.localize("ui.common.cancel"),
        destructive: true,
      }))
    ) {
      return;
    }
    try {
      await deleteInfraredCommand(this.hass, command.id);
    } catch (err: any) {
      showAlertDialog(this, { text: err?.message || "Unknown error" });
    }
  }

  static styles: CSSResultGroup = haStyle;
}

declare global {
  interface HTMLElementTagNameMap {
    "infrared-commands-page": InfraredCommandsPage;
  }
}
