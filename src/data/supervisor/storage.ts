import type { HomeAssistant } from "../../types";

export interface SupervisorStorageInfo {
  total_space?: number;
  used_space: number;
  children?: Record<string, SupervisorStorageInfo>;
}

const STORAGE_MOCK_DATA = {
  result: "ok",
  data: {
    total_space: 984465879040,
    used_space: 213384400896,
    children: {
      addons_data: {
        used_space: 17918974193,
        children: {
          core_configurator: {
            used_space: 173,
          },
          "77f1785d_chip_tool": {
            used_space: 2,
          },
          core_whisper: {
            used_space: 3892688550,
          },
          a0d7b954_vscode: {
            used_space: 176693578,
          },
          core_mosquitto: {
            used_space: 845657,
          },
          "982ee2c4_volvo2mqtt": {
            used_space: 475,
          },
          core_ssh: {
            used_space: 38000998,
          },
          a0d7b954_influxdb: {
            used_space: 8218539131,
          },
          a0d7b954_grafana: {
            used_space: 1215195,
          },
          "a0d7b954_uptime-kuma": {
            used_space: 671268550,
          },
          core_letsencrypt: {
            used_space: 445994,
          },
          core_piper: {
            used_space: 442690429,
          },
          a0d7b954_ssh: {
            used_space: 6290,
          },
          core_git_pull: {
            used_space: 2376,
          },
          a0d7b954_logviewer: {
            used_space: 76,
          },
          core_mariadb: {
            used_space: 4299634590,
          },
          core_silabs_flasher: {
            used_space: 109,
          },
          "core_speech-to-phrase": {
            used_space: 132782908,
          },
          a0d7b954_spotify: {
            used_space: 158,
          },
          a0d7b954_phpmyadmin: {
            used_space: 70,
          },
          "17fe96b6_puppet": {
            used_space: 207,
          },
          a0d7b954_glances: {
            used_space: 397,
          },
          core_matter_server: {
            used_space: 44157845,
          },
          core_vlc: {
            used_space: 67,
          },
          core_assist_microphone: {
            used_space: 368,
          },
        },
      },
      addons_config: {
        used_space: 20040109,
        children: {
          a0d7b954_emqx: {
            used_space: 3355776,
          },
          core_matter_server: {
            used_space: 16684333,
          },
        },
      },
      media: {
        used_space: 619970,
        children: {
          frigate: {
            used_space: 65536,
          },
        },
      },
      share: {
        used_space: 18309324,
        children: {
          mosquitto: {
            used_space: 116,
          },
          "speech-to-phrase": {
            used_space: 18309208,
          },
        },
      },
      backup: {
        used_space: 174410946560,
      },
      ssl: {
        used_space: 3267,
      },
      homeassistant: {
        used_space: 134055761,
        children: {
          custom_components: {
            used_space: 122467,
          },
          glances: {
            used_space: 8981,
          },
          blueprints: {
            used_space: 53063,
          },
          "python-matter-server": {
            used_space: 4351441,
          },
          ota: {
            used_space: 240760,
          },
          iotawatt_ha: {
            used_space: 75066,
          },
          ".storage": {
            used_space: 39609972,
          },
          custom_zha_quirks: {
            used_space: 10573,
          },
          esphome: {
            used_space: 2977631,
          },
          ".git": {
            used_space: 1527118,
          },
          automations: {
            used_space: 26032,
          },
          "frigate-hass-integration": {
            used_space: 396310,
          },
          www: {
            used_space: 371349,
          },
          "hass-weather-srgssr": {
            used_space: 521089,
          },
          tts: {
            used_space: 10866909,
          },
        },
      },
      system: {
        used_space: 20881451712,
      },
    },
  },
};

export const fetchSupervisorStorageInfo = async (
  _hass: HomeAssistant
): Promise<SupervisorStorageInfo> => STORAGE_MOCK_DATA.data;
//   hass.callWS<SupervisorStorageInfo>({
//     type: "supervisor/storage/info",
//   });
