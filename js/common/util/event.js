export function onChangeEvent(prop, ev) {
  const origData = this.props[prop];

  if (ev.target.value === origData[ev.target.name]) {
    return;
  }

  const data = { ...origData };

  if (ev.target.value) {
    data[ev.target.name] = ev.target.value;
  } else {
    delete data[ev.target.name];
  }

  this.props.onChange(this.props.index, data);
}
