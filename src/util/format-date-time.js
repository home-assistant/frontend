export default function formatDateTime(dateObj) {
  return window.moment(dateObj).format('lll');
}
