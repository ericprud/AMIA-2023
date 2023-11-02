#!/bin/env node

const Fs = require('fs');
const Path = require('path');
const {FhirJsonToTurtle} = require('../FhirJsonToTurtle');

if (process.argv.length < 3) {
  let rel = Path.relative(process.cwd(), process.argv[1]);
  if (!rel.startsWith(Path.sep))
    rel = '.' + Path.sep + rel;
  console.error(`try something like:\n  ${rel} ../manifests/Patient/smoker-1.json`);
  process.exit(1);
}
const inPath = process.argv[2];
const resource = JSON.parse(Fs.readFileSync(inPath, 'utf-8'));
const ttl = `# from ${inPath}
# ${new Date()}

` + new FhirJsonToTurtle().prettyPrint(resource);
console.log(ttl);
