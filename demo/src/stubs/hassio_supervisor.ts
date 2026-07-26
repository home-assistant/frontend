import type {
  HassioAddonDetails,
  HassioAddonInfo,
  HassioAddonsInfo,
} from "../../../src/data/hassio/addon";
import type { HassioStats } from "../../../src/data/hassio/common";
import type {
  HassioHassOSInfo,
  HassioHostInfo,
  HostDisksUsage,
} from "../../../src/data/hassio/host";
import type { NetworkInfo } from "../../../src/data/hassio/network";
import type { HassioSupervisorInfo } from "../../../src/data/hassio/supervisor";
import type { SupervisorMounts } from "../../../src/data/supervisor/mounts";
import type { SupervisorUpdateConfig } from "../../../src/data/supervisor/update";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// `icon`/`logo` are false on purpose: the panel would otherwise request
// /api/hassio/addons/<slug>/icon, which the demo has no backend for.
const DEMO_ADDONS: HassioAddonInfo[] = [
  {
    name: "Music Assistant",
    slug: "d5369777_music_assistant",
    description:
      "Music library manager for all your media sources and streaming services, with support for a wide range of players",
    advanced: false,
    available: true,
    build: false,
    detached: false,
    homeassistant: "2025.7.0",
    icon: false,
    installed: true,
    logo: false,
    repository: "d5369777",
    stage: "stable",
    state: "started",
    update_available: false,
    url: "https://github.com/music-assistant/home-assistant-addon",
    version: "2.6.3",
    version_latest: "2.6.3",
  },
  {
    name: "ESPHome Device Builder",
    slug: "5c53de3b_esphome",
    description:
      "Manage and program your ESP8266/ESP32 based microcontrollers directly via WiFi and with a simple, yet powerful configuration file syntax",
    advanced: false,
    available: true,
    build: false,
    detached: false,
    homeassistant: "2025.7.0",
    icon: false,
    installed: true,
    logo: false,
    repository: "5c53de3b",
    stage: "stable",
    state: "started",
    update_available: false,
    url: "https://esphome.io/",
    version: "2025.7.3",
    version_latest: "2025.7.3",
  },
];

const LONG_DESCRIPTIONS: Record<string, string> = {
  d5369777_music_assistant: `## Music Assistant

Music Assistant brings all your music sources together in one library and streams
them to the players you already own.

- Combines local files with streaming services into a single searchable library
- Plays to Sonos, Chromecast, AirPlay, Squeezebox, DLNA and Home Assistant media players
- Group players together for synced multi-room audio
- Exposes players and playlists to Home Assistant automations and voice assistants`,
  "5c53de3b_esphome": `## ESPHome Device Builder

ESPHome turns an ESP8266 or ESP32 into a Home Assistant device using a short YAML
configuration instead of hand-written firmware.

- Compile and flash firmware straight from the browser, over WiFi after the first flash
- Hundreds of supported sensors, displays, lights and switches
- Devices are discovered by Home Assistant automatically, with no cloud in between
- Configuration lives next to your Home Assistant config, so it is covered by backups`,
};

// Supervisor schema format (converted to selectors by the config tab). Music
// Assistant is configured in its own UI, so it has no add-on options.
const CONFIG_SCHEMAS: Record<string, HassioAddonDetails["schema"]> = {
  "5c53de3b_esphome": [
    { name: "ssl", type: "boolean", required: true },
    { name: "certfile", type: "string", required: true },
    { name: "keyfile", type: "string", required: true },
    { name: "leave_front_door_open", type: "boolean", required: false },
    { name: "status_use_ping", type: "boolean", required: false },
  ],
};

const CONFIG_OPTIONS: Record<string, Record<string, unknown>> = {
  "5c53de3b_esphome": {
    ssl: false,
    certfile: "fullchain.pem",
    keyfile: "privkey.pem",
  },
};

