export default {
  core: {
    elevation: 300,
    latitude: 51.5287352,
    longitude: -0.381773,
    unit_system: {
      length: 'km',
      mass: 'kg',
      temperature: '°C',
      volume: 'L'
    }
  },
  services: {
    'configurator': {
      'configure': {
        'fields': {},
        'description': ''
      }
    },
    'tts': {
      'demo_say': {
        'fields': {},
        'description': ''
      },
      'clear_cache': {
        'fields': {},
        'description': 'Remove cache files and RAM cache.'
      }
    },
    'cover': {
      'open_cover': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to open.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Open all or specified cover.'
      },
      'close_cover': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to close.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Close all or specified cover.'
      },
      'open_cover_tilt': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) tilt to open.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Open all or specified cover tilt.'
      },
      'close_cover_tilt': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to close tilt.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Close all or specified cover tilt.'
      },
      'set_cover_tilt_position': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to set cover tilt position.',
            'example': 'cover.living_room'
          },
          'tilt_position': {
            'description': 'Tilt position of the cover (0 to 100).',
            'example': 30
          }
        },
        'description': 'Move to specific position all or specified cover tilt.'
      },
      'set_cover_position': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to set cover position.',
            'example': 'cover.living_room'
          },
          'position': {
            'description': 'Position of the cover (0 to 100).',
            'example': 30
          }
        },
        'description': 'Move to specific position all or specified cover.'
      },
      'stop_cover_tilt': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to stop.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Stop all or specified cover.'
      },
      'stop_cover': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of cover(s) to stop.',
            'example': 'cover.living_room'
          }
        },
        'description': 'Stop all or specified cover.'
      }
    },
    'group': {
      'set': {
        'fields': {
          'object_id': {
            'description': 'Group id and part of entity id.',
            'example': 'test_group'
          },
          'name': {
            'description': 'Name of group',
            'example': 'My test group'
          },
          'view': {
            'description': 'Boolean for if the group is a view.',
            'example': true
          },
          'icon': {
            'description': 'Name of icon for the group.',
            'example': 'mdi:camera'
          },
          'control': {
            'description': 'Value for control the group control.',
            'example': 'hidden'
          },
          'visible': {
            'description': 'If the group is visible on UI.',
            'example': true
          },
          'entities': {
            'description': 'List of all members in the group. Not compatible with \'delta\'.',
            'example': 'domain.entity_id1, domain.entity_id2'
          },
          'add_entities': {
            'description': 'List of members they will change on group listening.',
            'example': 'domain.entity_id1, domain.entity_id2'
          }
        },
        'description': 'Create/Update a user group.'
      },
      'reload': {
        'fields': {},
        'description': 'Reload group configuration.'
      },
      'remove': {
        'fields': {
          'object_id': {
            'description': 'Group id and part of entity id.',
            'example': 'test_group'
          }
        },
        'description': 'Remove a user group.'
      },
      'set_visibility': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to set value.',
            'example': 'group.travel'
          },
          'visible': {
            'description': 'True if group should be shown or False if it should be hidden.',
            'example': true
          }
        },
        'description': 'Hide or show a group.'
      }
    },
    'alarm_control_panel': {
      'alarm_arm_night': {
        'fields': {
          'entity_id': {
            'description': 'Name of alarm control panel to arm night.',
            'example': 'alarm_control_panel.downstairs'
          },
          'code': {
            'description': 'An optional code to arm night the alarm control panel with.',
            'example': 1234
          }
        },
        'description': 'Send the alarm the command for arm night.'
      },
      'alarm_disarm': {
        'fields': {
          'entity_id': {
            'description': 'Name of alarm control panel to disarm.',
            'example': 'alarm_control_panel.downstairs'
          },
          'code': {
            'description': 'An optional code to disarm the alarm control panel with.',
            'example': 1234
          }
        },
        'description': 'Send the alarm the command for disarm.'
      },
      'alarm_trigger': {
        'fields': {
          'entity_id': {
            'description': 'Name of alarm control panel to trigger.',
            'example': 'alarm_control_panel.downstairs'
          },
          'code': {
            'description': 'An optional code to trigger the alarm control panel with.',
            'example': 1234
          }
        },
        'description': 'Send the alarm the command for trigger.'
      },
      'alarm_arm_home': {
        'fields': {
          'entity_id': {
            'description': 'Name of alarm control panel to arm home.',
            'example': 'alarm_control_panel.downstairs'
          },
          'code': {
            'description': 'An optional code to arm home the alarm control panel with.',
            'example': 1234
          }
        },
        'description': 'Send the alarm the command for arm home.'
      },
      'alarm_arm_away': {
        'fields': {
          'entity_id': {
            'description': 'Name of alarm control panel to arm away.',
            'example': 'alarm_control_panel.downstairs'
          },
          'code': {
            'description': 'An optional code to arm away the alarm control panel with.',
            'example': 1234
          }
        },
        'description': 'Send the alarm the command for arm away.'
      },
      'alarm_arm_custom_bypass': {
        'fields': {},
        'description': ''
      }
    },
    'conversation': {
      'process': {
        'fields': {
          'text': {
            'description': 'Transcribed text',
            'example': 'Turn all lights on'
          }
        },
        'description': 'Launch a conversation from a transcribed text.'
      }
    },
    'notify': {
      'demo_test_target_name': {
        'fields': {},
        'description': ''
      },
      'notify': {
        'fields': {
          'message': {
            'description': 'Message body of the notification.',
            'example': 'The garage door has been open for 10 minutes.'
          },
          'title': {
            'description': 'Optional title for your notification.',
            'example': 'Your Garage Door Friend'
          },
          'target': {
            'description': 'An array of targets to send the notification to. Optional depending on the platform.',
            'example': 'platform specific'
          },
          'data': {
            'description': 'Extended information for notification. Optional depending on the platform.',
            'example': 'platform specific'
          }
        },
        'description': 'Send a notification.'
      }
    },
    'lock': {
      'open': {
        'fields': {},
        'description': ''
      },
      'lock': {
        'fields': {
          'entity_id': {
            'description': 'Name of lock to lock.',
            'example': 'lock.front_door'
          },
          'code': {
            'description': 'An optional code to lock the lock with.',
            'example': 1234
          }
        },
        'description': 'Lock all or specified locks.'
      },
      'unlock': {
        'fields': {
          'entity_id': {
            'description': 'Name of lock to unlock.',
            'example': 'lock.front_door'
          },
          'code': {
            'description': 'An optional code to unlock the lock with.',
            'example': 1234
          }
        },
        'description': 'Unlock all or specified locks.'
      }
    },
    'input_select': {
      'select_previous': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input select to select the previous value for.',
            'example': 'input_select.my_select'
          }
        },
        'description': 'Select the previous options of an input select entity.'
      },
      'set_options': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input select to set the new options for.',
            'example': 'input_select.my_select'
          },
          'options': {
            'description': 'Options for the input select entity.',
            'example': '[\'Item A\', \'Item B\', \'Item C\']'
          }
        },
        'description': 'Set the options of an input select entity.'
      },
      'select_next': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input select to select the next value for.',
            'example': 'input_select.my_select'
          }
        },
        'description': 'Select the next options of an input select entity.'
      },
      'select_option': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input select to select the value.',
            'example': 'input_select.my_select'
          },
          'option': {
            'description': 'Option to be selected.',
            'example': '\'Item A\''
          }
        },
        'description': 'Select an option of an input select entity.'
      }
    },
    'recorder': {
      'purge': {
        'fields': {
          'keep_days': {
            'description': 'Number of history days to keep in database after purge. Value >= 0.',
            'example': 2
          },
          'repack': {
            'description': 'Attempt to save disk space by rewriting the entire database file.',
            'example': true
          }
        },
        'description': 'Start purge task - delete events and states older than x days, according to keep_days service data.'
      }
    },
    'persistent_notification': {
      'create': {
        'fields': {
          'message': {
            'description': 'Message body of the notification. [Templates accepted]',
            'example': 'Please check your configuration.yaml.'
          },
          'title': {
            'description': 'Optional title for your notification. [Optional, Templates accepted]',
            'example': 'Test notification'
          },
          'notification_id': {
            'description': 'Target ID of the notification, will replace a notification with the same Id. [Optional]',
            'example': 1234
          }
        },
        'description': 'Show a notification in the frontend.'
      },
      'dismiss': {
        'fields': {
          'notification_id': {
            'description': 'Target ID of the notification, which should be removed. [Required]',
            'example': 1234
          }
        },
        'description': 'Remove a notification from the frontend.'
      }
    },
    'timer': {
      'pause': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the timer to pause. [optional]',
            'example': 'timer.timer0'
          }
        },
        'description': 'Pause a timer.'
      },
      'cancel': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the timer to cancel. [optional]',
            'example': 'timer.timer0'
          }
        },
        'description': 'Cancel a timer.'
      },
      'finish': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the timer to finish. [optional]',
            'example': 'timer.timer0'
          }
        },
        'description': 'Finish a timer.'
      },
      'start': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the timer to start. [optional]',
            'example': 'timer.timer0'
          },
          'duration': {
            'description': 'Duration the timer requires to finish. [optional]',
            'example': '00:01:00 or 60'
          }
        },
        'description': 'Start a timer.'
      }
    },
    'input_boolean': {
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input boolean to turn off.',
            'example': 'input_boolean.notify_alerts'
          }
        },
        'description': 'Turns off an input boolean'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input boolean to toggle.',
            'example': 'input_boolean.notify_alerts'
          }
        },
        'description': 'Toggles an input boolean.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input boolean to turn on.',
            'example': 'input_boolean.notify_alerts'
          }
        },
        'description': 'Turns on an input boolean.'
      }
    },
    'fan': {
      'set_speed': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of the entities to set',
            'example': 'fan.living_room'
          },
          'speed': {
            'description': 'Speed setting',
            'example': 'low'
          }
        },
        'description': 'Sets fan speed.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Names(s) of the entities to turn on',
            'example': 'fan.living_room'
          },
          'speed': {
            'description': 'Speed setting',
            'example': 'high'
          }
        },
        'description': 'Turns fan on.'
      },
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Names(s) of the entities to turn off',
            'example': 'fan.living_room'
          }
        },
        'description': 'Turns fan off.'
      },
      'set_direction': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of the entities to toggle',
            'example': 'fan.living_room'
          },
          'direction': {
            'description': 'The direction to rotate. Either \'forward\' or \'reverse\'',
            'example': 'forward'
          }
        },
        'description': 'Set the fan rotation.'
      },
      'oscillate': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of the entities to oscillate',
            'example': 'fan.desk_fan'
          },
          'oscillating': {
            'description': 'Flag to turn on/off oscillation',
            'example': true
          }
        },
        'description': 'Oscillates the fan.'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of the entities to toggle',
            'exampl': 'fan.living_room'
          }
        },
        'description': 'Toggle the fan on/off.'
      }
    },
    'climate': {
      'set_humidity': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          },
          'humidity': {
            'description': 'New target humidity for climate device.',
            'example': 60
          }
        },
        'description': 'Set target humidity of climate device.'
      },
      'set_operation_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.nest'
          },
          'operation_mode': {
            'description': 'New value of operation mode.',
            'example': 'Heat'
          }
        },
        'description': 'Set operation mode for climate device.'
      },
      'set_aux_heat': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          },
          'aux_heat': {
            'description': 'New value of axillary heater.',
            'example': true
          }
        },
        'description': 'Turn auxiliary heater on/off for climate device.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          }
        },
        'description': 'Turn climate device on.'
      },
      'set_hold_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          },
          'hold_mode': {
            'description': 'New value of hold mode',
            'example': 'away'
          }
        },
        'description': 'Turn hold mode for climate device.'
      },
      'set_away_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          },
          'away_mode': {
            'description': 'New value of away mode.',
            'example': true
          }
        },
        'description': 'Turn away mode on/off for climate device.'
      },
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          }
        },
        'description': 'Turn climate device off.'
      },
      'set_fan_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.nest'
          },
          'fan_mode': {
            'description': 'New value of fan mode.',
            'example': 'On Low'
          }
        },
        'description': 'Set fan operation for climate device.'
      },
      'set_temperature': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.kitchen'
          },
          'temperature': {
            'description': 'New target temperature for HVAC.',
            'example': 25
          },
          'target_temp_high': {
            'description': 'New target high tempereature for HVAC.',
            'example': 26
          },
          'target_temp_low': {
            'description': 'New target low temperature for HVAC.',
            'example': 20
          },
          'operation_mode': {
            'description': 'Operation mode to set temperature to. This defaults to current_operation mode if not set, or set incorrectly.',
            'example': 'Heat'
          }
        },
        'description': 'Set target temperature of climate device.'
      },
      'set_swing_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change.',
            'example': 'climate.nest'
          },
          'swing_mode': {
            'description': 'New value of swing mode.',
            'example': null
          }
        },
        'description': 'Set swing operation for climate device.'
      }
    },
    'switch': {
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn off.',
            'example': 'switch.living_room'
          }
        },
        'description': 'Turn a switch off.'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to toggle.',
            'example': 'switch.living_room'
          }
        },
        'description': 'Toggles a switch state.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn on',
            'example': 'switch.living_room'
          }
        },
        'description': 'Turn a switch on.'
      }
    },
    'script': {
      'turn_off': {
        'fields': {},
        'description': ''
      },
      'demo': {
        'fields': {},
        'description': ''
      },
      'reload': {
        'fields': {},
        'description': ''
      },
      'toggle': {
        'fields': {},
        'description': ''
      },
      'turn_on': {
        'fields': {},
        'description': ''
      }
    },
    'scene': {
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of scenes to turn on',
            'example': 'scene.romantic'
          }
        },
        'description': 'Activate a scene.'
      }
    },
    'system_log': {
      'clear': {
        'fields': {},
        'description': ''
      },
      'write': {
        'fields': {},
        'description': ''
      }
    },
    'camera': {
      'disable_motion_detection': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to disable motion detection.',
            'example': 'camera.living_room_camera'
          }
        },
        'description': 'Disable the motion detection in a camera.'
      },
      'enable_motion_detection': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to enable motion detection.',
            'example': 'camera.living_room_camera'
          }
        },
        'description': 'Enable the motion detection in a camera.'
      },
      'snapshot': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to create snapshots from.',
            'example': 'camera.living_room_camera'
          },
          'filename': {
            'description': 'Template of a Filename. Variable is entity_id.',
            'example': '/tmp/snapshot_{{ entity_id }}'
          }
        },
        'description': 'Take a snapshot from a camera.'
      }
    },
    'image_processing': {
      'scan': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to scan immediately.',
            'example': 'image_processing.alpr_garage'
          }
        },
        'description': 'Process an image immediately.'
      }
    },
    'media_player': {
      'media_previous_track': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to send previous track command to.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Send the media player the command for previous track.'
      },
      'clear_playlist': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change source on.',
            'example': 'media_player.living_room_chromecast'
          }
        },
        'description': 'Send the media player the command to clear players playlist.'
      },
      'shuffle_set': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to set.',
            'example': 'media_player.spotify'
          },
          'shuffle': {
            'description': 'True/false for enabling/disabling shuffle.',
            'example': true
          }
        },
        'description': 'Set shuffling state.'
      },
      'media_seek': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to seek media on.',
            'example': 'media_player.living_room_chromecast'
          },
          'seek_position': {
            'description': 'Position to seek to. The format is platform dependent.',
            'example': 100
          }
        },
        'description': 'Send the media player the command to seek in current playing media.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn on.',
            'example': 'media_player.living_room_chromecast'
          }
        },
        'description': 'Turn a media player power on.'
      },
      'media_play_pause': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to toggle play/pause state on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Toggle media player play/pause state.'
      },
      'media_next_track': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to send next track command to.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Send the media player the command for next track.'
      },
      'media_pause': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to pause on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Send the media player the command for pause.'
      },
      'volume_down': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn volume down on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Turn a media player volume down.'
      },
      'volume_set': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to set volume level on.',
            'example': 'media_player.living_room_sonos'
          },
          'volume_level': {
            'description': 'Volume level to set as float.',
            'example': 0.6
          }
        },
        'description': 'Set a media player\'s volume level.'
      },
      'media_stop': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to stop on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Send the media player the stop command.'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to toggle.',
            'example': 'media_player.living_room_chromecast'
          }
        },
        'description': 'Toggles a media player power state.'
      },
      'media_play': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to play on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Send the media player the command for play.'
      },
      'play_media': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to seek media on',
            'example': 'media_player.living_room_chromecast'
          },
          'media_content_id': {
            'description': 'The ID of the content to play. Platform dependent.',
            'example': 'https://home-assistant.io/images/cast/splash.png'
          },
          'media_content_type': {
            'description': 'The type of the content to play. Must be one of music, tvshow, video, episode, channel or playlist',
            'example': 'music'
          }
        },
        'description': 'Send the media player the command for playing media.'
      },
      'volume_mute': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to mute.',
            'example': 'media_player.living_room_sonos'
          },
          'is_volume_muted': {
            'description': 'True/false for mute/unmute.',
            'example': true
          }
        },
        'description': 'Mute a media player\'s volume.'
      },
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn off.',
            'example': 'media_player.living_room_chromecast'
          }
        },
        'description': 'Turn a media player power off.'
      },
      'select_sound_mode': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change sound mode on.',
            'example': 'media_player.marantz'
          },
          'sound_mode': {
            'description': 'Name of the sound mode to switch to.',
            'example': 'Music'
          }
        },
        'description': 'Send the media player the command to change sound mode.'
      },
      'select_source': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to change source on.',
            'example': 'media_player.media_player.txnr535_0009b0d81f82'
          },
          'source': {
            'description': 'Name of the source to switch to. Platform dependent.',
            'example': 'video1'
          }
        },
        'description': 'Send the media player the command to change input source.'
      },
      'volume_up': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn volume up on.',
            'example': 'media_player.living_room_sonos'
          }
        },
        'description': 'Turn a media player volume up.'
      }
    },
    'input_number': {
      'set_value': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input number to set the new value.',
            'example': 'input_number.threshold'
          },
          'value': {
            'description': 'The target value the entity should be set to.',
            'example': 42
          }
        },
        'description': 'Set the value of an input number entity.'
      },
      'increment': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input number the should be incremented.',
            'example': 'input_number.threshold'
          }
        },
        'description': 'Increment the value of an input number entity by its stepping.'
      },
      'decrement': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input number the should be decremented.',
            'example': 'input_number.threshold'
          }
        },
        'description': 'Decrement the value of an input number entity by its stepping.'
      }
    },
    'device_tracker': {
      'see': {
        'fields': {
          'mac': {
            'description': 'MAC address of device',
            'example': 'FF:FF:FF:FF:FF:FF'
          },
          'dev_id': {
            'description': 'Id of device (find id in known_devices.yaml).',
            'example': 'phonedave'
          },
          'host_name': {
            'description': 'Hostname of device',
            'example': 'Dave'
          },
          'location_name': {
            'description': 'Name of location where device is located (not_home is away).',
            'example': 'home'
          },
          'gps': {
            'description': 'GPS coordinates where device is located (latitude, longitude).',
            'example': '[51.509802, -0.086692]'
          },
          'gps_accuracy': {
            'description': 'Accuracy of GPS coordinates.',
            'example': '80'
          },
          'battery': {
            'description': 'Battery level of device.',
            'example': '100'
          }
        },
        'description': 'Control tracked device.'
      },
      'demo': {
        'fields': {},
        'description': ''
      }
    },
    'homeassistant': {
      'stop': {
        'fields': {},
        'description': 'Stop the Home Assistant service. It is normal to get a \'Failed to call service homeassistant/stop\' message.'
      },
      'check_config': {
        'fields': {},
        'description': 'Check the Home Assistant configuration files for errors. Errors will be displayed in the Home Assistant log.'
      },
      'reload_core_config': {
        'fields': {},
        'description': 'Reload the core configuration.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'The entity_id of the device to turn on.',
            'example': 'light.living_room'
          }
        },
        'description': 'Generic service to turn devices on under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.'
      },
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'The entity_id of the device to turn off.',
            'example': 'light.living_room'
          }
        },
        'description': 'Generic service to turn devices off under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.'
      },
      'restart': {
        'fields': {},
        'description': 'Restart the Home Assistant service. It is normal to get a \'Failed to call service homeassistant/restart\' message.'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'The entity_id of the device to toggle on/off.',
            'example': 'light.living_room'
          }
        },
        'description': 'Generic service to toggle devices on/off under any domain. Same usage as the light.turn_on, switch.turn_on, etc. services.'
      }
    },
    'light': {
      'turn_off': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn off.',
            'example': 'light.kitchen'
          },
          'transition': {
            'description': 'Duration in seconds it takes to get to next state.',
            'example': 60
          },
          'flash': {
            'description': 'If the light should flash.',
            'values': [
              'short',
              'long'
            ]
          }
        },
        'description': 'Turn a light off.'
      },
      'toggle': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to toggle.',
            'example': 'light.kitchen'
          },
          'transition': {
            'description': 'Duration in seconds it takes to get to next state.',
            'example': 60
          }
        },
        'description': 'Toggles a light.'
      },
      'turn_on': {
        'fields': {
          'entity_id': {
            'description': 'Name(s) of entities to turn on',
            'example': 'light.kitchen'
          },
          'transition': {
            'description': 'Duration in seconds it takes to get to next state',
            'example': 60
          },
          'rgb_color': {
            'description': 'Color for the light in RGB-format.',
            'example': '[255, 100, 100]'
          },
          'color_name': {
            'description': 'A human readable color name.',
            'example': 'red'
          },
          'hs_color': {
            'description': 'Color for the light in hue/sat format. Hue is 0-360 and Sat is 0-100.',
            'example': '[300, 70]'
          },
          'xy_color': {
            'description': 'Color for the light in XY-format.',
            'example': '[0.52, 0.43]'
          },
          'color_temp': {
            'description': 'Color temperature for the light in mireds.',
            'example': 250
          },
          'kelvin': {
            'description': 'Color temperature for the light in Kelvin.',
            'example': 4000
          },
          'white_value': {
            'description': 'Number between 0..255 indicating level of white.',
            'example': '250'
          },
          'brightness': {
            'description': 'Number between 0..255 indicating brightness.',
            'example': 120
          },
          'brightness_pct': {
            'description': 'Number between 0..100 indicating percentage of full brightness.',
            'example': 47
          },
          'profile': {
            'description': 'Name of a light profile to use.',
            'example': 'relax'
          },
          'flash': {
            'description': 'If the light should flash.',
            'values': [
              'short',
              'long'
            ]
          },
          'effect': {
            'description': 'Light effect.',
            'values': [
              'colorloop',
              'random'
            ]
          }
        },
        'description': 'Turn a light on.'
      }
    },
    'input_text': {
      'set_value': {
        'fields': {
          'entity_id': {
            'description': 'Entity id of the input text to set the new value.',
            'example': 'input_text.text1'
          },
          'value': {
            'description': 'The target value the entity should be set to.',
            'example': 'This is an example text'
          }
        },
        'description': 'Set the value of an input text entity.'
      }
    }
  }
};
