import type { MarketplaceInfo } from "../../../src/data/marketplace/marketplace";
import type {
  MarketplaceRelease,
  RepositoryBase,
  RepositoryInfo,
} from "../../../src/data/marketplace/repository";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

const baseRepository = {
  can_install: true,
  config_flow: false,
  custom: false,
  domain: null,
  file_name: "",
  hide: false,
  homeassistant: null,
  installed: false,
  installed_version: "",
  local_path: "",
  new: false,
  pending_upgrade: false,
  status: "default" as const,
};

const repositories: RepositoryBase[] = [
  {
    ...baseRepository,
    id: "1",
    category: "integration",
    full_name: "AlexxIT/WebRTC",
    name: "WebRTC Camera",
    description: "Watch camera streams with low latency through WebRTC.",
    authors: ["@AlexxIT"],
    domain: "webrtc",
    config_flow: true,
    available_version: "v3.6.1",
    downloads: 98000,
    stars: 1900,
    last_updated: "2026-09-12T08:21:00Z",
    topics: ["camera", "webrtc"],
  },
  {
    ...baseRepository,
    id: "2",
    category: "integration",
    full_name: "basnijholt/adaptive-lighting",
    name: "Adaptive Lighting",
    description:
      "Change the brightness and color temperature of your lights over the day.",
    authors: ["@basnijholt"],
    domain: "adaptive_lighting",
    config_flow: true,
    available_version: "v1.26.0",
    installed: true,
    installed_version: "v1.26.0",
    status: "installed",
    downloads: 120000,
    stars: 2300,
    last_updated: "2026-08-30T17:02:00Z",
    topics: ["lights", "circadian-rhythm"],
  },
  {
    ...baseRepository,
    id: "3",
    category: "integration",
    full_name: "blakeblackshear/frigate-hass-integration",
    name: "Frigate",
    description: "Use the cameras and events of a Frigate NVR.",
    authors: ["@blakeblackshear", "@dermotduffy", "@NickM-27"],
    domain: "frigate",
    config_flow: true,
    available_version: "v5.9.0",
    installed: true,
    installed_version: "v5.8.0",
    pending_upgrade: true,
    status: "pending-upgrade",
    downloads: 150000,
    stars: 900,
    last_updated: "2026-09-25T11:45:00Z",
    topics: ["camera", "nvr"],
  },
  {
    ...baseRepository,
    id: "4",
    category: "plugin",
    full_name: "piitaya/lovelace-mushroom",
    name: "Mushroom",
    description: "A collection of cards to build a clean dashboard.",
    authors: ["@piitaya"],
    file_name: "mushroom.js",
    available_version: "v5.1.0",
    installed: true,
    installed_version: "v5.1.0",
    status: "installed",
    downloads: 310000,
    stars: 4400,
    last_updated: "2026-09-02T09:10:00Z",
    topics: ["cards", "dashboard"],
  },
  {
    ...baseRepository,
    id: "5",
    category: "plugin",
    full_name: "thomasloven/lovelace-card-mod",
    name: "card-mod",
    description: "Add CSS styles to any card of your dashboard.",
    authors: ["@thomasloven"],
    file_name: "card-mod.js",
    available_version: "v4.0.0",
    downloads: 280000,
    stars: 1500,
    last_updated: "2026-07-19T14:33:00Z",
    topics: ["css", "dashboard"],
  },
  {
    ...baseRepository,
    id: "6",
    category: "plugin",
    full_name: "custom-cards/button-card",
    name: "button-card",
    description: "A button card that you can change in almost every way.",
    authors: ["@RomRider"],
    file_name: "button-card.js",
    available_version: "v5.0.0",
    new: true,
    status: "new",
    downloads: 240000,
    stars: 2100,
    last_updated: "2026-09-28T19:05:00Z",
    topics: ["button", "cards"],
  },
  {
    ...baseRepository,
    id: "7",
    category: "theme",
    full_name: "catppuccin/home-assistant",
    name: "Catppuccin",
    description: "Soothing pastel themes for Home Assistant.",
    authors: ["@catppuccin"],
    file_name: "catppuccin.yaml",
    available_version: "v2.1.0",
    downloads: 45000,
    stars: 300,
    last_updated: "2026-06-11T07:48:00Z",
    topics: ["theme"],
  },
];

const repositoryInfo = (repository: RepositoryBase): RepositoryInfo => ({
  ...repository,
  additional_info: `# ${repository.name}\n\n${repository.description}\n\nThis is a demo. Installing is not available.`,
  default_branch: "main",
  issues: 12,
  releases: [repository.available_version],
  ref: repository.available_version,
  replaces_built_in: false,
  selected_tag: null,
  update_entity_id: null,
  version_or_commit: "version",
});

const info: MarketplaceInfo = {
  categories: ["integration", "plugin", "theme"],
  disabled_reason: null,
  github_connected: false,
  has_pending_tasks: false,
  lovelace_mode: "storage",
  stage: "running",
  startup: false,
  version: "2.0.0",
  warning_accepted: true,
};

// Commands that change the Marketplace are not mocked, so the data never
// changes and no signal fires.
export const mockMarketplace = (hass: MockHomeAssistant) => {
  hass.mockWS("marketplace/info", () => info);

  hass.mockWS("marketplace/repositories/list", () => repositories);

  hass.mockWS(
    "marketplace/repository/info",
    ({ repository_id }: { repository_id: string }) => {
      const repository = repositories.find((repo) => repo.id === repository_id);
      return repository
        ? repositoryInfo(repository)
        : Promise.reject({ code: "not_found", message: "Unknown repository" });
    }
  );

  hass.mockWS(
    "marketplace/repository/releases",
    ({ repository_id }: { repository_id: string }): MarketplaceRelease[] => {
      const repository = repositories.find((repo) => repo.id === repository_id);
      return repository
        ? [
            {
              tag: repository.available_version,
              name: repository.available_version,
              published_at: String(repository.last_updated),
              prerelease: false,
            },
          ]
        : [];
    }
  );

  hass.mockWS("marketplace/subscribe", () => () => undefined);
};
