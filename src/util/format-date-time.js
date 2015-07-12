import moment from 'moment';

export default function formatDateTime(dateObj) {
  return moment(dateObj).format('lll');
};
