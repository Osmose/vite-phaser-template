import path from 'path';

import packageJson from './package.json';

export default {
  base: `/${packageJson.name}/`,
  resolve: {
    alias: {
      game: path.resolve(__dirname, 'src'),
    },
  },
};
