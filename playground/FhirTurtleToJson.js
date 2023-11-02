class FhirTurtleToJson {
  static Ns = {
    fhir: 'http://hl7.org/fhir/',
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
  };

  static ROOT = '<root>';

  transpose (graph) {
    const ret = {};
    const ignored = [];
    const lists = {};
    const literals = {};
    let rootTerm = null;
    let rootType = null;
    for (let target of graph) {
      const {subject: s, predicate: p, object: o} = target;
      const sKey = this.keyFor(s);
      if (sKey === FhirTurtleToJson.ROOT && rootTerm && !rootTerm.equals(s)) {
        ignored.push(target);
      } else {
        if (sKey === FhirTurtleToJson.ROOT && !rootTerm)
          rootTerm = s;

        switch (p.value) {
        case FhirTurtleToJson.Ns.rdf + 'first':
          {
            const appending = Object.keys(lists).find(key => lists[key].tail === sKey);
            if (!ret[this.keyFor(o)])
              ret[this.keyFor(o)] = o.termType === 'BlankNode' ? {} : this.jsonize(o)
            if (appending) {
              ret[appending].push(ret[this.keyFor(o)]);
            } else {
              lists[sKey] = {
                // tail: undefined,
              }
              ret[sKey] = [ret[this.keyFor(o)]];
            }
          }
          break;
        case FhirTurtleToJson.Ns.rdf + 'rest':
          {
            const appending = Object.values(lists).find(elt => elt.tail === sKey) || lists[sKey];
            if (o.termType === 'NamedNode' && o.value === FhirTurtleToJson.Ns.rdf + 'nil') {
              appending.closed = true;
              delete appending.tail;
            } else {
              appending.tail = this.keyFor(o);
            }
          }
          break;
        case FhirTurtleToJson.Ns.rdf + 'type':
          rootType = o.value.substring(FhirTurtleToJson.Ns.fhir.length);
          break
        default:
          const property = p.value.substring(FhirTurtleToJson.Ns.fhir.length);
          switch (property) {
          case 'v':
            literals[sKey] = o;
            break;
          case 'link':
          case 'nodeRole':
            break;
          default:
            let o2 = o;
            if (o.termType === 'BlankNode' && this.keyFor(o) in literals) {
              o2 = literals[this.keyFor(o)];
              delete literals[this.keyFor(o)];
            }
            if (!ret[sKey]) {
              ret[sKey] = {}
              // if (s.termType === 'NamedNode') {
              //   ret[sKey].id = s.value;
              // }
            }
            switch (o2.termType) {
            case 'BlankNode':
              const oKey = this.keyFor(o2);
              ret[sKey][property] = ret[oKey];
              delete ret[oKey];
              break;
            case 'NamedNode':
              ret[sKey][property] = o2.value;
              break;
            case 'Literal':
              ret[sKey][property] = this.jsonize(o2);
              break;
            default:
              throw Error(`expected RdfJs triple or quad; got ${JSON.stringify(target)}`);
            }
          }
        }
      }
    }
    return {resource: Object.assign({resourceType: rootType}, ret[FhirTurtleToJson.ROOT]), ignored};
  }

  keyFor (term) {
    return term.termType === 'NamedNode' ? FhirTurtleToJson.ROOT : term.value;
  }

  jsonize (term) {
    if (!term.datatype.value.startsWith(FhirTurtleToJson.Ns.xsd))
      throw Error(`no support for non-XSD datatype ${term.datatype.value}`);
    switch (term.datatype.value.substring(FhirTurtleToJson.Ns.xsd.length)) {
    case 'integer': return parseInt(term.value);
    case 'decimal': return parseFloat(term.value);
    case 'boolean': return term.value === 'true';
    default: return term.value;
    }
  }
}

if (typeof module !== 'undefined')
  module.exports = {FhirTurtleToJson};
