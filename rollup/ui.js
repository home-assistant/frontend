import config from './base-config';

export default Object.assign({}, config, {
  entry: 'src/entry-points/home-assistant-main.js',
  targets: [
    { dest: 'build/_ui_compiled.js', format: 'iife' },
  ],
});
