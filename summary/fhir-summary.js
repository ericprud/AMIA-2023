const Path = require('path');
const Fs = require('fs');
const { Command } = require('commander'); // include commander in git clone of commander repo
const { IndexCodes } = require('./lib/indexCodes');
const program = new Command();

// This is used as an example in the README for the Quick Start.

program
  .name('fhir-summary')
  .description('CLI to index FHIR resources')
  .version('0.0.1');

program.command('index')
  .description('Index a directory of FHIR Resources by code.')
  .argument('<dir>', 'directory of Resources')
  .option('--count', 'display the count of the codes')
  .option('--verbose', 'display progress on stderr')
  .option('-c, --code <pattern>', 'JS RegExp to match against codes', null)
  .action((dir, options) => {
    if (options.code)
      options.code = new RegExp(options.code);
    const files = Fs.readdirSync(dir).map(dirEnt => {
      const path = Path.join(dir, dirEnt);
      const stat = Fs.lstatSync(path);
      return {path, stat};
    }).filter(({path, stat}) => {
      return stat.isFile() && path.endsWith('.json');
    });
    const indexer = new IndexCodes(files, options);
    for (const dirEnt of files) {
      let curAct = null;
      try {
        curAct = `reading ${dirEnt.path}`;
        const text = Fs.readFileSync(dirEnt.path, 'utf-8');
        curAct = `parsing ${dirEnt.path}`;
        const json = JSON.parse(text);
        curAct = `handling ${dirEnt.path}`;
        const resourceType = expect(json, 'resourceType');
        if (resourceType === 'Bundle') {
          let idx = 0;
          for (const entry of json.entry) {
            const offset = idx++;
            const request = entry.request;
            indexer.accept(dirEnt.path, idx, entry.fullUrl, entry.resource);
          }
        } else {
          indexer.accept(dirEnt.path, -1, null, json);
        }
      } catch (e) {
        console.error(`failed ${curAct}: ${e.stack}`);
      }
    }
    write('{\n');
    const codes = Object.keys(indexer.codes);
    for (let i = 0; i < codes.length; ++i) {
      const key = codes[i];
      const foundIn = indexer.codes[key];
      const summary = options.count
            ? '' + foundIn.length
            : JSON.stringify(foundIn)
      write(`"${key}": ${summary}`)
      if (i < codes.length - 1)
        write(',')
      write('\n');
    }
    write('}\n');
  });

program.parse();

function write (str) {
  process.stdout.write(str);
}

function expect (obj, attr) {
  if (!attr in obj)
    throw Error(`expected ${attr} in ${JSON.stringify(obj, null, 2).substring(0, 80)}`);
  return obj[attr];
}
