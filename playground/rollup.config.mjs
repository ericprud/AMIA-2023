import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

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
