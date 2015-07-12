import moment from 'moment';

export default function formatTime(dateObj) {
  return moment(dateObj).format('LT');
};
