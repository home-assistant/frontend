import {
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPencil,
  mdiPencilOff,
  mdiPlay,
  mdiPlus,
} from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { DataTableColumnContainer } from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import { forwardHaptic } from "../../../data/haptics";
import { activateScene, SceneEntity } from "../../../data/scene";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";

@customElement("ha-scene-dashboard")
class HaSceneDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public route!: Route;

  @property() public scenes!: SceneEntity[];

  @property() private _activeFilters?: string[];

  @state() private _filteredScenes?: string[] | null;

  @state() private _filterValue?;

  private _scenes = memoizeOne(
    (scenes: SceneEntity[], filteredScenes?: string[] | null) => {
      if (filteredScenes === null) {
        return [];
      }
      return (
        filteredScenes
          ? scenes.filter((scene) => filteredScenes!.includes(scene.entity_id))
          : scenes
      ).map((scene) => ({
        ...scene,
        name: computeStateName(scene),
      }));
    }
  );

  private _columns = memoizeOne(
    (_language): DataTableColumnContainer => ({
      activate: {
        title: "",
        type: "icon-button",
        template: (_toggle, scene) =>
          html`
            <ha-icon-button
              .scene=${scene}
              .label=${this.hass.localize(
                "ui.panel.config.scene.picker.activate_scene"
              )}
              .path=${mdiPlay}
              @click=${this._activateScene}
            ></ha-icon-button>
          `,
      },
      icon: {
        title: "",
        type: "icon",
        template: (_, scene) =>
          html` <ha-state-icon .state=${scene}></ha-state-icon> `,
      },
      name: {
        title: this.hass.localize("ui.panel.config.scene.picker.headers.name"),
        sortable: true,
        filterable: true,
        direction: "asc",
        grows: true,
      },
      info: {
        title: "",
        type: "icon-button",
        template: (_info, scene) => html`
          <ha-icon-button
            .scene=${scene}
            @click=${this._showInfo}
            .label=${this.hass.localize(
              "ui.panel.config.scene.picker.show_info_scene"
            )}
            .path=${mdiInformationOutline}
          ></ha-icon-button>
        `,
      },
      edit: {
        title: "",
        type: "icon-button",
        template: (_info, scene: any) => html`
          <a
            href=${ifDefined(
              scene.attributes.id
                ? `/config/scene/edit/${scene.attributes.id}`
                : undefined
            )}
          >
            <ha-icon-button
              .disabled=${!scene.attributes.id}
              .label=${this.hass.localize(
                "ui.panel.config.scene.picker.edit_scene"
              )}
              .path=${scene.attributes.id ? mdiPencil : mdiPencilOff}
            ></ha-icon-button>
          </a>
          ${!scene.attributes.id
            ? html`
                <paper-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.scene.picker.only_editable"
                  )}
                </paper-tooltip>
              `
            : ""}
        `,
      },
    })
  );

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage-data-table
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .route=${this.route}
        .tabs=${configSections.automation}
        .columns=${this._columns(this.hass.language)}
        id="entity_id"
        .data=${this._scenes(this.scenes, this._filteredScenes)}
        .activeFilters=${this._activeFilters}
        .noDataText=${this.hass.localize(
          "ui.panel.config.scene.picker.no_scenes"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
        ></ha-icon-button>
        <ha-button-related-filter-menu
          slot="filter-menu"
          corner="BOTTOM_START"
          .narrow=${this.narrow}
          .hass=${this.hass}
          .value=${this._filterValue}
          exclude-domains='["scene"]'
          @related-changed=${this._relatedFilterChanged}
        >
        </ha-button-related-filter-menu>
        <a href="/config/scene/edit/new" slot="fab">
          <ha-fab
            .label=${this.hass.localize(
              "ui.panel.config.scene.picker.add_scene"
            )}
            extended
          >
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
          </ha-fab>
        </a>
      </hass-tabs-subpage-data-table>
    `;
  }

  private _relatedFilterChanged(ev: CustomEvent) {
    this._filterValue = ev.detail.value;
    if (!this._filterValue) {
      this._clearFilter();
      return;
    }
    this._activeFilters = [ev.detail.filter];
    this._filteredScenes = ev.detail.items.scene || null;
  }

  private _clearFilter() {
    this._filteredScenes = undefined;
    this._activeFilters = undefined;
    this._filterValue = undefined;
  }

  private _showInfo(ev) {
    ev.stopPropagation();
    const entityId = ev.currentTarget.scene.entity_id;
    fireEvent(this, "hass-more-info", { entityId });
  }

  private _activateScene = async (ev) => {
    ev.stopPropagation();
    const scene = ev.currentTarget.scene as SceneEntity;
    await activateScene(this.hass, scene.entity_id);
    showToast(this, {
      message: this.hass.localize(
        "ui.panel.config.scene.activated",
        "name",
        computeStateName(scene)
      ),
    });
    forwardHaptic("light");
  };

  private _showHelp() {
    showAlertDialog(this, {
      title: this.hass.localize("ui.panel.config.scene.picker.header"),
      text: html`
        ${this.hass.localize("ui.panel.config.scene.picker.introduction")}
        <p>
          <a
            href=${documentationUrl(this.hass, "/docs/scene/editor/")}
            target="_blank"
            rel="noreferrer"
          >
            ${this.hass.localize("ui.panel.config.scene.picker.learn_more")}
          </a>
        </p>
      `,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-scene-dashboard": HaSceneDashboard;
  }
}
