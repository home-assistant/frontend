import timezones from "google-timezones-json";

export const createTimezoneListEl = () => {
  const list = document.createElement("datalist");
  list.id = "timezones";
  Object.keys(timezones).forEach((key) => {
    const option = document.createElement("option");
    option.value = key;
    option.innerText = timezones[key];
    list.appendChild(option);
  });
  return list;
};
