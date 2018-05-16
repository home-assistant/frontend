/** Return an icon representing a binary sensor state. */

export default function binarySensorIcon(state) {
  var activated = state.state && state.state === 'off';
  switch (state.attributes.device_class) {
    case 'battery':
      return activated ? 'mdi:battery' : 'mdi:battery-outline';
    case 'cold':
      return activated ? 'mdi:thermometer' : 'mdi:snowflake';
    case 'connectivity':
      return activated ? 'mdi:server-network-off' : 'mdi:server-network';
    case 'door':
      return activated ? 'mdi:door-closed' : 'mdi:door-open';
    case 'garage_door':
      return activated ? 'mdi:garage' : 'mdi:garage-open';
    case 'gas':
    case 'power':
    case 'problem':
    case 'safety':
    case 'smoke':
      return activated ? 'mdi:verified' : 'mdi:alert';
    case 'heat':
      return activated ? 'mdi:thermometer' : 'mdi:fire';
    case 'light':
      return activated ? 'mdi:brightness-5' : 'mdi:brightness-7';
    case 'lock':
      return activated ? 'mdi:lock' : 'mdi:lock-open';
    case 'moisture':
      return activated ? 'mdi:water-off' : 'mdi:water';
    case 'motion':
      return activated ? 'mdi:walk' : 'mdi:run';
    case 'occupancy':
      return activated ? 'mdi:home-outline' : 'mdi:home';
    case 'opening':
      return activated ? 'mdi:square' : 'mdi:square-outline';
    case 'plug':
      return activated ? 'mdi:power-plug-off' : 'mdi:power-plug';
    case 'presence':
      return activated ? 'mdi:home-outline' : 'mdi:home';
    case 'sound':
      return activated ? 'mdi:music-note-off' : 'mdi:music-note';
    case 'vibration':
      return activated ? 'mdi:crop-portrait' : 'mdi:vibrate';
    case 'window':
      return activated ? 'mdi:window-closed' : 'mdi:window-open';
    default:
      return activated ? 'mdi:radiobox-blank' : 'mdi:checkbox-marked-circle';
  }
}
