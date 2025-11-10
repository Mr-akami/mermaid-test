import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  server: {
    port: 50004
  },
  resolve: {
    alias: {
      'diagram-js': path.resolve(__dirname, '../../node_modules/.pnpm/diagram-js@15.4.0/node_modules/diagram-js'),
      'tiny-svg': path.resolve(__dirname, '../../node_modules/.pnpm/tiny-svg@4.1.3/node_modules/tiny-svg'),
      'min-dash': path.resolve(__dirname, '../../node_modules/.pnpm/min-dash@4.2.3/node_modules/min-dash'),
      'diagram-js-direct-editing': path.resolve(__dirname, '../../node_modules/.pnpm/diagram-js-direct-editing@3.2.0_diagram-js@15.4.0/node_modules/diagram-js-direct-editing')
    }
  },
  optimizeDeps: {
    include: ['diagram-js', 'tiny-svg', 'min-dash', 'diagram-js-direct-editing']
  }
})
