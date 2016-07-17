import config from './base-config';

export default Object.assign({}, config, {
  entry: 'src/entry-points/app-core.js',
  targets: [
    { dest: 'build/core.js', format: 'iife' },
  ],
});
