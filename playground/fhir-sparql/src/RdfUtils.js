import { Xsd } from './Namespaces.js';
import { s as sparql } from '../node_modules/sparqljs/sparql.js';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const SparqlParser = new sparql.Parser();
const SparqlGenerator = new sparql.Generator();
class RdfUtils {
  /** find triples matching (s, p, o)
   * could move to Bgp, but is always invokes on a List
   */
  static pmatch(l, r) {
    return RdfUtils.isPath(l) && RdfUtils.isPath(r) ? RdfUtils.pathEquals(l, r) : RdfUtils.isPath(l) || RdfUtils.isPath(r) ? false : l.equals(r);
  }
  static pathEquals(l, r) {
    return l.type === r.type && l.pathType === r.pathType && !l.items.find(
      (il, iNo) => !RdfUtils.pmatch(il, r.items[iNo])
    );
  }
  static isPath(t) {
    return t.type === "path";
  }
  static getMatching(triplePatterns, s, p, o) {
    return triplePatterns.filter(
      (tp) => (s === null || tp.subject.equals(s)) && (p === null || RdfUtils.pmatch(tp.predicate, p)) && (o === null || tp.object.equals(o))
    );
  }
  /** remove triples matching (s, p, o)
   */
  static stealMatching(triplePatterns, s, p, o) {
    const ret = [];
    for (let i = 0; i < triplePatterns.length; ++i) {
      const tp = triplePatterns[i];
      if ((s === null || tp.subject.equals(s)) && (p === null || RdfUtils.pmatch(tp.predicate, p)) && (o === null || tp.object.equals(o))) {
        ret.push(tp);
        triplePatterns.splice(i, 1);
        --i;
      }
    }
    return ret;
  }
  /** Stringize a predicate
   * Used to sort arcs queried from graphs.
   */
  static pStr(predicate) {
    return !RdfUtils.isPath(predicate) ? "<" + predicate.value + ">" : "(" + predicate.items.map((item) => RdfUtils.pStr(item) + (RdfUtils.isPath(item) ? item.pathType : "")).join("/") + ")";
  }
}
class Term {
  constructor(termType, value) {
    this.termType = termType;
    this.value = value;
  }
  equals(r) {
    return this.termType === r.termType && this.value === r.value;
  }
  static blessSparqlJs(sparqlJsTerm) {
    if (RdfUtils.isPath(sparqlJsTerm)) {
      return new Path(sparqlJsTerm.pathType, sparqlJsTerm.items.map((item) => Term.blessSparqlJs(item)));
    }
    switch (sparqlJsTerm.termType) {
      case "NamedNode":
        return new NamedNode(sparqlJsTerm.value);
      case "BlankNode":
        return new BlankNode(sparqlJsTerm.value);
      case "Literal":
        const datatype = sparqlJsTerm.datatype ? Term.blessSparqlJs(sparqlJsTerm.datatype) : new NamedNode(Xsd.string.value);
        return new Literal(sparqlJsTerm.value, sparqlJsTerm.language, datatype);
      case "Variable":
        return new Variable(sparqlJsTerm.value);
      default:
        throw Error(`unknown SparqlJs term type in ${JSON.stringify(sparqlJsTerm)}`);
    }
  }
}
class NamedNode extends Term {
  constructor(value) {
    super("NamedNode", value);
  }
  toString() {
    return "<" + this.value + ">";
  }
}
class BlankNode extends Term {
  constructor(value) {
    super("BlankNode", value);
  }
  toString() {
    return "_:" + this.value;
  }
}
class Variable extends Term {
  constructor(value) {
    super("Variable", value);
  }
  toString() {
    return "?" + this.value;
  }
}
class Literal extends Term {
  constructor(value, language, datatype) {
    super("Literal", value);
    __publicField(this, "language");
    __publicField(this, "datatype");
    this.language = language;
    this.datatype = datatype;
  }
  toString() {
    return '"' + this.value + '"' + (this.language ? "@" + this.language : this.datatype && this.datatype.value !== Xsd.string.value ? "^^" + this.datatype.toString() : "");
  }
  equals(r) {
    return super.equals(r) && this.language === r.language && this.datatype === r.datatype;
  }
}
class Path {
  constructor(pathType, items) {
    this.pathType = pathType;
    this.items = items;
    __publicField(this, "type", "path");
  }
  equals(r) {
    if (this.type !== r.type)
      return false;
    if (this.pathType !== r.pathType)
      return false;
    if (this.items.length !== r.items.length)
      return false;
    for (let i = 0; i < this.items.length; ++i) {
      if (!this.items[i].equals(r.items[i]))
        return false;
    }
    return true;
  }
}
class Triple {
  constructor(subject, predicate, object) {
    this.subject = subject;
    this.predicate = predicate;
    this.object = object;
  }
  toString() {
    return `${this.subject} ${this.predicate} ${this.object} .`;
  }
  equals(r) {
    return this.subject.equals(r.subject) && RdfUtils.pmatch(this.predicate, r.predicate) && this.object.equals(r.object);
  }
  static blessSparqlJs(triple) {
    return new Triple(
      Term.blessSparqlJs(triple.subject),
      Term.blessSparqlJs(triple.predicate),
      Term.blessSparqlJs(triple.object)
    );
  }
}
class Bgp {
  constructor(triples) {
    this.triples = triples;
    __publicField(this, "type", "bgp");
  }
  toString(indent = "") {
    return indent + "{\n" + this.triples.map((t) => indent + "  " + t.toString() + "\n").join("") + "}";
  }
  static blessSparqlJs(sparqlJsBgp) {
    if (sparqlJsBgp.type !== "bgp")
      throw Error(`expected to bless something with .type=bgp in ${JSON.stringify(sparqlJsBgp)}`);
    return new Bgp(sparqlJsBgp.triples.map((t) => Triple.blessSparqlJs(t)));
  }
}
class SparqlQuery {
  constructor(query) {
    __publicField(this, "type", "query");
    // base: string | undefined;
    __publicField(this, "prefixes", {});
    __publicField(this, "queryType", "SELECT");
    __publicField(this, "variables", [new sparql.Wildcard()]);
    __publicField(this, "where");
    this.prefixes = query.prefixes;
    this.variables = query.variables;
    this.where = this.findBgps(query).map((bgp) => Bgp.blessSparqlJs(bgp));
  }
  findBgps(q) {
    if (q.type !== "query")
      throw Error(`Expected type: "query"; got ${JSON.stringify(q)}`);
    return q.where.reduce((acc, elt) => {
      if (elt.type === "group")
        return acc.concat(this.findBgps(elt.patterns[0]));
      if (elt.type === "bgp")
        return acc.concat([elt]);
      console.log(`skipping ${elt.type}`);
      return acc;
    }, []);
  }
  getQuery() {
    return this;
  }
  getWhere() {
    return this.where;
  }
  static parse(text) {
    return new SparqlQuery(SparqlParser.parse(text));
  }
  static selectStar(bgp) {
    return SparqlGenerator.stringify({
      "type": "query",
      "prefixes": {},
      "queryType": "SELECT",
      "variables": [{ termType: "Wildcard" }],
      "where": bgp
    });
  }
}

export { Bgp, Path, RdfUtils, SparqlQuery, Term, Triple };
//# sourceMappingURL=RdfUtils.js.map
