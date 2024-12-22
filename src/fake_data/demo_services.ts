import { HassServices } from "home-assistant-js-websocket";

export const demoServices: HassServices = {
  homeassistant: {
    turn_off: {
      description:
        "Generic service to turn devices off under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.",
      fields: {
        entity_id: {
          description: "The entity_id of the device to turn off.",
          example: "light.living_room",
        },
      },
    },
    turn_on: {
      description:
        "Generic service to turn devices on under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.",
      fields: {
        entity_id: {
          description: "The entity_id of the device to turn on.",
          example: "light.living_room",
        },
      },
    },
    toggle: {
      description:
        "Generic service to toggle devices on/off under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.",
      fields: {
        entity_id: {
          description: "The entity_id of the device to toggle on/off.",
          example: "light.living_room",
        },
      },
    },
    stop: { description: "Stop the Home Assistant service.", fields: {} },
    restart: { description: "Restart the Home Assistant service.", fields: {} },
    check_config: {
      description:
        "Check the Home Assistant configuration files for errors. Errors will be displayed in the Home Assistant log.",
      fields: {},
    },
    update_entity: {
      description: "Force one or more entities to update its data",
      fields: {
        entity_id: {
          description: "One or multiple entity_ids to update. Can be a list.",
          example: "light.living_room",
        },
      },
    },
    reload_core_config: {
      description: "Reload the core configuration.",
      fields: {},
    },
  },
  persistent_notification: {
    create: {
      description: "Show a notification in the frontend.",
      fields: {
        message: {
          description: "Message body of the notification. [Templates accepted]",
          example: "Please check your configuration.yaml.",
        },
        title: {
          description:
            "Optional title for your notification. [Optional, Templates accepted]",
          example: "Test notification",
        },
        notification_id: {
          description:
            "Target ID of the notification, will replace a notification with the same Id. [Optional]",
          example: "1234",
        },
      },
    },
    dismiss: {
      description: "Remove a notification from the frontend.",
      fields: {
        notification_id: {
          description:
            "Target ID of the notification, which should be removed. [Required]",
          example: "1234",
        },
      },
    },
    mark_read: { description: "", fields: {} },
  },
  logger: {
    set_default_level: {
      description: "Set the default log level for components.",
      fields: {
        level: {
          description:
            "Default severity level. Possible values are notset, debug, info, warn, warning, error, fatal, critical",
          example: "debug",
        },
      },
    },
    set_level: { description: "Set log level for components.", fields: {} },
  },
  recorder: {
    purge: {
      description:
        "Start purge task - delete events and states older than x days, according to keep_days service data.",
      fields: {
        keep_days: {
          description:
            "Number of history days to keep in database after purge. Value >= 0.",
          example: "2",
        },
        repack: {
          description:
            "Attempt to save disk space by rewriting the entire database file.",
          example: "true",
        },
      },
    },
  },
  system_log: {
    clear: { description: "", fields: {} },
    write: { description: "", fields: {} },
  },
  frontend: {
    set_theme: {
      description: "Set a theme unless the client selected per-device theme.",
      fields: {
        name: {
          description: "Name of a predefined theme or 'default'.",
          example: "light",
        },
      },
    },
    reload_themes: {
      description: "Reload themes from yaml configuration.",
      fields: {},
    },
  },
  input_select: {
    select_option: {
      description: "Select an option of an input select entity.",
      fields: {
        entity_id: {
          description: "Entity id of the input select to select the value.",
          example: "input_select.my_select",
        },
        option: { description: "Option to be selected.", example: '"Item A"' },
      },
    },
    select_next: {
      description: "Select the next options of an input select entity.",
      fields: {
        entity_id: {
          description:
            "Entity id of the input select to select the next value for.",
          example: "input_select.my_select",
        },
      },
    },
    select_previous: {
      description: "Select the previous options of an input select entity.",
      fields: {
        entity_id: {
          description:
            "Entity id of the input select to select the previous value for.",
          example: "input_select.my_select",
        },
      },
    },
    set_options: {
      description: "Set the options of an input select entity.",
      fields: {
        entity_id: {
          description:
            "Entity id of the input select to set the new options for.",
          example: "input_select.my_select",
        },
        options: {
          description: "Options for the input select entity.",
          example: '["Item A", "Item B", "Item C"]',
        },
      },
    },
  },
  input_number: {
    set_value: {
      description: "Set the value of an input number entity.",
      fields: {
        entity_id: {
          description: "Entity id of the input number to set the new value.",
          example: "input_number.threshold",
        },
        value: {
          description: "The target value the entity should be set to.",
          example: "42",
        },
      },
    },
    increment: {
      description:
        "Increment the value of an input number entity by its stepping.",
      fields: {
        entity_id: {
          description:
            "Entity id of the input number the should be incremented.",
          example: "input_number.threshold",
        },
      },
    },
    decrement: {
      description:
        "Decrement the value of an input number entity by its stepping.",
      fields: {
        entity_id: {
          description:
            "Entity id of the input number the should be decremented.",
          example: "input_number.threshold",
        },
      },
    },
  },
  scene: {
    turn_on: {
      description: "Activate a scene.",
      fields: {
        entity_id: {
          description: "Name(s) of scenes to turn on",
          example: "scene.romantic",
        },
      },
    },
  },
  shell_command: {
    borrel: { description: "", fields: {} },
    party_mode: { description: "", fields: {} },
  },
  camera: {
    enable_motion_detection: {
      description: "Enable the motion detection in a camera.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to enable motion detection.",
          example: "camera.living_room_camera",
        },
      },
    },
    disable_motion_detection: {
      description: "Disable the motion detection in a camera.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to disable motion detection.",
          example: "camera.living_room_camera",
        },
      },
    },
    turn_off: {
      description: "Turn off camera.",
      fields: {
        entity_id: { description: "Entity id.", example: "camera.living_room" },
      },
    },
    turn_on: {
      description: "Turn on camera.",
      fields: {
        entity_id: { description: "Entity id.", example: "camera.living_room" },
      },
    },
    snapshot: {
      description: "Take a snapshot from a camera.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to create snapshots from.",
          example: "camera.living_room_camera",
        },
        filename: {
          description: "Template of a Filename. Variable is entity_id.",
          example: "/tmp/snapshot_{{ entity_id }}",
        },
      },
    },
  },
  media_player: {
    turn_on: {
      description: "Turn a media player power on.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn on.",
          example: "media_player.living_room_chromecast",
        },
      },
    },
    turn_off: {
      description: "Turn a media player power off.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn off.",
          example: "media_player.living_room_chromecast",
        },
      },
    },
    toggle: {
      description: "Toggles a media player power state.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to toggle.",
          example: "media_player.living_room_chromecast",
        },
      },
    },
    volume_up: {
      description: "Turn a media player volume up.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn volume up on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    volume_down: {
      description: "Turn a media player volume down.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn volume down on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_play_pause: {
      description: "Toggle media player play/pause state.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to toggle play/pause state on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_play: {
      description: "Send the media player the command for play.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to play on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_pause: {
      description: "Send the media player the command for pause.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to pause on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_stop: {
      description: "Send the media player the stop command.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to stop on.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_next_track: {
      description: "Send the media player the command for next track.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to send next track command to.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    media_previous_track: {
      description: "Send the media player the command for previous track.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to send previous track command to.",
          example: "media_player.living_room_sonos",
        },
      },
    },
    clear_playlist: {
      description:
        "Send the media player the command to clear players playlist.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change source on.",
          example: "media_player.living_room_chromecast",
        },
      },
    },
    volume_set: {
      description: "Set a media player's volume level.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to set volume level on.",
          example: "media_player.living_room_sonos",
        },
        volume_level: {
          description: "Volume level to set as float.",
          example: "0.6",
        },
      },
    },
    volume_mute: {
      description: "Mute a media player's volume.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to mute.",
          example: "media_player.living_room_sonos",
        },
        is_volume_muted: {
          description: "True/false for mute/unmute.",
          example: "true",
        },
      },
    },
    media_seek: {
      description:
        "Send the media player the command to seek in current playing media.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to seek media on.",
          example: "media_player.living_room_chromecast",
        },
        seek_position: {
          description: "Position to seek to. The format is platform dependent.",
          example: "100",
        },
      },
    },
    select_source: {
      description: "Send the media player the command to change input source.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change source on.",
          example: "media_player.media_player.txnr535_0009b0d81f82",
        },
        source: {
          description: "Name of the source to switch to. Platform dependent.",
          example: "video1",
        },
      },
    },
    select_sound_mode: {
      description: "Send the media player the command to change sound mode.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change sound mode on.",
          example: "media_player.marantz",
        },
        sound_mode: {
          description: "Name of the sound mode to switch to.",
          example: "Music",
        },
      },
    },
    play_media: {
      description: "Send the media player the command for playing media.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to seek media on",
          example: "media_player.living_room_chromecast",
        },
        media_content_id: {
          description: "The ID of the content to play. Platform dependent.",
          example: "https://home-assistant.io/images/cast/splash.png",
        },
        media_content_type: {
          description:
            "The type of the content to play. Must be one of music, tvshow, video, episode, channel or playlist",
          example: "music",
        },
      },
    },
    shuffle_set: {
      description: "Set shuffling state.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to set.",
          example: "media_player.spotify",
        },
        shuffle: {
          description: "True/false for enabling/disabling shuffle.",
          example: "true",
        },
      },
    },
  },
  conversation: {
    process: {
      description: "Launch a conversation from a transcribed text.",
      fields: {
        text: {
          description: "Transcribed text",
          example: "Turn all lights on",
        },
      },
    },
  },
  input_boolean: {
    turn_on: {
      description: "Turns on an input boolean.",
      fields: {
        entity_id: {
          description: "Entity id of the input boolean to turn on.",
          example: "input_boolean.notify_alerts",
        },
      },
    },
    turn_off: {
      description: "Turns off an input boolean",
      fields: {
        entity_id: {
          description: "Entity id of the input boolean to turn off.",
          example: "input_boolean.notify_alerts",
        },
      },
    },
    toggle: {
      description: "Toggles an input boolean.",
      fields: {
        entity_id: {
          description: "Entity id of the input boolean to toggle.",
          example: "input_boolean.notify_alerts",
        },
      },
    },
  },
  notify: {
    demo_test_target_name: { description: "", fields: {} },
    notify: {
      description: "Send a notification.",
      fields: {
        message: {
          description: "Message body of the notification.",
          example: "The garage door has been open for 10 minutes.",
        },
        title: {
          description: "Optional title for your notification.",
          example: "Your Garage Door Friend",
        },
        target: {
          description:
            "An array of targets to send the notification to. Optional depending on the platform.",
          example: "platform specific",
        },
        data: {
          description:
            "Extended information for notification. Optional depending on the platform.",
          example: "platform specific",
        },
      },
    },
  },
  group: {
    reload: { description: "Reload group configuration.", fields: {} },
    set: {
      description: "Create/Update a user group.",
      fields: {
        object_id: {
          description: "Group id and part of entity id.",
          example: "test_group",
        },
        name: { description: "Name of group", example: "My test group" },
        view: {
          description: "Boolean for if the group is a view.",
          example: "true",
        },
        icon: {
          description: "Name of icon for the group.",
          example: "mdi:camera",
        },
        control: {
          description: "Value for control the group control.",
          example: "hidden",
        },
        visible: {
          description: "If the group is visible on UI.",
          example: "true",
        },
        entities: {
          description:
            "List of all members in the group. Not compatible with 'delta'.",
          example: "domain.entity_id1, domain.entity_id2",
        },
        add_entities: {
          description: "List of members they will change on group listening.",
          example: "domain.entity_id1, domain.entity_id2",
        },
        all: {
          description:
            "Enable this option if the group should only turn on when all entities are on.",
          example: "true",
        },
      },
    },
    remove: {
      description: "Remove a user group.",
      fields: {
        object_id: {
          description: "Group id and part of entity id.",
          example: "test_group",
        },
      },
    },
    set_visibility: {
      description: "Hide or show a group.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to set value.",
          example: "group.travel",
        },
        visible: {
          description:
            "True if group should be shown or False if it should be hidden.",
          example: "true",
        },
      },
    },
  },
  climate: {
    set_aux_heat: {
      description: "Turn auxiliary heater on/off for climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.kitchen",
        },
        aux_heat: {
          description: "New value of axillary heater.",
          example: "true",
        },
      },
    },
    set_temperature: {
      description: "Set target temperature of climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.kitchen",
        },
        temperature: {
          description: "New target temperature for HVAC.",
          example: "25",
        },
        target_temp_high: {
          description: "New target high tempereature for HVAC.",
          example: "26",
        },
        target_temp_low: {
          description: "New target low temperature for HVAC.",
          example: "20",
        },
        operation_mode: {
          description:
            "Operation mode to set temperature to. This defaults to current_operation mode if not set, or set incorrectly.",
          example: "Heat",
        },
      },
    },
    set_humidity: {
      description: "Set target humidity of climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.kitchen",
        },
        humidity: {
          description: "New target humidity for climate device.",
          example: "60",
        },
      },
    },
    set_fan_mode: {
      description: "Set fan operation for climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.nest",
        },
        fan_mode: { description: "New value of fan mode.", example: "On Low" },
      },
    },
    set_hvac_mode: {
      description: "Set operation mode for climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.nest",
        },
        hvac_mode: {
          description: "New value of operation mode.",
          example: "heat",
        },
      },
    },
    set_swing_mode: {
      description: "Set swing operation for climate device.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to change.",
          example: "climate.nest",
        },
        swing_mode: { description: "New value of swing mode.", example: "" },
      },
    },
  },
  image_processing: {
    scan: {
      description: "Process an image immediately.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to scan immediately.",
          example: "image_processing.alpr_garage",
        },
      },
    },
  },
  script: {
    "1541701097153": { description: "", fields: {} },
    "1541702006725": { description: "", fields: {} },
    reload: { description: "", fields: {} },
    turn_on: { description: "", fields: {} },
    turn_off: { description: "", fields: {} },
    toggle: { description: "", fields: {} },
  },
  device_tracker: {
    see: {
      description: "Control tracked device.",
      fields: {
        mac: {
          description: "MAC address of device",
          example: "FF:FF:FF:FF:FF:FF",
        },
        dev_id: {
          description: "Id of device (find id in known_devices.yaml).",
          example: "phonedave",
        },
        host_name: { description: "Hostname of device", example: "Dave" },
        location_name: {
          description:
            "Name of location where device is located (not_home is away).",
          example: "home",
        },
        gps: {
          description:
            "GPS coordinates where device is located (latitude, longitude).",
          example: "[51.509802, -0.086692]",
        },
        gps_accuracy: {
          description: "Accuracy of GPS coordinates.",
          example: "80",
        },
        battery: { description: "Battery level of device.", example: "100" },
      },
    },
  },
  automation: {
    trigger: {
      description: "Trigger the action of an automation.",
      fields: {
        entity_id: {
          description: "Name of the automation to trigger.",
          example: "automation.notify_home",
        },
      },
    },
    reload: { description: "Reload the automation configuration.", fields: {} },
    toggle: {
      description: "Toggle an automation.",
      fields: {
        entity_id: {
          description: "Name of the automation to toggle on/off.",
          example: "automation.notify_home",
        },
      },
    },
    turn_on: {
      description: "Enable an automation.",
      fields: {
        entity_id: {
          description: "Name of the automation to turn on.",
          example: "automation.notify_home",
        },
      },
    },
    turn_off: {
      description: "Disable an automation.",
      fields: {
        entity_id: {
          description: "Name of the automation to turn off.",
          example: "automation.notify_home",
        },
      },
    },
  },
  alarm_control_panel: {
    alarm_disarm: {
      description: "Send the alarm the command for disarm.",
      fields: {
        entity_id: {
          description: "Name of alarm control panel to disarm.",
          example: "alarm_control_panel.downstairs",
        },
        code: {
          description:
            "An optional code to disarm the alarm control panel with.",
          example: "1234",
        },
      },
    },
    alarm_arm_home: {
      description: "Send the alarm the command for arm home.",
      fields: {
        entity_id: {
          description: "Name of alarm control panel to arm home.",
          example: "alarm_control_panel.downstairs",
        },
        code: {
          description:
            "An optional code to arm home the alarm control panel with.",
          example: "1234",
        },
      },
    },
    alarm_arm_away: {
      description: "Send the alarm the command for arm away.",
      fields: {
        entity_id: {
          description: "Name of alarm control panel to arm away.",
          example: "alarm_control_panel.downstairs",
        },
        code: {
          description:
            "An optional code to arm away the alarm control panel with.",
          example: "1234",
        },
      },
    },
    alarm_arm_night: {
      description: "Send the alarm the command for arm night.",
      fields: {
        entity_id: {
          description: "Name of alarm control panel to arm night.",
          example: "alarm_control_panel.downstairs",
        },
        code: {
          description:
            "An optional code to arm night the alarm control panel with.",
          example: "1234",
        },
      },
    },
    alarm_arm_custom_bypass: { description: "", fields: {} },
    alarm_trigger: {
      description: "Send the alarm the command for trigger.",
      fields: {
        entity_id: {
          description: "Name of alarm control panel to trigger.",
          example: "alarm_control_panel.downstairs",
        },
        code: {
          description:
            "An optional code to trigger the alarm control panel with.",
          example: "1234",
        },
      },
    },
  },
  fan: {
    turn_on: {
      description: "Turns fan on.",
      fields: {
        entity_id: {
          description: "Names(s) of the entities to turn on",
          example: "fan.living_room",
        },
        speed: { description: "Speed setting", example: "high" },
      },
    },
    turn_off: {
      description: "Turns fan off.",
      fields: {
        entity_id: {
          description: "Names(s) of the entities to turn off",
          example: "fan.living_room",
        },
      },
    },
    toggle: {
      description: "Toggle the fan on/off.",
      fields: {
        entity_id: {
          description: "Name(s) of the entities to toggle",
          example: "fan.living_room",
        },
      },
    },
    set_speed: {
      description: "Sets fan speed.",
      fields: {
        entity_id: {
          description: "Name(s) of the entities to set",
          example: "fan.living_room",
        },
        speed: { description: "Speed setting", example: "low" },
      },
    },
    oscillate: {
      description: "Oscillates the fan.",
      fields: {
        entity_id: {
          description: "Name(s) of the entities to oscillate",
          example: "fan.desk_fan",
        },
        oscillating: {
          description: "Flag to turn on/off oscillation",
          example: "true",
        },
      },
    },
    set_direction: {
      description: "Set the fan rotation.",
      fields: {
        entity_id: {
          description: "Name(s) of the entities to toggle",
          example: "fan.living_room",
        },
        direction: {
          description: "The direction to rotate. Either 'forward' or 'reverse'",
          example: "forward",
        },
      },
    },
  },
  lock: {
    unlock: {
      description: "Unlock all or specified locks.",
      fields: {
        entity_id: {
          description: "Name of lock to unlock.",
          example: "lock.front_door",
        },
        code: {
          description: "An optional code to unlock the lock with.",
          example: "1234",
        },
      },
    },
    lock: {
      description: "Lock all or specified locks.",
      fields: {
        entity_id: {
          description: "Name of lock to lock.",
          example: "lock.front_door",
        },
        code: {
          description: "An optional code to lock the lock with.",
          example: "1234",
        },
      },
    },
    open: { description: "", fields: {} },
  },
  cover: {
    open_cover: {
      description: "Open all or specified cover.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to open.",
          example: "cover.living_room",
        },
      },
    },
    close_cover: {
      description: "Close all or specified cover.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to close.",
          example: "cover.living_room",
        },
      },
    },
    set_cover_position: {
      description: "Move to specific position all or specified cover.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to set cover position.",
          example: "cover.living_room",
        },
        position: {
          description: "Position of the cover (0 to 100).",
          example: "30",
        },
      },
    },
    stop_cover: {
      description: "Stop all or specified cover.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to stop.",
          example: "cover.living_room",
        },
      },
    },
    open_cover_tilt: {
      description: "Open all or specified cover tilt.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) tilt to open.",
          example: "cover.living_room",
        },
      },
    },
    close_cover_tilt: {
      description: "Close all or specified cover tilt.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to close tilt.",
          example: "cover.living_room",
        },
      },
    },
    stop_cover_tilt: {
      description: "Stop all or specified cover.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to stop.",
          example: "cover.living_room",
        },
      },
    },
    set_cover_tilt_position: {
      description: "Move to specific position all or specified cover tilt.",
      fields: {
        entity_id: {
          description: "Name(s) of cover(s) to set cover tilt position.",
          example: "cover.living_room",
        },
        tilt_position: {
          description: "Tilt position of the cover (0 to 100).",
          example: "30",
        },
      },
    },
  },
  switch: {
    turn_off: {
      description: "Turn a switch off.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn off.",
          example: "switch.living_room",
        },
      },
    },
    turn_on: {
      description: "Turn a switch on.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn on",
          example: "switch.living_room",
        },
      },
    },
    toggle: {
      description: "Toggles a switch state.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to toggle.",
          example: "switch.living_room",
        },
      },
    },
  },
  light: {
    turn_on: {
      description: "Turn a light on.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn on",
          example: "light.kitchen",
        },
        transition: {
          description: "Duration in seconds it takes to get to next state",
          example: "60",
        },
        rgb_color: {
          description: "Color for the light in RGB-format.",
          example: "[255, 100, 100]",
        },
        color_name: {
          description: "A human readable color name.",
          example: "red",
        },
        hs_color: {
          description:
            "Color for the light in hue/sat format. Hue is 0-360 and Sat is 0-100.",
          example: "[300, 70]",
        },
        xy_color: {
          description: "Color for the light in XY-format.",
          example: "[0.52, 0.43]",
        },
        color_temp: {
          description: "Color temperature for the light in mireds.",
          example: "250",
        },
        kelvin: {
          description: "Color temperature for the light in Kelvin.",
          example: "4000",
        },
        white_value: {
          description: "Number between 0..255 indicating level of white.",
          example: "250",
        },
        brightness: {
          description: "Number between 0..255 indicating brightness.",
          example: "120",
        },
        brightness_pct: {
          description:
            "Number between 0..100 indicating percentage of full brightness.",
          example: "47",
        },
        profile: {
          description: "Name of a light profile to use.",
          example: "relax",
        },
        flash: {
          description: "If the light should flash.",
          example: "short",
        },
        effect: {
          description: "Light effect.",
          example: "colorloop",
        },
      },
    },
    turn_off: {
      description: "Turn a light off.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to turn off.",
          example: "light.kitchen",
        },
        transition: {
          description: "Duration in seconds it takes to get to next state.",
          example: "60",
        },
        flash: {
          description: "If the light should flash.",
          example: "short",
        },
      },
    },
    toggle: {
      description: "Toggles a light.",
      fields: {
        entity_id: {
          description: "Name(s) of entities to toggle.",
          example: "light.kitchen",
        },
        transition: {
          description: "Duration in seconds it takes to get to next state.",
          example: "60",
        },
      },
    },
  },
  tts: {
    demo_say: { description: "", fields: {} },
    clear_cache: {
      description: "Remove cache files and RAM cache.",
      fields: {},
    },
  },
  configurator: { configure: { description: "", fields: {} } },
};
