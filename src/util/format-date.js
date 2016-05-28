export default function formatDate(dateObj) {
  return window.moment(dateObj).format('ll');
}
