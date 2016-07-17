import config from './base-config';

export default Object.assign({}, config, {
  entry: 'src/entry-points/home-assistant-main.js',
  targets: [
    { dest: 'build-temp/ui.js', format: 'iife' },
  ],
});
