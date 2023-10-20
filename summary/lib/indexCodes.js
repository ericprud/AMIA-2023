class IndexCodes {
  constructor (dirEnts, options) {
    this.options = options;
    this.codes = {};
  }

  accept (path, idx, fullUrl, resource) {
    const docLocator = { path };
    const codeCount = this._index(idx !== -1 ? ['entry', `[${idx}]`, '.resource'] : [], resource, docLocator);
    if (this.options.verbose)
      process.stderr.write(`${path}, ${idx}, ${fullUrl}, ${codeCount}\n`);
  }

  _index (jsonPath, thing, docLocator) {
    if (typeof thing !== 'object')
      return 0; // nothing to do with scalars

    if (Array.isArray(thing)) {
      let ret = 0;
      for (const i in thing) {
        ret += this._index(jsonPath.concat(`[${i}]`), thing[i], docLocator);
      }
      return ret;
    } else {
      let ret = 0;
      for (const key in thing) {
        if (key.endsWith('oding')) {
          if (Array.isArray(thing[key])) {
            for (const i in thing[key]) {
              ret += this._add(jsonPath.concat(`[${i}]`), thing[key][i], docLocator)
            }
          } else {
            ret += this._add(jsonPath, thing[key], docLocator)
          }
        } else {
          ret += this._index(jsonPath.concat(`.${key}`), thing[key], docLocator);
        }
      }
      return ret;
    }
  }

  _add (jsonPath, thing, docLocator) {
    const {system, code} = thing;
    if (this.options.code && !this.options.code.test(code))
      return 0;

    const codeKey = `${system} | ${code}`;
    if (codeKey.match(/undefined/)) throw Error(`didn't find system/code in ${JSON.stringify(thing)}`);
    if (!(codeKey in this.codes)) {
      this.codes[codeKey] = [];
    }
    // let [values, nestedPath] = [thing, jsonPath];
    this.codes[codeKey].push(Object.assign({}, docLocator, {jsonPath}));
    return 1;
  }
}

module.exports = {IndexCodes};
