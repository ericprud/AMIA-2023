#!/bin/env node

const Fs = require('fs');
const Path = require('path');
const N3 = require('n3');
const {FhirTurtleToJson} = require('../FhirTurtleToJson');

if (process.argv.length < 4) {
  let rel = Path.relative(process.cwd(), process.argv[1]);
  if (!rel.startsWith(Path.sep))
    rel = '.' + Path.sep + rel;
  console.error(`try something like:\n  ${rel} http://fhir.example/Patient ../manifests/Patient/smoker-1.ttl`);
  process.exit(1);
}

const baseIRI = process.argv[2];
const format = 'text/turtle';
const inPath = process.argv[3];
const text = Fs.readFileSync(inPath, 'utf-8');

const tz = new N3.Parser({baseIRI, format}).parse(text);
const {resource, ignored} = new FhirTurtleToJson().transpose(tz);
console.log(JSON.stringify(resource, null, 2));
