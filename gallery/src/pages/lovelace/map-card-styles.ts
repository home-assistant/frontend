import type { PropertyValues, TemplateResult } from "lit";
import { html, LitElement } from "lit";
import { customElement, query } from "lit/decorators";
import type { DemoCardConfig } from "../../components/demo-card";
import { MAP_STYLES } from "../../../../src/common/map/map-styles";
import { provideHass } from "../../../../src/fake_data/provide_hass";
import type { MapCardConfig } from "../../../../src/panels/lovelace/cards/types";
import "../../components/demo-cards";

// Apart from the map card page: every demo mounts a map of its own, and a
// browser keeps only so many WebGL contexts. Past that the newest maps fall
// back to raster tiles, which is exactly what these demos are meant to show.
const ENTITIES = [
  {
    entity_id: "zone.home",
    state: "zoning",
    attributes: {
      latitude: 32.87354,
      longitude: 117.22765,
      radius: 100,
      friendly_name: "Home",
      icon: "mdi:home",
    },
  },
];

const CONFIGS = [
  ...MAP_STYLES.map((mapStyle) => ({
    heading: `Map style: ${mapStyle}`,
    config: {
      type: "map" as const,
      map_style: mapStyle,
      default_zoom: 14,
      entities: ["zone.home"],
    },
  })),
  {
    heading: "Map style: recolored",
    config: {
      type: "map",
      map_style: {
        base: "colorful",
        recolor: {
          saturate: -0.6,
          rotate_hue: 200,
          tint: { amount: 0.3, color: "#2196f3" },
        },
      },
      default_zoom: 14,
      entities: ["zone.home"],
    },
  },
  {
    heading: "Map style: recolored, on the default style",
    config: {
      type: "map",
      map_style: { recolor: { saturate: -1 } },
      default_zoom: 14,
      entities: ["zone.home"],
    },
  },
  {
    heading: "Map style: individual colors",
    config: {
      type: "map",
      map_style: {
        base: "toner",
        colors: { water: "#b3e5fc", land: "#fffde7", roadMotorway: "#ffab91" },
      },
      default_zoom: 14,
      entities: ["zone.home"],
    },
  },
  {
    // One card for both grounds: the theme mode picks the palette, and
    // colors_dark the colors that go with it.
    heading: "Map style: colors per theme mode",
    config: {
      type: "map",
      default_zoom: 14,
      entities: ["zone.home"],
      map_style: {
        base: "colorful",
        colors: {
          background: "#f6f6f4",
          land: "#f6f6f4",
          water: "#b3ddf6",
          labelWater: "#3d7ea6",
          natureWood: "#c9e6c4",
          natureGrass: "#d6ebd2",
          naturePark: "#c3e5bd",
          natureLeisure: "#daecd6",
          natureAgriculture: "#ebf0dd",
          natureWetland: "#d3e7de",
          natureSand: "#f0ecd8",
          natureRock: "#ecebe7",
          glacier: "#ffffff",
          areaResidential: "#f1f0ed",
          areaCommercial: "#f3efee",
          areaIndustrial: "#f0efe9",
          areaWaste: "#e6e3d8",
          areaBurial: "#e2e7de",
          siteParking: "#ebe9e6",
          siteSports: "#e4efe1",
          building: "#ecebe6",
          buildingBg: "#dedcd6",
          roadStreet: "#ffffff",
          roadStreetBg: "#dcdcda",
          roadTrunk: "#fffaf0",
          roadTrunkBg: "#ded9cd",
          roadMotorway: "#ffd38f",
          roadMotorwayBg: "#e0a344",
          transitRail: "#dfe2e5",
          transitSubway: "#d8dfe6",
          transitCycle: "#e8eef2",
          transitFoot: "#ebe8ee",
          boundary: "#b9bcc4",
          boundaryDisputed: "#cdcfd6",
          label: "#3c4043",
          labelHalo: "rgba(255,255,255,0.85)",
          labelSymbol: "#5f6368",
          labelPoi: "#70757a",
          labelShield: "#ffffff",
          labelHousenumber: "rgba(60,64,67,0.35)",
        },
        colors_dark: {
          background: "#1b1e22",
          land: "#1b1e22",
          water: "#10293b",
          labelWater: "#6f93b0",
          natureWood: "#22331f",
          natureGrass: "#25341f",
          naturePark: "#233620",
          natureLeisure: "#242b22",
          natureAgriculture: "#2a2d1e",
          natureWetland: "#20322c",
          natureSand: "#2e2b1d",
          natureRock: "#2a2a27",
          glacier: "#3a4046",
          areaResidential: "#232629",
          areaCommercial: "#26262b",
          areaIndustrial: "#26251f",
          areaWaste: "#33312a",
          areaBurial: "#272b28",
          siteParking: "#27292c",
          siteSports: "#243024",
          building: "#2a2e33",
          buildingBg: "#343940",
          roadStreet: "#3c4145",
          roadStreetBg: "#262a2e",
          roadTrunk: "#3d3a31",
          roadTrunkBg: "#2a2823",
          roadMotorway: "#4d4229",
          roadMotorwayBg: "#312a1a",
          transitRail: "#2b3036",
          transitSubway: "#28303a",
          transitCycle: "#232629",
          transitFoot: "#27242b",
          boundary: "#5a6270",
          boundaryDisputed: "#454b56",
          label: "#e3e6ea",
          labelHalo: "rgba(0,0,0,0.75)",
          labelSymbol: "#9aa0a6",
          labelPoi: "#9aa0a6",
          labelShield: "#12151a",
          labelHousenumber: "rgba(227,230,234,0.35)",
        },
      },
    },
  },
] satisfies DemoCardConfig<MapCardConfig>[];

@customElement("demo-lovelace-map-card-styles")
class DemoMapStyles extends LitElement {
  @query("#demos") private _demoRoot!: HTMLElement;

  protected render(): TemplateResult {
    return html`<demo-cards id="demos" .configs=${CONFIGS}></demo-cards>`;
  }

  protected firstUpdated(changedProperties: PropertyValues<this>) {
    super.firstUpdated(changedProperties);
    const hass = provideHass(this._demoRoot);
    hass.updateTranslations(null, "en");
    hass.updateTranslations("lovelace", "en");
    hass.addEntities(ENTITIES);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "demo-lovelace-map-card-styles": DemoMapStyles;
  }
}
