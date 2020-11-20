import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'

const production = !process.env.ROLLUP_WATCH

function serve() {
  let server

  function toExit() {
    if (server) server.kill(0)
  }

  return {
    writeBundle() {
      if (server) return
      server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
        stdio: ['ignore', 'inherit', 'inherit'],
        shell: true,
      })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    },
  }
}

export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/viewer/build/bundle.js',
  },
  plugins: [
    svelte({
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css: (css) => {
        css.write('bundle.css')
      },
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte'],
    }),
    commonjs(),

    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),

    copy({
      targets: [
        { src: 'src/viewer.html', dest: 'public/viewer' },
        { src: 'src/host/embed.html', dest: 'public' },
        { src: 'src/host/ChannelMessenger.js', dest: 'public' },
        { src: 'src/global.css', dest: 'public/viewer' },
        // { src: ['assets/fonts/arial.woff', 'assets/fonts/arial.woff2'], dest: 'public/viewer/fonts' },
        { src: 'src/images/**/*', dest: 'public/viewer/images' },
        { src: 'src/assets/**/*', dest: 'public/viewer/assets' },
        // { src: 'node_modules/@zeainc/zea-engine/dist/*', dest: 'public/viewer/libs/zea-engine/dist' },
        // { src: 'node_modules/@zeainc/zea-engine/public-resources/*', dest: 'public/viewer/libs/zea-engine/public-resources' },
        // { src: 'node_modules/@zeainc/zea-ux/dist/*', dest: 'public/viewer/libs/zea-ux/dist' },
        // { src: 'node_modules/@zeainc/zea-cad/dist/*', dest: 'public/viewer/libs/zea-cad/dist' },
        { src: 'node_modules/@zeainc/zea-collab/dist/*', dest: 'public/viewer/libs/zea-collab/dist' },
      ],
    }),
  ],
  watch: {
    clearScreen: false,
  },
}
