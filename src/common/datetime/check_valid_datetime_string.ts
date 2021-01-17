export default function checkValidDatetimeString(datetime: string): boolean {
  const date = new Date(datetime);
  return date instanceof Date && !isNaN(date.valueOf());
}
