import moment from 'moment';

export default function formatDate(dateObj) {
  return moment(dateObj).format('ll');
};