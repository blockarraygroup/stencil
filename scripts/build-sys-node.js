const fs = require('fs-extra');
const path = require('path');
const webpack = require('webpack');
const rollup = require('rollup');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonjs = require('rollup-plugin-commonjs');
const rollupJson = require('rollup-plugin-json');
const glob = require('glob');
const run = require('./run');
const transpile = require('./transpile');

const ROOT_DIR = path.join(__dirname, '..');
const TRANSPILED_DIR = path.join(ROOT_DIR, 'dist', 'transpiled-sys-node');


function bundleExternal(entryFileName) {
  return new Promise(resolve => {

    const whitelist = [
      'child_process',
      'os',
      'typescript'
    ];

    webpack({
      entry: path.join(__dirname, '..', 'src', 'sys', 'node', 'bundles', entryFileName),
      output: {
        path: path.join(__dirname, '..', 'dist', 'sys', 'node'),
        filename: entryFileName,
        libraryTarget: 'commonjs'
      },
      target: 'node',
      node: {
        __dirname: false,
        __filename: false,
        process: false,
        Buffer: false
      },
      externals: function(context, request, callback) {
        if (request.match(/^(\.{0,2})\//)) {
          // absolute and relative paths are not externals
          return callback();
        }

        if (request === '@sys') {
          return callback(null, '../../sys/node');
        }

        if (request === '@utils') {
          return callback(null, '../../utils');
        }

        if (whitelist.indexOf(request) > -1) {
          // we specifically do not want to bundle these imports
          require.resolve(request);
          return callback(null, request);
        }

        // bundle this import
        callback();
      },
      resolve: {
        alias: {
          'postcss': path.resolve(__dirname, '..', 'node_modules', 'postcss'),
          'source-map': path.resolve(__dirname, '..', 'node_modules', 'source-map'),
          'chalk': path.resolve(__dirname, 'helpers', 'empty.js'),
          'cssnano-preset-default': path.resolve(__dirname, 'helpers', 'cssnano-preset-default'),
        }
      },
      optimization: {
        minimize: false
      },
      mode: 'production'

    }, (err, stats) => {
      if (err) {
        if (err.details) {
          throw err.details;
        }
      }

      const info = stats.toJson({ errors: true });
      if (stats.hasErrors()) {
        const webpackError = info.errors.join('\n');
        throw webpackError

      } else {
        resolve();
      }
    });
  });
}


async function bundleNodeSysMain() {
  const fileName = 'index.js';
  const inputPath = path.join(TRANSPILED_DIR, 'sys', 'node', fileName);
  const outputPath = path.join(ROOT_DIR, 'dist', 'sys', 'node', fileName);

  const rollupBuild = await rollup.rollup({
    input: inputPath,
    external: [
      'assert',
      'child_process',
      'crypto',
      'events',
      'fs',
      'https',
      'module',
      'path',
      'os',
      'typescript',
      'url',
      'util',
      './graceful-fs.js',
      '../../utils',
      '../../sys/node'
    ],
    plugins: [
      (() => {
        return {
          resolveId(importee) {
            if (importee === 'resolve') {
              return path.join(__dirname, 'helpers', 'resolve.js');
            }
            if (importee === 'graceful-fs') {
              return './graceful-fs.js';
            }
            if (importee === '@sys/node') {
              return '../../sys/node';
            }
            if (importee === '@utils') {
              return '../../utils';
            }
          }
        }
      })(),
      rollupResolve({
        preferBuiltins: true,
      }),
      rollupCommonjs(),
      rollupJson()
    ],
    onwarn: (message) => {
      if (message.code === 'CIRCULAR_DEPENDENCY') return;
      console.error(message);
    }
  });

  const { output } = await rollupBuild.generate({
    format: 'cjs',
    file: outputPath
  });

  let outputText = output[0].code;

  const buildId = (process.argv.find(a => a.startsWith('--build-id=')) || '').replace('--build-id=', '');
  outputText = outputText.replace(/__BUILDID__/g, buildId);

  await fs.ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, outputText);
}


async function copyXdgOpen() {
  // copy opn's xdg-open file
  const xdgOpenSrcPath = glob.sync('xdg-open', {
    cwd: path.join(__dirname, '..', 'node_modules', 'opn'),
    absolute: true
  });
  if (xdgOpenSrcPath.length !== 1) {
    throw new Error(`build-sys-node cannot find xdg-open`);
  }
  const xdgOpenDestPath = path.join(__dirname, '..', 'dist', 'sys', 'node', 'xdg-open');
  await fs.copy(xdgOpenSrcPath[0], xdgOpenDestPath);
}


async function copyOpenInEditor() {
  // open-in-editor's visualstudio.vbs file
  const visualstudioVbsSrc = path.join(__dirname, '..', 'node_modules', 'open-in-editor', 'lib', 'editors', 'visualstudio.vbs');
  const visualstudioVbsDesc = path.join(__dirname, '..', 'dist', 'sys', 'node', 'visualstudio.vbs');
  await fs.copy(visualstudioVbsSrc, visualstudioVbsDesc);
}


run(async () => {
  transpile(path.join('..', 'src', 'sys', 'node', 'tsconfig.json'));

  await Promise.all([
    bundleExternal('graceful-fs.js'),
    bundleExternal('node-fetch.js'),
    bundleExternal('open-in-editor.js'),
    bundleExternal('sys-worker.js'),
    bundleExternal('websocket.js'),
    bundleNodeSysMain(),
    copyXdgOpen(),
    copyOpenInEditor()
  ]);

  await fs.remove(TRANSPILED_DIR);
});
