import {
  mdiContentDuplicate,
  mdiDelete,
  mdiHelpCircle,
  mdiInformationOutline,
  mdiPencilOff,
  mdiPlay,
  mdiPlus,
} from "@mdi/js";
import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { differenceInDays } from "date-fns/esm";
import { fireEvent, HASSDomEvent } from "../../../common/dom/fire_event";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { navigate } from "../../../common/navigate";
import {
  DataTableColumnContainer,
  RowClickedEvent,
} from "../../../components/data-table/ha-data-table";
import "../../../components/ha-button-related-filter-menu";
import "../../../components/ha-fab";
import "../../../components/ha-icon-button";
import "../../../components/ha-state-icon";
import "../../../components/ha-svg-icon";
import "../../../components/ha-icon-overflow-menu";
import { forwardHaptic } from "../../../data/haptics";
import {
  activateScene,
  deleteScene,
  getSceneConfig,
  SceneEntity,
  showSceneEditor,
} from "../../../data/scene";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-tabs-subpage-data-table";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { showToast } from "../../../util/toast";
import { configSections } from "../ha-panel-config";
import { formatShortDateTime } from "../../../common/datetime/format_date_time";
import { relativeTime } from "../../../common/datetime/relative_time";
import { isUnavailableState } from "../../../data/entity";

type SceneItem = SceneEntity & {
  name: string;
};

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
    (scenes: SceneEntity[], filteredScenes?: string[] | null): SceneItem[] => {
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
    (_language, narrow): DataTableColumnContainer => {
      const columns: DataTableColumnContainer<SceneItem> = {
        icon: {
          title: "",
          label: this.hass.localize(
            "ui.panel.config.scene.picker.headers.state"
          ),
          type: "icon",
          template: (scene) => html`
            <ha-state-icon .state=${scene}></ha-state-icon>
          `,
        },
        name: {
          title: this.hass.localize(
            "ui.panel.config.scene.picker.headers.name"
          ),
          main: true,
          sortable: true,
          filterable: true,
          direction: "asc",
          grows: true,
        },
      };
      if (!narrow) {
        columns.state = {
          title: this.hass.localize(
            "ui.panel.config.scene.picker.headers.last_activated"
          ),
          sortable: true,
          width: "30%",
          template: (scene) => {
            const lastActivated = scene.state;
            if (!lastActivated || isUnavailableState(lastActivated)) {
              return this.hass.localize("ui.components.relative_time.never");
            }
            const date = new Date(scene.state);
            const now = new Date();
            const dayDifference = differenceInDays(now, date);
            return html`
              ${dayDifference > 3
                ? formatShortDateTime(date, this.hass.locale, this.hass.config)
                : relativeTime(date, this.hass.locale)}
            `;
          },
        };
      }
      columns.only_editable = {
        title: "",
        width: "56px",
        template: (scene) =>
          !scene.attributes.id
            ? html`
                <simple-tooltip animation-delay="0" position="left">
                  ${this.hass.localize(
                    "ui.panel.config.scene.picker.only_editable"
                  )}
                </simple-tooltip>
                <ha-svg-icon
                  .path=${mdiPencilOff}
                  style="color: var(--secondary-text-color)"
                ></ha-svg-icon>
              `
            : "",
      };
      columns.actions = {
        title: "",
        width: "72px",
        type: "overflow-menu",
        template: (scene) => html`
          <ha-icon-overflow-menu
            .hass=${this.hass}
            narrow
            .items=${[
              {
                path: mdiInformationOutline,
                label: this.hass.localize(
                  "ui.panel.config.scene.picker.show_info"
                ),
                action: () => this._showInfo(scene),
              },
              {
                path: mdiPlay,
                label: this.hass.localize(
                  "ui.panel.config.scene.picker.activate"
                ),
                action: () => this._activateScene(scene),
              },
              {
                divider: true,
              },
              {
                path: mdiContentDuplicate,
                label: this.hass.localize(
                  "ui.panel.config.scene.picker.duplicate"
                ),
                action: () => this._duplicate(scene),
                disabled: !scene.attributes.id,
              },
              {
                label: this.hass.localize(
                  "ui.panel.config.scene.picker.delete"
                ),
                path: mdiDelete,
                action: () => this._deleteConfirm(scene),
                warning: scene.attributes.id,
                disabled: !scene.attributes.id,
              },
            ]}
          >
          </ha-icon-overflow-menu>
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
        .tabs=${configSections.automations}
        .columns=${this._columns(this.hass.locale, this.narrow)}
        id="entity_id"
        .data=${this._scenes(this.scenes, this._filteredScenes)}
        .activeFilters=${this._activeFilters}
        .noDataText=${this.hass.localize(
          "ui.panel.config.scene.picker.no_scenes"
        )}
        @clear-filter=${this._clearFilter}
        hasFab
        clickable
        @row-click=${this._handleRowClicked}
      >
        <ha-icon-button
          slot="toolbar-icon"
          @click=${this._showHelp}
          .label=${this.hass.localize("ui.common.help")}
          .path=${mdiHelpCircle}
        ></ha-icon-button>
        <ha-button-related-filter-menu
          slot="filter-menu"
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

  private _handleRowClicked(ev: HASSDomEvent<RowClickedEvent>) {
    const scene = this.scenes.find((a) => a.entity_id === ev.detail.id);

    if (scene?.attributes.id) {
      navigate(`/config/scene/edit/${scene?.attributes.id}`);
    }
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

  private _showInfo(scene: SceneEntity) {
    fireEvent(this, "hass-more-info", { entityId: scene.entity_id });
  }

  private _activateScene = async (scene: SceneEntity) => {
    await activateScene(this.hass, scene.entity_id);
    showToast(this, {
      message: this.hass.localize("ui.panel.config.scene.activated", {
        name: computeStateName(scene),
      }),
    });
    forwardHaptic("light");
  };

  private _deleteConfirm(scene: SceneEntity): void {
    showConfirmationDialog(this, {
      title: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_title"
      ),
      text: this.hass!.localize(
        "ui.panel.config.scene.picker.delete_confirm_text",
        { name: computeStateName(scene) }
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      confirm: () => this._delete(scene),
      destructive: true,
    });
  }

  private async _delete(scene: SceneEntity): Promise<void> {
    if (scene.attributes.id) {
      await deleteScene(this.hass, scene.attributes.id);
    }
  }

  private async _duplicate(scene) {
    if (scene.attributes.id) {
      const config = await getSceneConfig(this.hass, scene.attributes.id);
      showSceneEditor({
        ...config,
        id: undefined,
        name: `${config?.name} (${this.hass.localize(
          "ui.panel.config.scene.picker.duplicate"
        )})`,
      });
    }
  }

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
