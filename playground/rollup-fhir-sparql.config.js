const commonjs = require('@rollup/plugin-commonjs').default;
const nodeResolve = require('@rollup/plugin-node-resolve').default;

const dts = require('rollup-plugin-dts').default
const esbuild = require('rollup-plugin-esbuild').default

/**
 * @param {import('rollup').RollupOptions} config
 * @returns {import('rollup').RollupOptions}
 */
const bundle = (config) => ({
  ...config,
  input: './node_modules/fhir-sparql/src/FhirSparql.ts',
//  external: (id) => !/^[./]/.test(id),
})

module.exports = [
  bundle({
    plugins: [
      esbuild(),
      commonjs(),
      nodeResolve({ browser: true}),
    ],
    output: [
      {
        dir: 'fhir-sparql',
        format: 'es',
        exports: 'named',
        preserveModules: true,
        sourcemap: true,
      },
    ],
  }),
  bundle({
    plugins: [
      dts(),
    ],
    output: {
      dir: 'fhir-sparql',
      format: 'es',
      exports: 'named',
      preserveModules: true,
      sourcemap: true,
    },
  }),
]
