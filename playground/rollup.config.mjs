import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

/**
 * @param {import('rollup').RollupOptions} config
 * @returns {import('rollup').RollupOptions}
 */
const bundle = (config) => ({
  ...config,
  input: './ts-stuff.ts',
//  external: (id) => !/^[./]/.test(id),
})

export default [
  {
    input: './stuff.js',
    output: { file: 'build/stuff-bundle.js', format: 'umd', name: 'Stuff' },
    plugins: [
      commonjs(),
      nodeResolve({ browser: true}),
    ]
  }
];
