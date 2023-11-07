import { RdfUtils, Bgp, Term } from './RdfUtils.js';
import { Rdf } from './Namespaces.js';

class PosArcTree {
  constructor(pos, arcTree) {
    this.pos = pos;
    this.arcTree = arcTree;
  }
}
class ArcTree {
  constructor(tp, out) {
    this.tp = tp;
    this.out = out;
    if (!out)
      throw Error(`${this.tp} has no out rule array`);
  }
  /** Construct an ArcTree for an arc and all arcs it reaches
   * Index variables in the same pass for efficiency.
   */
  static constructArcTree(triplePatterns, forArc, node, treeVars, referents) {
    if (forArc && forArc.predicate.value === "http://hl7.org/fhir/reference") {
      const object = forArc.object;
      if (object.termType === "Variable" && !referents.has(object.value))
        referents.add(object.value);
      return new ArcTree(forArc, []);
    }
    const arcsOut = ArcTree.sortArcs(RdfUtils.stealMatching(triplePatterns, node, null, null));
    const out = arcsOut.map((triplePattern) => {
      const arcTree = ArcTree.constructArcTree(triplePatterns, triplePattern, triplePattern.object, treeVars, referents);
      ["subject", "object"].forEach((pos) => {
        const v = triplePattern[pos];
        if (v.termType === "Variable") {
          if (!treeVars.has(v.value)) {
            treeVars.set(v.value, []);
          }
          treeVars.get(v.value).push(new PosArcTree(pos, arcTree));
        }
      });
      return arcTree;
    });
    return new ArcTree(forArc, out);
  }
  getBgp() {
    const ret = [];
    if (this.tp !== null)
      ret.push(this.tp);
    this.out.forEach(
      (tree) => Array.prototype.push.apply(ret, tree.getBgp().triples)
    );
    return new Bgp(ret);
  }
  // not used
  toSparqlTriplePatterns() {
    return (this.tp ? [this.tp] : []).concat(this.out.flatMap((child) => child.toSparqlTriplePatterns()));
  }
  toString(indent = "") {
    const tpStr = this.tp === null ? "<root>" : this.tp.toString();
    return this.out.length === 0 ? indent + tpStr : indent + tpStr + " [\n" + this.out.map((out) => out.toString(indent + "  ")).join("\n") + "\n" + indent + "]";
  }
  /** sort a list of triple (patterns), AKA arcs
   * Bubble rdf:type to the top
   * Sort remaining by predicate name.
   *   Since all have same subject and there are no repeated properties in
   *   FHIR/RDF, we can assume that that localeCompare will never return 0
   */
  static sortArcs(triplePatterns) {
    const ret = [];
    Array.prototype.push.apply(ret, RdfUtils.stealMatching(triplePatterns, null, Term.blessSparqlJs(Rdf.type), null));
    Array.prototype.push.apply(ret, triplePatterns.sort(
      (l, r) => RdfUtils.pStr(l.predicate).localeCompare(RdfUtils.pStr(r.predicate))
    ));
    return ret;
  }
}

export { ArcTree, PosArcTree };
//# sourceMappingURL=ArcTree.js.map
