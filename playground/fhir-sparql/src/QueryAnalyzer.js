import { ShExVisitor } from './ShExVisitor.js';
import { Ns } from './Namespaces.js';
import { RdfUtils } from './RdfUtils.js';
import { ArcTree } from './ArcTree.js';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class PredicateToShapeDecls extends ShExVisitor {
  constructor(...ctor_args) {
    super(...ctor_args);
    __publicField(this, "predicateToShapeDecls");
    __publicField(this, "resourceTypeToShapeDeclIds");
    __publicField(this, "curDecl");
    this.predicateToShapeDecls = /* @__PURE__ */ new Map();
    this.resourceTypeToShapeDeclIds = /* @__PURE__ */ new Map();
    this.curDecl = null;
  }
  visitSchema(schema, ...args) {
    if (!schema || !(typeof schema === "object") || schema.type !== "Schema")
      throw Error(`visitSchema argument must be a schema, got ${JSON.stringify(schema)}`);
    return super.visitSchema(schema, ...args);
  }
  visitShapeDecl(decl, ...args) {
    let resourceType = decl.id.split(/\./)[0];
    let ids = this.resourceTypeToShapeDeclIds.get(resourceType);
    if (!ids) {
      ids = [];
      this.resourceTypeToShapeDeclIds.set(resourceType, ids);
    }
    ids.push(decl.id);
    this.curDecl = decl;
    const ret = super.visitShapeDecl(decl, ...args);
    this.curDecl = null;
    return ret;
  }
  visitTripleConstraint(expr, ...args) {
    if (this.curDecl === null)
      throw new Error(`visiting ${JSON.stringify(expr)} while not in a ShapeDecl`);
    if (!expr.predicate.startsWith(Ns.rdf) && [Ns.fhir + "v", Ns.fhir + "nodeRole"].indexOf(expr.predicate) === -1) {
      if (!this.predicateToShapeDecls.has(expr.predicate))
        this.predicateToShapeDecls.set(expr.predicate, []);
      this.predicateToShapeDecls.get(expr.predicate).push(this.curDecl);
    }
    return null;
  }
  visitNodeConstraint(nc, ...args) {
    return null;
  }
}
class QueryAnalyzer {
  constructor(shex) {
    this.shex = shex;
    __publicField(this, "predicateToShapeDecls");
    __publicField(this, "resourceTypeToShapeDeclIds");
    if (shex) {
      const visitor = new PredicateToShapeDecls();
      visitor.visitSchema(shex);
      this.predicateToShapeDecls = visitor.predicateToShapeDecls;
      this.resourceTypeToShapeDeclIds = visitor.resourceTypeToShapeDeclIds;
    } else {
      this.predicateToShapeDecls = /* @__PURE__ */ new Map();
      this.resourceTypeToShapeDeclIds = /* @__PURE__ */ new Map();
    }
  }
  getArcTrees(query) {
    const triples = query.getWhere()[0].triples;
    const todo = triples.slice().sort((l, r) => RdfUtils.pStr(l.predicate).localeCompare(RdfUtils.pStr(r.predicate)));
    const arcTrees = [];
    const connectingVariables = /* @__PURE__ */ new Map();
    const usedVars = /* @__PURE__ */ new Map();
    const referents = /* @__PURE__ */ new Set();
    while (todo.length > 0) {
      const start = todo[0];
      const treeVars = /* @__PURE__ */ new Map();
      const roots = [];
      let tz = [start];
      do {
        const newTz = [];
        tz.forEach((t) => {
          const arcsIn = RdfUtils.getMatching(todo, null, null, t.subject);
          if (arcsIn.length === 0) {
            roots.push(t.subject);
          } else {
            arcsIn.forEach((p) => {
              if (p.subject.equals(start.subject))
                throw Error(`can't handle cycle involving ${p}`);
            });
            Array.prototype.push.apply(newTz, arcsIn);
          }
        });
        tz = newTz;
      } while (tz.length > 0);
      console.assert(roots.length > 0, "should have a root (if there were any triples at all)");
      Array.prototype.push.apply(arcTrees, roots.map(
        (root) => ArcTree.constructArcTree(todo, null, root, treeVars, referents)
      ));
      for (const [k, treeNodes] of treeVars) {
        if (connectingVariables.has(k)) {
          Array.prototype.push.apply(treeNodes);
        } else if (usedVars.has(k)) {
          connectingVariables.set(k, usedVars.get(k).concat(treeNodes));
          usedVars.delete(k);
        } else {
          usedVars.set(k, treeNodes);
        }
      }
    }
    return { arcTrees, connectingVariables, referents };
  }
}

export { PredicateToShapeDecls, QueryAnalyzer };
//# sourceMappingURL=QueryAnalyzer.js.map
