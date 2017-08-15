export function onChangeEvent(prop, ev) {
  const data = { ...this.props[prop] };

  if (ev.target.value === data[ev.target.name]) {
    return;
  } else if (ev.target.value) {
    data[ev.target.name] = ev.target.value;
  } else {
    delete data[ev.target.name];
  }

  this.props.onChange(this.props.index, data);
}