const addonDetails = (addon: HassioAddonInfo): HassioAddonDetails => ({
  ...addon,
  apparmor: "default",
  arch: ["aarch64", "amd64"],
  audio_input: null,
  audio_output: null,
  audio: false,
  auth_api: false,
  auto_uart: false,
  auto_update: false,
  boot: "auto",
  changelog: false,
  devices: [],
  devicetree: false,
  discovery: [],
  docker_api: false,
  documentation: false,
  full_access: false,
  gpio: false,
  hassio_api: false,
  hassio_role: "default",
  hostname: addon.slug.replace(/_/g, "-"),
  homeassistant_api: false,
  host_dbus: false,
  host_ipc: false,
  host_network: false,
  host_pid: false,
  ingress_entry: null,
  ingress_panel: false,
  ingress_url: null,
  ingress: false,
  ip_address: "172.30.33.2",
  kernel_modules: false,
  long_description: LONG_DESCRIPTIONS[addon.slug],
  machine: [],
  network_description: null,
  network: null,
  options: CONFIG_OPTIONS[addon.slug] ?? {},
  privileged: [],
  protected: true,
  rating: 6,
  schema: CONFIG_SCHEMAS[addon.slug] ?? null,
  services_role: [],
  signed: false,
  startup: "application",
  stdin: false,
  system_managed: false,
  system_managed_config_entry: null,
  translations: {},
  watchdog: true,
  webui: null,
});

const CHANGELOGS: Record<string, string> = {
  d5369777_music_assistant: `## 2.6.3

- Fix Spotify Connect reconnecting after a network drop
- Improve artwork caching for large libraries
- Update player provider dependencies`,
  "5c53de3b_esphome": `## 2025.7.3

- Fix compile error for ESP32-C6 boards using the \`uart\` component
- Improve reconnect behaviour of the native API after a WiFi outage
- Update platformio toolchain`,
};

const LOGS: Record<string, string> = {
  d5369777_music_assistant: `[server] Starting Music Assistant Server 2.6.3
[server] Loaded provider: filesystem_local
[server] Loaded provider: spotify
[server] Loaded provider: sonos
[players] Discovered player: Living Room (Sonos)
[players] Discovered player: Kitchen (Chromecast)
[server] Music Assistant is ready
`,
  "5c53de3b_esphome": `[esphome] Starting ESPHome Device Builder 2025.7.3
[esphome] Dashboard running on port 6052
[esphome] Found 3 configurations
[esphome] bedroom-sensor is online (2025.7.3)
[esphome] garage-door is online (2025.7.3)
[esphome] office-display is online (2025.7.3)
`,
};

const ADDON_STATS: HassioStats = {
  blk_read: 12300000,
  blk_write: 4500000,
  cpu_percent: 1.4,
  memory_limit: 3900000000,
  memory_percent: 4.2,
  memory_usage: 163000000,
  network_rx: 8900000,
  network_tx: 2300000,
};

