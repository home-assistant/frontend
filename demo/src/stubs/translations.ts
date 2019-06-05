import { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

export const mockTranslations = (hass: MockHomeAssistant) => {
  hass.mockWS("frontend/get_translations", () => ({
    resources: {
      "component.lifx.config.abort.no_devices_found":
        "No LIFX devices found on the network.",
      "component.lifx.config.abort.single_instance_allowed":
        "Only a single configuration of LIFX is possible.",
      "component.lifx.config.step.confirm.description":
        "Do you want to set up LIFX?",
      "component.lifx.config.step.confirm.title": "LIFX",
      "component.lifx.config.title": "LIFX",
      "component.hangouts.config.abort.already_configured":
        "Google Hangouts is already configured",
      "component.hangouts.config.abort.unknown": "Unknown error occurred.",
      "component.hangouts.config.error.invalid_2fa":
        "Invalid 2 Factor Authentication, please try again.",
      "component.hangouts.config.error.invalid_2fa_method":
        "Invalid 2FA Method (Verify on Phone).",
      "component.hangouts.config.error.invalid_login":
        "Invalid Login, please try again.",
      "component.hangouts.config.step.2fa.data.2fa": "2FA Pin",
      "component.hangouts.config.step.2fa.title": "2-Factor-Authentication",
      "component.hangouts.config.step.user.data.email": "E-Mail Address",
      "component.hangouts.config.step.user.data.password": "Password",
      "component.hangouts.config.step.user.title": "Google Hangouts Login",
      "component.hangouts.config.title": "Google Hangouts",
      "component.rainmachine.config.error.identifier_exists":
        "Account already registered",
      "component.rainmachine.config.error.invalid_credentials":
        "Invalid credentials",
      "component.rainmachine.config.step.user.data.ip_address":
        "Hostname or IP Address",
      "component.rainmachine.config.step.user.data.password": "Password",
      "component.rainmachine.config.step.user.data.port": "Port",
      "component.rainmachine.config.step.user.title":
        "Fill in your information",
      "component.rainmachine.config.title": "RainMachine",
      "component.homematicip_cloud.config.abort.already_configured":
        "Access point is already configured",
      "component.homematicip_cloud.config.abort.connection_aborted":
        "Could not connect to HMIP server",
      "component.homematicip_cloud.config.abort.unknown":
        "Unknown error occurred.",
      "component.homematicip_cloud.config.error.invalid_pin":
        "Invalid PIN, please try again.",
      "component.homematicip_cloud.config.error.press_the_button":
        "Please press the blue button.",
      "component.homematicip_cloud.config.error.register_failed":
        "Failed to register, please try again.",
      "component.homematicip_cloud.config.error.timeout_button":
        "Blue button press timeout, please try again.",
      "component.homematicip_cloud.config.step.init.data.hapid":
        "Access point ID (SGTIN)",
      "component.homematicip_cloud.config.step.init.data.name":
        "Name (optional, used as name prefix for all devices)",
      "component.homematicip_cloud.config.step.init.data.pin":
        "Pin Code (optional)",
      "component.homematicip_cloud.config.step.init.title":
        "Pick HomematicIP Access point",
      "component.homematicip_cloud.config.step.link.description":
        "Press the blue button on the access point and the submit button to register HomematicIP with Home Assistant.\n\n![Location of button on bridge](/static/images/config_flows/config_homematicip_cloud.png)",
      "component.homematicip_cloud.config.step.link.title": "Link Access point",
      "component.homematicip_cloud.config.title": "HomematicIP Cloud",
      "component.daikin.config.abort.already_configured":
        "Device is already configured",
      "component.daikin.config.abort.device_fail":
        "Unexpected error creating device.",
      "component.daikin.config.abort.device_timeout":
        "Timeout connecting to the device.",
      "component.daikin.config.step.user.data.host": "Host",
      "component.daikin.config.step.user.description":
        "Enter IP address of your Daikin AC.",
      "component.daikin.config.step.user.title": "Configure Daikin AC",
      "component.daikin.config.title": "Daikin AC",
      "component.unifi.config.abort.already_configured":
        "Controller site is already configured",
      "component.unifi.config.abort.user_privilege":
        "User needs to be administrator",
      "component.unifi.config.error.faulty_credentials": "Bad user credentials",
      "component.unifi.config.error.service_unavailable":
        "No service available",
      "component.unifi.config.step.user.data.host": "Host",
      "component.unifi.config.step.user.data.password": "Password",
      "component.unifi.config.step.user.data.port": "Port",
      "component.unifi.config.step.user.data.site": "Site ID",
      "component.unifi.config.step.user.data.username": "User name",
      "component.unifi.config.step.user.data.verify_ssl":
        "Controller using proper certificate",
      "component.unifi.config.step.user.title": "Set up UniFi Controller",
      "component.unifi.config.title": "UniFi Controller",
      "component.nest.config.abort.already_setup":
        "You can only configure a single Nest account.",
      "component.nest.config.abort.authorize_url_fail":
        "Unknown error generating an authorize url.",
      "component.nest.config.abort.authorize_url_timeout":
        "Timeout generating authorize url.",
      "component.nest.config.abort.no_flows":
        "You need to configure Nest before being able to authenticate with it. [Please read the instructions](https://www.home-assistant.io/components/nest/).",
      "component.nest.config.error.internal_error":
        "Internal error validating code",
      "component.nest.config.error.invalid_code": "Invalid code",
      "component.nest.config.error.timeout": "Timeout validating code",
      "component.nest.config.error.unknown": "Unknown error validating code",
      "component.nest.config.step.init.data.flow_impl": "Provider",
      "component.nest.config.step.init.description":
        "Pick via which authentication provider you want to authenticate with Nest.",
      "component.nest.config.step.init.title": "Authentication Provider",
      "component.nest.config.step.link.data.code": "Pin code",
      "component.nest.config.step.link.description":
        "To link your Nest account, [authorize your account]({url}).\n\nAfter authorization, copy-paste the provided pin code below.",
      "component.nest.config.step.link.title": "Link Nest Account",
      "component.nest.config.title": "Nest",
      "component.mailgun.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive Mailgun messages.",
      "component.mailgun.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.mailgun.config.create_entry.default":
        "To send events to Home Assistant, you will need to setup [Webhooks with Mailgun]({mailgun_url}).\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n- Content Type: application/json\n\nSee [the documentation]({docs_url}) on how to configure automations to handle incoming data.",
      "component.mailgun.config.step.user.description":
        "Are you sure you want to set up Mailgun?",
      "component.mailgun.config.step.user.title": "Set up the Mailgun Webhook",
      "component.mailgun.config.title": "Mailgun",
      "component.tellduslive.config.abort.already_setup":
        "TelldusLive is already configured",
      "component.tellduslive.config.abort.authorize_url_fail":
        "Unknown error generating an authorize url.",
      "component.tellduslive.config.abort.authorize_url_timeout":
        "Timeout generating authorize url.",
      "component.tellduslive.config.abort.unknown": "Unknown error occurred",
      "component.tellduslive.config.error.auth_error":
        "Authentication error, please try again",
      "component.tellduslive.config.step.auth.description":
        "To link your TelldusLive account:\n 1. Click the link below\n 2. Login to Telldus Live\n 3. Authorize **{app_name}** (click **Yes**).\n 4. Come back here and click **SUBMIT**.\n\n [Link TelldusLive account]({auth_url})",
      "component.tellduslive.config.step.auth.title":
        "Authenticate against TelldusLive",
      "component.tellduslive.config.step.user.data.host": "Host",
      "component.tellduslive.config.step.user.title": "Pick endpoint.",
      "component.tellduslive.config.title": "Telldus Live",
      "component.esphome.config.abort.already_configured":
        "ESP is already configured",
      "component.esphome.config.error.connection_error":
        "Can't connect to ESP. Please make sure your YAML file contains an 'api:' line.",
      "component.esphome.config.error.invalid_password": "Invalid password!",
      "component.esphome.config.error.resolve_error":
        "Can't resolve address of the ESP. If this error persists, please set a static IP address: https://esphomelib.com/esphomeyaml/components/wifi.html#manual-ips",
      "component.esphome.config.step.authenticate.data.password": "Password",
      "component.esphome.config.step.authenticate.description":
        "Please enter the password you set in your configuration.",
      "component.esphome.config.step.authenticate.title": "Enter Password",
      "component.esphome.config.step.user.data.host": "Host",
      "component.esphome.config.step.user.data.port": "Port",
      "component.esphome.config.step.user.description":
        "Please enter connection settings of your [ESPHome](https://esphomelib.com/) node.",
      "component.esphome.config.step.user.title": "ESPHome",
      "component.esphome.config.title": "ESPHome",
      "component.luftdaten.config.error.communication_error":
        "Unable to communicate with the Luftdaten API",
      "component.luftdaten.config.error.invalid_sensor":
        "Sensor not available or invalid",
      "component.luftdaten.config.error.sensor_exists":
        "Sensor already registered",
      "component.luftdaten.config.step.user.data.show_on_map": "Show on map",
      "component.luftdaten.config.step.user.data.station_id":
        "Luftdaten Sensor ID",
      "component.luftdaten.config.step.user.title": "Define Luftdaten",
      "component.luftdaten.config.title": "Luftdaten",
      "component.upnp.config.abort.already_configured":
        "UPnP/IGD is already configured",
      "component.upnp.config.abort.incomplete_device":
        "Ignoring incomplete UPnP device",
      "component.upnp.config.abort.no_devices_discovered":
        "No UPnP/IGDs discovered",
      "component.upnp.config.abort.no_devices_found":
        "No UPnP/IGD devices found on the network.",
      "component.upnp.config.abort.no_sensors_or_port_mapping":
        "Enable at least sensors or port mapping",
      "component.upnp.config.abort.single_instance_allowed":
        "Only a single configuration of UPnP/IGD is necessary.",
      "component.upnp.config.step.confirm.description":
        "Do you want to set up UPnP/IGD?",
      "component.upnp.config.step.confirm.title": "UPnP/IGD",
      "component.upnp.config.step.init.title": "UPnP/IGD",
      "component.upnp.config.step.user.data.enable_port_mapping":
        "Enable port mapping for Home Assistant",
      "component.upnp.config.step.user.data.enable_sensors":
        "Add traffic sensors",
      "component.upnp.config.step.user.data.igd": "UPnP/IGD",
      "component.upnp.config.step.user.title":
        "Configuration options for the UPnP/IGD",
      "component.upnp.config.title": "UPnP/IGD",
      "component.point.config.abort.already_setup":
        "You can only configure a Point account.",
      "component.point.config.abort.authorize_url_fail":
        "Unknown error generating an authorize url.",
      "component.point.config.abort.authorize_url_timeout":
        "Timeout generating authorize url.",
      "component.point.config.abort.external_setup":
        "Point successfully configured from another flow.",
      "component.point.config.abort.no_flows":
        "You need to configure Point before being able to authenticate with it. [Please read the instructions](https://www.home-assistant.io/components/point/).",
      "component.point.config.create_entry.default":
        "Successfully authenticated with Minut for your Point device(s)",
      "component.point.config.error.follow_link":
        "Please follow the link and authenticate before pressing Submit",
      "component.point.config.error.no_token": "Not authenticated with Minut",
      "component.point.config.step.auth.description":
        "Please follow the link below and <b>Accept</b> access to your Minut account, then come back and press <b>Submit</b> below.\n\n[Link]({authorization_url})",
      "component.point.config.step.auth.title": "Authenticate Point",
      "component.point.config.step.user.data.flow_impl": "Provider",
      "component.point.config.step.user.description":
        "Pick via which authentication provider you want to authenticate with Point.",
      "component.point.config.step.user.title": "Authentication Provider",
      "component.point.config.title": "Minut Point",
      "component.auth.mfa_setup.notify.abort.no_available_service":
        "No notification services available.",
      "component.auth.mfa_setup.notify.error.invalid_code":
        "Invalid code, please try again.",
      "component.auth.mfa_setup.notify.step.init.description":
        "Please select one of the notification services:",
      "component.auth.mfa_setup.notify.step.init.title":
        "Set up one-time password delivered by notify component",
      "component.auth.mfa_setup.notify.step.setup.description":
        "A one-time password has been sent via **notify.{notify_service}**. Please enter it below:",
      "component.auth.mfa_setup.notify.step.setup.title": "Verify setup",
      "component.auth.mfa_setup.notify.title": "Notify One-Time Password",
      "component.auth.mfa_setup.totp.error.invalid_code":
        "Invalid code, please try again. If you get this error consistently, please make sure the clock of your Home Assistant system is accurate.",
      "component.auth.mfa_setup.totp.step.init.description":
        "To activate two factor authentication using time-based one-time passwords, scan the QR code with your authentication app. If you don't have one, we recommend either [Google Authenticator](https://support.google.com/accounts/answer/1066447) or [Authy](https://authy.com/).\n\n{qr_code}\n\nAfter scanning the code, enter the six digit code from your app to verify the setup. If you have problems scanning the QR code, do a manual setup with code **`{code}`**.",
      "component.auth.mfa_setup.totp.step.init.title":
        "Set up two-factor authentication using TOTP",
      "component.auth.mfa_setup.totp.title": "TOTP",
      "component.emulated_roku.config.abort.name_exists": "Name already exists",
      "component.emulated_roku.config.step.user.data.advertise_ip":
        "Advertise IP",
      "component.emulated_roku.config.step.user.data.advertise_port":
        "Advertise port",
      "component.emulated_roku.config.step.user.data.host_ip": "Host IP",
      "component.emulated_roku.config.step.user.data.listen_port":
        "Listen port",
      "component.emulated_roku.config.step.user.data.name": "Name",
      "component.emulated_roku.config.step.user.data.upnp_bind_multicast":
        "Bind multicast (True/False)",
      "component.emulated_roku.config.step.user.title":
        "Define server configuration",
      "component.emulated_roku.config.title": "EmulatedRoku",
      "component.owntracks.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.owntracks.config.create_entry.default":
        "\n\nOn Android, open [the OwnTracks app]({android_url}), go to preferences -> connection. Change the following settings:\n - Mode: Private HTTP\n - Host: {webhook_url}\n - Identification:\n   - Username: `<Your name>`\n   - Device ID: `<Your device name>`\n\nOn iOS, open [the OwnTracks app]({ios_url}), tap (i) icon in top left -> settings. Change the following settings:\n - Mode: HTTP\n - URL: {webhook_url}\n - Turn on authentication\n - UserID: `<Your name>`\n\n{secret}\n\nSee [the documentation]({docs_url}) for more information.",
      "component.owntracks.config.step.user.description":
        "Are you sure you want to set up OwnTracks?",
      "component.owntracks.config.step.user.title": "Set up OwnTracks",
      "component.owntracks.config.title": "OwnTracks",
      "component.zone.config.error.name_exists": "Name already exists",
      "component.zone.config.step.init.data.icon": "Icon",
      "component.zone.config.step.init.data.latitude": "Latitude",
      "component.zone.config.step.init.data.longitude": "Longitude",
      "component.zone.config.step.init.data.name": "Name",
      "component.zone.config.step.init.data.passive": "Passive",
      "component.zone.config.step.init.data.radius": "Radius",
      "component.zone.config.step.init.title": "Define zone parameters",
      "component.zone.config.title": "Zone",
      "component.hue.config.abort.all_configured":
        "All Philips Hue bridges are already configured",
      "component.hue.config.abort.already_configured":
        "Bridge is already configured",
      "component.hue.config.abort.cannot_connect":
        "Unable to connect to the bridge",
      "component.hue.config.abort.discover_timeout":
        "Unable to discover Hue bridges",
      "component.hue.config.abort.no_bridges":
        "No Philips Hue bridges discovered",
      "component.hue.config.abort.unknown": "Unknown error occurred",
      "component.hue.config.error.linking": "Unknown linking error occurred.",
      "component.hue.config.error.register_failed":
        "Failed to register, please try again",
      "component.hue.config.step.init.data.host": "Host",
      "component.hue.config.step.init.title": "Pick Hue bridge",
      "component.hue.config.step.link.description":
        "Press the button on the bridge to register Philips Hue with Home Assistant.\n\n![Location of button on bridge](/static/images/config_philips_hue.jpg)",
      "component.hue.config.step.link.title": "Link Hub",
      "component.hue.config.title": "Philips Hue",
      "component.tradfri.config.abort.already_configured":
        "Bridge is already configured",
      "component.tradfri.config.error.cannot_connect":
        "Unable to connect to the gateway.",
      "component.tradfri.config.error.invalid_key":
        "Failed to register with provided key. If this keeps happening, try restarting the gateway.",
      "component.tradfri.config.error.timeout": "Timeout validating the code.",
      "component.tradfri.config.step.auth.data.host": "Host",
      "component.tradfri.config.step.auth.data.security_code": "Security Code",
      "component.tradfri.config.step.auth.description":
        "You can find the security code on the back of your gateway.",
      "component.tradfri.config.step.auth.title": "Enter security code",
      "component.tradfri.config.title": "IKEA TRÅDFRI",
      "component.mqtt.config.abort.single_instance_allowed":
        "Only a single configuration of MQTT is allowed.",
      "component.mqtt.config.error.cannot_connect":
        "Unable to connect to the broker.",
      "component.mqtt.config.step.broker.data.broker": "Broker",
      "component.mqtt.config.step.broker.data.discovery": "Enable discovery",
      "component.mqtt.config.step.broker.data.password": "Password",
      "component.mqtt.config.step.broker.data.port": "Port",
      "component.mqtt.config.step.broker.data.username": "Username",
      "component.mqtt.config.step.broker.description":
        "Please enter the connection information of your MQTT broker.",
      "component.mqtt.config.step.broker.title": "MQTT",
      "component.mqtt.config.step.hassio_confirm.data.discovery":
        "Enable discovery",
      "component.mqtt.config.step.hassio_confirm.description":
        "Do you want to configure Home Assistant to connect to the MQTT broker provided by the hass.io add-on {addon}?",
      "component.mqtt.config.step.hassio_confirm.title":
        "MQTT Broker via Hass.io add-on",
      "component.mqtt.config.title": "MQTT",
      "component.geofency.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive messages from Geofency.",
      "component.geofency.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.geofency.config.create_entry.default":
        "To send events to Home Assistant, you will need to setup the webhook feature in Geofency.\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n\nSee [the documentation]({docs_url}) for further details.",
      "component.geofency.config.step.user.description":
        "Are you sure you want to set up the Geofency Webhook?",
      "component.geofency.config.step.user.title":
        "Set up the Geofency Webhook",
      "component.geofency.config.title": "Geofency Webhook",
      "component.simplisafe.config.error.identifier_exists":
        "Account already registered",
      "component.simplisafe.config.error.invalid_credentials":
        "Invalid credentials",
      "component.simplisafe.config.step.user.data.code":
        "Code (for Home Assistant)",
      "component.simplisafe.config.step.user.data.password": "Password",
      "component.simplisafe.config.step.user.data.username": "Email Address",
      "component.simplisafe.config.step.user.title": "Fill in your information",
      "component.simplisafe.config.title": "SimpliSafe",
      "component.dialogflow.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive Dialogflow messages.",
      "component.dialogflow.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.dialogflow.config.create_entry.default":
        "To send events to Home Assistant, you will need to setup [webhook integration of Dialogflow]({dialogflow_url}).\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n- Content Type: application/json\n\nSee [the documentation]({docs_url}) for further details.",
      "component.dialogflow.config.step.user.description":
        "Are you sure you want to set up Dialogflow?",
      "component.dialogflow.config.step.user.title":
        "Set up the Dialogflow Webhook",
      "component.dialogflow.config.title": "Dialogflow",
      "component.deconz.config.abort.already_configured":
        "Bridge is already configured",
      "component.deconz.config.abort.no_bridges":
        "No deCONZ bridges discovered",
      "component.deconz.config.abort.one_instance_only":
        "Component only supports one deCONZ instance",
      "component.deconz.config.error.no_key": "Couldn't get an API key",
      "component.deconz.config.step.init.data.host": "Host",
      "component.deconz.config.step.init.data.port": "Port",
      "component.deconz.config.step.init.title": "Define deCONZ gateway",
      "component.deconz.config.step.link.description":
        'Unlock your deCONZ gateway to register with Home Assistant.\n\n1. Go to deCONZ system settings\n2. Press "Unlock Gateway" button',
      "component.deconz.config.step.link.title": "Link with deCONZ",
      "component.deconz.config.step.options.data.allow_clip_sensor":
        "Allow importing virtual sensors",
      "component.deconz.config.step.options.data.allow_deconz_groups":
        "Allow importing deCONZ groups",
      "component.deconz.config.step.options.title":
        "Extra configuration options for deCONZ",
      "component.deconz.config.title": "deCONZ Zigbee gateway",
      "component.openuv.config.error.identifier_exists":
        "Coordinates already registered",
      "component.openuv.config.error.invalid_api_key": "Invalid API key",
      "component.openuv.config.step.user.data.api_key": "OpenUV API Key",
      "component.openuv.config.step.user.data.elevation": "Elevation",
      "component.openuv.config.step.user.data.latitude": "Latitude",
      "component.openuv.config.step.user.data.longitude": "Longitude",
      "component.openuv.config.step.user.title": "Fill in your information",
      "component.openuv.config.title": "OpenUV",
      "component.locative.config.title": "Locative Webhook",
      "component.locative.config.step.user.title":
        "Set up the Locative Webhook",
      "component.locative.config.step.user.description":
        "Are you sure you want to set up the Locative Webhook?",
      "component.locative.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.locative.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive messages from Geofency.",
      "component.locative.config.create_entry.default":
        "To send locations to Home Assistant, you will need to setup the webhook feature in the Locative app.\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n\nSee [the documentation]({docs_url}) for further details.",
      "component.ios.config.abort.single_instance_allowed":
        "Only a single configuration of Home Assistant iOS is necessary.",
      "component.ios.config.step.confirm.description":
        "Do you want to set up the Home Assistant iOS component?",
      "component.ios.config.step.confirm.title": "Home Assistant iOS",
      "component.ios.config.title": "Home Assistant iOS",
      "component.smhi.config.error.name_exists": "Name already exists",
      "component.smhi.config.error.wrong_location": "Location Sweden only",
      "component.smhi.config.step.user.data.latitude": "Latitude",
      "component.smhi.config.step.user.data.longitude": "Longitude",
      "component.smhi.config.step.user.data.name": "Name",
      "component.smhi.config.step.user.title": "Location in Sweden",
      "component.smhi.config.title": "Swedish weather service (SMHI)",
      "component.sonos.config.abort.no_devices_found":
        "No Sonos devices found on the network.",
      "component.sonos.config.abort.single_instance_allowed":
        "Only a single configuration of Sonos is necessary.",
      "component.sonos.config.step.confirm.description":
        "Do you want to set up Sonos?",
      "component.sonos.config.step.confirm.title": "Sonos",
      "component.sonos.config.title": "Sonos",
      "component.ifttt.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive IFTTT messages.",
      "component.ifttt.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.ifttt.config.create_entry.default":
        'To send events to Home Assistant, you will need to use the "Make a web request" action from the [IFTTT Webhook applet]({applet_url}).\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n- Content Type: application/json\n\nSee [the documentation]({docs_url}) on how to configure automations to handle incoming data.',
      "component.ifttt.config.step.user.description":
        "Are you sure you want to set up IFTTT?",
      "component.ifttt.config.step.user.title":
        "Set up the IFTTT Webhook Applet",
      "component.ifttt.config.title": "IFTTT",
      "component.twilio.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive Twilio messages.",
      "component.twilio.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.twilio.config.create_entry.default":
        "To send events to Home Assistant, you will need to setup [Webhooks with Twilio]({twilio_url}).\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n- Content Type: application/x-www-form-urlencoded\n\nSee [the documentation]({docs_url}) on how to configure automations to handle incoming data.",
      "component.twilio.config.step.user.description":
        "Are you sure you want to set up Twilio?",
      "component.twilio.config.step.user.title": "Set up the Twilio Webhook",
      "component.twilio.config.title": "Twilio",
      "component.zha.config.abort.single_instance_allowed":
        "Only a single configuration of ZHA is allowed.",
      "component.zha.config.error.cannot_connect":
        "Unable to connect to ZHA device.",
      "component.zha.config.step.user.data.radio_type": "Radio Type",
      "component.zha.config.step.user.data.usb_path": "USB Device Path",
      "component.zha.config.step.user.title": "ZHA",
      "component.zha.config.title": "ZHA",
      "component.gpslogger.config.title": "GPSLogger Webhook",
      "component.gpslogger.config.step.user.title":
        "Set up the GPSLogger Webhook",
      "component.gpslogger.config.step.user.description":
        "Are you sure you want to set up the GPSLogger Webhook?",
      "component.gpslogger.config.abort.one_instance_allowed":
        "Only a single instance is necessary.",
      "component.gpslogger.config.abort.not_internet_accessible":
        "Your Home Assistant instance needs to be accessible from the internet to receive messages from GPSLogger.",
      "component.gpslogger.config.create_entry.default":
        "To send events to Home Assistant, you will need to setup the webhook feature in GPSLogger.\n\nFill in the following info:\n\n- URL: `{webhook_url}`\n- Method: POST\n\nSee [the documentation]({docs_url}) for further details.",
      "component.zwave.config.abort.already_configured":
        "Z-Wave is already configured",
      "component.zwave.config.abort.one_instance_only":
        "Component only supports one Z-Wave instance",
      "component.zwave.config.error.option_error":
        "Z-Wave validation failed. Is the path to the USB stick correct?",
      "component.zwave.config.step.user.data.network_key":
        "Network Key (leave blank to auto-generate)",
      "component.zwave.config.step.user.data.usb_path": "USB Path",
      "component.zwave.config.step.user.description":
        "See https://www.home-assistant.io/docs/z-wave/installation/ for information on the configuration variables",
      "component.zwave.config.step.user.title": "Set up Z-Wave",
      "component.zwave.config.title": "Z-Wave",
      "component.cast.config.abort.no_devices_found":
        "No Google Cast devices found on the network.",
      "component.cast.config.abort.single_instance_allowed":
        "Only a single configuration of Google Cast is necessary.",
      "component.cast.config.step.confirm.description":
        "Do you want to set up Google Cast?",
      "component.cast.config.step.confirm.title": "Google Cast",
      "component.cast.config.title": "Google Cast",
    },
  }));
};
