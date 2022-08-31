import { deleteCounter, fetchCounter, updateCounter } from "./counter";
import {
  deleteInputBoolean,
  fetchInputBoolean,
  updateInputBoolean,
} from "./input_boolean";
import {
  deleteInputButton,
  fetchInputButton,
  updateInputButton,
} from "./input_button";
import {
  deleteInputDateTime,
  fetchInputDateTime,
  updateInputDateTime,
} from "./input_datetime";
import {
  deleteInputNumber,
  fetchInputNumber,
  updateInputNumber,
} from "./input_number";
import {
  deleteInputSelect,
  fetchInputSelect,
  updateInputSelect,
} from "./input_select";
import { deleteInputText, fetchInputText, updateInputText } from "./input_text";
import { deleteSchedule, fetchSchedule, updateSchedule } from "./schedule";
import { deleteTimer, fetchTimer, updateTimer } from "./timer";

export const HELPERS_CRUD = {
  input_boolean: {
    fetch: fetchInputBoolean,
    update: updateInputBoolean,
    delete: deleteInputBoolean,
  },
  input_button: {
    fetch: fetchInputButton,
    update: updateInputButton,
    delete: deleteInputButton,
  },
  input_text: {
    fetch: fetchInputText,
    update: updateInputText,
    delete: deleteInputText,
  },
  input_number: {
    fetch: fetchInputNumber,
    update: updateInputNumber,
    delete: deleteInputNumber,
  },
  input_datetime: {
    fetch: fetchInputDateTime,
    update: updateInputDateTime,
    delete: deleteInputDateTime,
  },
  input_select: {
    fetch: fetchInputSelect,
    update: updateInputSelect,
    delete: deleteInputSelect,
  },
  counter: {
    fetch: fetchCounter,
    update: updateCounter,
    delete: deleteCounter,
  },
  timer: {
    fetch: fetchTimer,
    update: updateTimer,
    delete: deleteTimer,
  },
  schedule: {
    fetch: fetchSchedule,
    update: updateSchedule,
    delete: deleteSchedule,
  },
};
