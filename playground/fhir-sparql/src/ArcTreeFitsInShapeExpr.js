import { ShExVisitor } from './ShExVisitor.js';
import { Term } from './RdfUtils.js';
import { ArcTree } from './ArcTree.js';
import '../node_modules/@shexjs/validator/lib/shex-validator.js';
import { __exports as shexValidator } from '../_virtual/shex-validator.js';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
const NoMatch = Term.blessSparqlJs({ termType: "NamedNode", value: "should://never/match" });
class ArcTreeFitsInShapeExpr extends ShExVisitor {
  constructor(shex, ...ctor_args) {
    if (!shex.shapes)
      throw Error("construct ArcTreeFitsInShapeExpr with a ShEx schema with shapes");
    super(...ctor_args);
    __publicField(this, "shex");
    __publicField(this, "tested");
    this.shex = shex;
    this.tested = /* @__PURE__ */ new Map();
  }
  visitShapeDecl(decl, arcTree, ...args) {
    let testedShapeExprs = this.tested.get(arcTree);
    if (!testedShapeExprs) {
      testedShapeExprs = /* @__PURE__ */ new Map();
      this.tested.set(arcTree, testedShapeExprs);
    }
    let shapeExprResults = testedShapeExprs.get(decl);
    if (!shapeExprResults) {
      shapeExprResults = this.visitShapeExpr(decl.shapeExpr, arcTree, ...args);
      testedShapeExprs.set(decl, shapeExprResults);
    }
    return shapeExprResults;
  }
  visitShapeRef(reference, arcTree, ...args) {
    const shapeDecl = this.shex.shapes.find((decl) => decl.id === reference);
    if (!shapeDecl)
      throw Error(`Shape ${reference} not found in ${this.shex.shapes.map((decl) => decl.id).join(", ")}`);
    return this.visitShapeDecl(shapeDecl, arcTree, ...args);
  }
  visitShapeAnd(expr, arcTree, ...args) {
    return !!expr.shapeExprs.find((nested) => this.visitShapeExpr(nested, arcTree, ...args));
  }
  visitShapeOr(expr, arcTree, ...args) {
    return !!expr.shapeExprs.find((nested) => this.visitShapeExpr(nested, arcTree, ...args));
  }
  visitShapeNot(expr, arcTree, ...args) {
    return this.visitShapeExpr(expr.shapeExpr, arcTree, ...args);
  }
  visitShape(shape, arcTree, ...args) {
    if (shape.extends) {
      for (const ext of shape.extends)
        if (this.visitShapeExpr(ext, arcTree, ...args))
          return true;
    }
    return shape.expression ? this.visitTripleExpr(shape.expression, arcTree, shape.closed, ...args) : true;
  }
  visitNodeConstraint(nc, arcTree, closed, ...args) {
    let focus = arcTree.tp.subject;
    if (["BlankNode", "Variable"].indexOf(focus.termType) !== -1)
      return true;
    const res = shexValidator.ShExValidator.prototype.validateNodeConstraint.call({ evaluateShapeExprSemActs: (ncRet, nc2, focus2, label) => [] }, focus, nc, new shexValidator.ShapeExprValidationContext(null, "asdf"));
    return !res.errors;
  }
  visitEachOf(expr, arcTree, closed, ...args) {
    return !!expr.expressions.find((nested) => this.visitTripleExpr(nested, arcTree, closed, ...args));
  }
  visitOneOf(expr, arcTree, closed, ...args) {
    return !!expr.expressions.find((nested) => this.visitTripleExpr(nested, arcTree, closed, ...args));
  }
  visitTripleConstraint(expr, arcTree, _closed, ...args) {
    let p = arcTree.tp.predicate;
    if (p.type === "path" && p.pathType === "/") {
      const t = p.items.find((item) => item.pathType !== "*");
      if (t)
        p = t;
      else
        throw Error(`need support for ${JSON.stringify(p)}`);
    }
    if (expr.predicate !== p.value)
      return false;
    if (!expr.valueExpr)
      return arcTree.out.length === 0;
    if (arcTree.out.length === 0) {
      return this.visitShapeExpr(expr.valueExpr, new ArcTree({
        //@ts-ignore
        subject: arcTree.tp.object,
        predicate: NoMatch,
        object: NoMatch
      }, []), ...args);
    }
    return !arcTree.out.find((childArcTree) => {
      return !this.visitShapeExpr(expr.valueExpr, childArcTree, ...args);
    });
  }
}

export { ArcTreeFitsInShapeExpr };
//# sourceMappingURL=ArcTreeFitsInShapeExpr.js.map
