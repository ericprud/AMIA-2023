/** Map FHIR Turtle to FHIR JSON.
 * This counts on the order of triples parsed by n3@1.17.1 (2023-11-03).
 */

class FhirTurtleToJson {
  static Ns = {
    fhir: 'http://hl7.org/fhir/',
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
  };

  static ROOT = '<root>';

  /** Map the ordered triples in `graph` to a FHIR JSON Resource object.
   * graph: specifically-ordered triples parsed by n3@1.17.1
   * @returns: js structure equivalent to the FHIR JSON for that Resource.
   */
  transpose (graph) {
    const ret = {};
    const ignored = [];
    const lists = {};
    const literals = {};
    let rootTerm = null;
    let rootType = null;
    for (let target of graph) {
      const {subject: s, predicate: p, object: o} = target;

       // key in ret and lists objects; will be ROOT for NamedNodes.
      const sKey = this.keyFor(s);
      if (sKey === FhirTurtleToJson.ROOT && rootTerm && !rootTerm.equals(s)) {
        ignored.push(target); // duplicate info like e.g. <../Patient/smoker-1> a fhir:Patient
      } else {
        if (sKey === FhirTurtleToJson.ROOT && !rootTerm)
          rootTerm = s;

        // Treatment for lists and types
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
          // Treatment for fhir predicates.
          const property = p.value.substring(FhirTurtleToJson.Ns.fhir.length);
          switch (property) {
          case 'v':
            // The nested object S fhir:foo [fhir:v X] gets simplified to S = {foo: X} in JSON
            if (sKey in ret) {
              const lookFor = ret[sKey];
              // See if a preceding lists eleemnts references s.
              const referringList = Object.values(ret).find(x => Array.isArray(x) && x.indexOf(lookFor) !== -1);
              if (referringList) {
                // Special handling if there's a previous reference.
                const idx = referringList.indexOf(lookFor);
                referringList.splice(idx, 1, this.jsonize(o));
                delete ret[sKey];
              } else {
                // o is a new object which will be referred to in a triple whose object is the current subject.
                ret[sKey] = this.jsonize(o);
              }
            } else {
              // Store in literals, which is referenced by following triple.
              literals[sKey] = o;
            }
            break;
          case 'link':
          case 'nodeRole':
            // Ignore links and nodeRoles
            break;
          default:
            let o2 = o;
            // o2 may be a previously-stored literal
            if (o.termType === 'BlankNode' && this.keyFor(o) in literals) {
              o2 = literals[this.keyFor(o)];
              delete literals[this.keyFor(o)];
            }

            // Ensure theres an object for attr/values
            if (!ret[sKey]) {
              ret[sKey] = {}
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

    // Ignore any lingering ret elements which are a byproduct of lists.
    return {resource: Object.assign({resourceType: rootType}, ret[FhirTurtleToJson.ROOT]), ignored};
  }

  /** How an RDF term appears in the ret and lists objects.
   */
  keyFor (term) {
    // term.value is good enough 'cause they're all BNodes
    return term.termType === 'NamedNode' ? FhirTurtleToJson.ROOT : term.value;
  }

  /** Map values in the RDF graph to their JSON counterpart.
   */
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
