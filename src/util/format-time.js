export default function formatTime(dateObj) {
  return window.moment(dateObj).format('LT');
}
