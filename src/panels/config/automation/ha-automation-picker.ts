import "@material/mwc-fab";
import "@material/mwc-icon-button";
import { mdiPlus, mdiHelpCircle } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { ifDefined } from "lit-html/directives/if-defined";
import memoizeOne from "memoize-one";
import { formatDateTime } from "../../../common/datetime/format_date_time";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../components/entity/ha-entity-toggle";
import "../../../components/ha-svg-icon";
import { AutomationEntity, triggerAutomation } from "../../../data/automation";
import { UNAVAILABLE_STATES } from "../../../data/entity";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { configSections } from "../ha-panel-config";
import { documentationUrl } from "../../../util/documentation-url";
import { showNewAutomationDialog } from "./show-dialog-new-automation";
import { navigate } from "../../../common/navigate";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";

@customElement("ha-automation-picker")
class HaAutomationPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public narrow!: boolean;

  @property() public route!: Route;

  @property() public automations!: AutomationEntity[];

  private _automations = memoizeOne((automations: AutomationEntity[]) => {
    return automations.map((automation) => {
      return {
        ...automation,
        name: computeStateName(automation),
      };
    });
  });

  private _columns = memoizeOne(
    (narrow: boolean, _language): DataTableColumnContainer => {
      const columns: DataTableColumnContainer = {
        toggle: {
          title: "",
          type: "icon",
          template: (_toggle, automation: any) =>
            html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${automation}
              ></ha-entity-toggle>
            `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.automation.picker.headers.name"
          ),
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
          template: (name, automation: any) => html`
            ${name}
            <div class="secondary">
              ${this.hass.localize("ui.card.automation.last_triggered")}:
              ${automation.attributes.last_triggered
                ? formatDateTime(
                    new Date(automation.attributes.last_triggered),
                    this.hass.language
                  )
                : this.hass.localize("ui.components.relative_time.never")}
            </div>
          `,
        },
      };
      if (!narrow) {
        columns.execute = {
          title: "",
          template: (_info, automation: any) => html`
            <mwc-button
              .automation=${automation}
              @click=${(ev) => this._execute(ev)}
              .disabled=${UNAVAILABLE_STATES.includes(automation.state)}
            >
              ${this.hass.localize("ui.card.automation.trigger")}
            </mwc-button>
          `,
        };
      }
      columns.info = {
        title: "",
        type: "icon-button",
        template: (_info, automation) => html`
          <ha-icon-button
            .automation=${automation}
            @click=${this._showInfo}
            icon="hass:information-outline"
            title="${this.hass.localize(
              "ui.panel.config.automation.picker.show_info_automation"
            )}"
          ></ha-icon-button>
        `,
      };
      columns.edit = {
        title: "",
        type: "icon-button",
        template: (_info, automation: any) => html`
          <a
            href=${ifDefined(
              automation.attributes.id
                ? `/config/automation/edit/${automation.attributes.id}`
                : undefined
            )}
          >
            <ha-icon-button
              .icon=${automation.attributes.id
                ? "hass:pencil"
                : "hass:pencil-off"}
              .disabled=${!automation.attributes.id}
              title="${this.hass.localize(
                "ui.panel.config.automation.picker.show_info_automation"
              )}"
            ></ha-icon-button>
          </a>
          ${!automation.attributes.id
            ? html`
                <paper-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.automation.picker.only_editable"
                  )}
                </paper-tooltip>
              `
            : ""}
        `,
      };
      return columns;
    }
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.narrow, this.hass.language)}
        .data=${this._automations(this.automations)}
        id="entity_id"
        .noDataText=${this.hass.localize(
          "ui.panel.config.automation.picker.no_automations"
        )}
        hasFab
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._showHelp}>
          <ha-svg-icon .path=${mdiHelpCircle}></ha-svg-icon>
        </mwc-icon-button>
        <mwc-fab
          slot="fab"
          .label=${this.hass.localize(
            "ui.panel.config.automation.picker.add_automation"
          )}
          extended
          @click=${this._createNew}
        >
          <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
        </mwc-fab>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.automation.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.automation.caption"),
      text: html`
        ${this.hass.localize("ui.panel.config.automation.picker.introduction")}
        <p>
          <a
            href="${documentationUrl(this.hass, "/docs/automation/editor/")}"
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize(
              "ui.panel.config.automation.picker.learn_more"
            )}
          </a>
        </p>
      `,
    });
  }

  private _execute(ev) {
    const entityId = ev.currentTarget.automation.entity_id;
    triggerAutomation(this.hass, entityId);
  }

  private _createNew() {
    if (
      isComponentLoaded(this.hass, "cloud") ||
      isComponentLoaded(this.hass, "blueprint")
    ) {
      showNewAutomationDialog(this);
    } else {
      navigate(this, "/config/automation/edit/new");
    }
  }

  static get styles(): CSSResult {
    return haStyle;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-picker": HaAutomationPicker;
  }
}
