import { fetchCounter, updateCounter, deleteCounter } from "./counter";
import {
  fetchInputBoolean,
  updateInputBoolean,
  deleteInputBoolean,
} from "./input_boolean";
import {
  fetchInputButton,
  updateInputButton,
  deleteInputButton,
} from "./input_button";
import {
  fetchInputDateTime,
  updateInputDateTime,
  deleteInputDateTime,
} from "./input_datetime";
import {
  fetchInputNumber,
  updateInputNumber,
  deleteInputNumber,
} from "./input_number";
import {
  fetchInputSelect,
  updateInputSelect,
  deleteInputSelect,
} from "./input_select";
import { fetchInputText, updateInputText, deleteInputText } from "./input_text";
import { fetchTimer, updateTimer, deleteTimer } from "./timer";

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
};