export const mockHassioSupervisor = (hass: MockHomeAssistant) => {
  hass.mockWS("supervisor/api", (msg) => {
    if (msg.endpoint === "/supervisor/info") {
      const data: HassioSupervisorInfo = {
        version: "2021.10.dev0805",
        version_latest: "2021.10.dev0806",
        update_available: true,
        channel: "dev",
        arch: "aarch64",
        supported: true,
        healthy: true,
        ip_address: "172.30.32.2",
        wait_boot: 5,
        timezone: "America/Los_Angeles",
        logging: "info",
        debug: false,
        debug_block: false,
        diagnostics: true,
        addons: DEMO_ADDONS as any,
        addons_repositories: [
          "https://github.com/music-assistant/home-assistant-addon",
          "https://github.com/esphome/home-assistant-addon",
        ] as any,
      };
      return data;
    }

    if (msg.endpoint === "/addons") {
      const data: HassioAddonsInfo = {
        addons: DEMO_ADDONS,
        repositories: [
          {
            slug: "d5369777",
            name: "Music Assistant",
            source: "https://github.com/music-assistant/home-assistant-addon",
            url: "https://github.com/music-assistant/home-assistant-addon",
            maintainer: "Music Assistant",
          },
          {
            slug: "5c53de3b",
            name: "ESPHome",
            source: "https://github.com/esphome/home-assistant-addon",
            url: "https://esphome.io/",
            maintainer: "ESPHome",
          },
        ],
      };
      return data;
    }

    const addonMatch = msg.endpoint.match(/^\/addons\/([^/]+)\/(info|stats)$/);
    if (addonMatch) {
      const addon = DEMO_ADDONS.find((item) => item.slug === addonMatch[1]);
      if (!addon) {
        return Promise.reject(`Addon ${addonMatch[1]} not found`);
      }
      return addonMatch[2] === "stats" ? ADDON_STATS : addonDetails(addon);
    }

    if (msg.endpoint === "/host/info") {
      const data: HassioHostInfo = {
        agent_version: "1.6.0",
        chassis: "embedded",
        cpe: "cpe:2.3:o:home-assistant:haos:15.2:*:production:*:*:*:aarch64:*",
        deployment: "production",
        disk_life_time: 6,
        disk_free: 22.3,
        disk_total: 31.2,
        disk_used: 8.9,
        features: ["reboot", "shutdown", "network", "hostname", "os_agent"],
        hostname: "homeassistant",
        kernel: "6.6.54-haos",
        operating_system: "Home Assistant OS 15.2",
        boot_timestamp: 1751932800000000,
        startup_time: 12.4,
      };
      return data;
    }

    if (msg.endpoint === "/os/info") {
      const data: HassioHassOSInfo = {
        board: "yellow",
        boot: "A",
        update_available: false,
        version: "15.2",
        version_latest: "15.2",
        data_disk: "Home Assistant Yellow (mmcblk0)",
      };
      return data;
    }

    if (msg.endpoint === "/host/disks/default/usage") {
      const data: HostDisksUsage = {
        id: "root",
        label: "Total",
        total_bytes: 31200000000,
        used_bytes: 8900000000,
        children: [
          { id: "media", label: "Media", used_bytes: 4100000000 },
          { id: "addons", label: "Apps", used_bytes: 2600000000 },
          { id: "backup", label: "Backups", used_bytes: 1400000000 },
          { id: "share", label: "Share", used_bytes: 800000000 },
        ],
      };
      return data;
    }

    if (msg.endpoint === "/mounts") {
      const data: SupervisorMounts = {
        default_backup_mount: null,
        mounts: [],
      };
      return data;
    }

    if (msg.endpoint === "/network/info") {
      const data: NetworkInfo = {
        interfaces: [
          {
            primary: true,
            privacy: false,
            interface: "eth0",
            enabled: true,
            type: "ethernet",
            ipv4: {
              address: ["192.168.1.10/24"],
              gateway: "192.168.1.1",
              method: "auto",
              nameservers: ["192.168.1.1"],
            },
            wifi: null,
          },
        ],
        docker: {
          address: "172.30.32.0/23",
          dns: "172.30.32.3",
          gateway: "172.30.32.1",
          interface: "hassio",
        },
      };
      return data;
    }

    if (msg.endpoint === "/store/reload") {
      return null;
    }

    return Promise.reject(`${msg.method} ${msg.endpoint} is not implemented`);
  });

  hass.mockWS("hassio/update/config/info", (): SupervisorUpdateConfig => ({
    add_on_backup_before_update: true,
    add_on_backup_retain_copies: 1,
    core_backup_before_update: true,
  }));

  hass.mockAPI(/^hassio\/addons\/[^/]+\/changelog$/, (_hass, _method, path) => {
    const slug = path.split("/")[2];
    return CHANGELOGS[slug];
  });

  hass.mockAPI(/^hassio\/host\/logs\/boots$/, () => ({
    data: { boots: { "0": "2026-07-26T09:00:00.000000+00:00" } },
  }));

  hass.mockAPI(/^hassio\/addons\/[^/]+\/logs/, (_hass, _method, path) => {
    const slug = path.split("/")[2];
    // X-First-Cursor tells error-log-card there is nothing older to page to.
    return new Response(LOGS[slug], {
      headers: { "X-First-Cursor": "demo" },
    });
  });
};
