var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class ShExVisitor {
  constructor(...ctor_args) {
    __publicField(this, "ctor_args");
    this.ctor_args = ctor_args;
  }
  static isTerm(t) {
    return typeof t !== "object" || "value" in t && Object.keys(t).reduce((r, k) => {
      return r === false ? r : ["value", "type", "language"].indexOf(k) !== -1;
    }, true);
  }
  static isShapeRef(expr) {
    return typeof expr === "string";
  }
  /*
    static visitMap (map, val) {
      const ret = {};
      Object.keys(map).forEach(function (item) {
        ret[item] = val(map[item]);
      });
      return ret;
    }
  */
  runtimeError(e) {
    throw e;
  }
  visitSchema(schema, ...args) {
    const ret = { type: "Schema" };
    this._expect(schema, "type", "Schema");
    this._maybeSet(
      schema,
      ret,
      "Schema",
      ["@context", "prefixes", "base", "imports", "startActs", "start", "shapes"],
      ["_base", "_prefixes", "_index", "_sourceMap", "_locations"],
      ...args
    );
    return ret;
  }
  /*
    visitPrefixes (prefixes, ...args: any[]) {
      return prefixes === undefined ?
        undefined :
        ShExVisitor.visitMap(prefixes, function (val) {
          return val;
        });
    }
  */
  visitIRI(i, ...args) {
    return i;
  }
  visitImports(imports, ...args) {
    return imports.map((imp) => {
      return this.visitIRI(imp, args);
    });
  }
  visitStartActs(startActs, ...args) {
    return startActs === void 0 ? void 0 : startActs.map((act) => {
      return this.visitSemAct(act, ...args);
    });
  }
  visitSemActs(semActs, ...args) {
    if (semActs === void 0)
      return void 0;
    const ret = [];
    semActs.forEach((semAct) => {
      ret.push(this.visitSemAct(semAct, ...args));
    });
    return ret;
  }
  visitSemAct(semAct, ...args) {
    const ret = { type: "SemAct" };
    this._expect(semAct, "type", "SemAct");
    this._maybeSet(
      semAct,
      ret,
      "SemAct",
      ["name", "code"],
      null,
      ...args
    );
    return ret;
  }
  visitShapes(shapes, ...args) {
    if (shapes === void 0)
      return void 0;
    return shapes.map(
      (shapeExpr) => this.visitShapeDecl(shapeExpr, ...args)
    );
  }
  visitShapeDecl(decl, ...args) {
    return this._maybeSet(
      decl,
      { type: "ShapeDecl" },
      "ShapeDecl",
      ["id", "abstract", "restricts", "shapeExpr"],
      null,
      ...args
    );
  }
  visitShapeExpr(expr, ...args) {
    if (ShExVisitor.isShapeRef(expr))
      return this.visitShapeRef(expr, ...args);
    switch (expr.type) {
      case "Shape":
        return this.visitShape(expr, ...args);
      case "NodeConstraint":
        return this.visitNodeConstraint(expr, ...args);
      case "ShapeAnd":
        return this.visitShapeAnd(expr, ...args);
      case "ShapeOr":
        return this.visitShapeOr(expr, ...args);
      case "ShapeNot":
        return this.visitShapeNot(expr, ...args);
      case "ShapeExternal":
        return this.visitShapeExternal(expr, ...args);
      default:
        throw Error("unexpected shapeExpr type: " + expr.type);
    }
  }
  // visitValueExpr (expr: ShExJ.shapeExprOrRef, ...args: any[]):any {
  //   return this.visitShapeExpr(expr, ...args); // call potentially overloaded visitShapeExpr
  // }
  // _visitShapeGroup: visit a grouping expression (shapeAnd, shapeOr)
  _visitShapeGroup(expr, ...args) {
    this._testUnknownAttributes(expr, ["shapeExprs"], expr.type, this.visitShapeNot);
    const r = { type: expr.type };
    r.shapeExprs = expr.shapeExprs.map((nested) => {
      return this.visitShapeExpr(nested, ...args);
    });
    return r;
  }
  visitShapeAnd(expr, ...args) {
    return this._visitShapeGroup(expr, ...args);
  }
  visitShapeOr(expr, ...args) {
    return this._visitShapeGroup(expr, ...args);
  }
  // _visitShapeNot: visit negated shape
  visitShapeNot(expr, ...args) {
    this._testUnknownAttributes(expr, ["shapeExpr"], "ShapeNot", this.visitShapeNot);
    const r = { type: expr.type };
    r.shapeExpr = this.visitShapeExpr(expr.shapeExpr, ...args);
    return r;
  }
  // ### `visitNodeConstraint` deep-copies the structure of a shape
  visitShape(shape, ...args) {
    const ret = { type: "Shape" };
    this._expect(shape, "type", "Shape");
    this._maybeSet(
      shape,
      ret,
      "Shape",
      [
        "abstract",
        "extends",
        "closed",
        "expression",
        "extra",
        "semActs",
        "annotations"
      ],
      null,
      ...args
    );
    return ret;
  }
  _visitShapeExprList(ext, ...args) {
    return ext.map((t) => {
      return this.visitShapeExpr(t, ...args);
    });
  }
  // visitRestricts (restricts: ShExJ.Restricts, ...args: any[]): any { return this._visitShapeExprList(restricts, ...args); }
  visitExtends(ext, ...args) {
    return this._visitShapeExprList(ext, ...args);
  }
  // ### `visitNodeConstraint` deep-copies the structure of a shape
  visitNodeConstraint(nodeConstraint, ...args) {
    const ret = { type: "NodeConstraint" };
    this._expect(nodeConstraint, "type", "NodeConstraint");
    this._maybeSet(
      nodeConstraint,
      ret,
      "NodeConstraint",
      [
        "nodeKind",
        "datatype",
        "pattern",
        "flags",
        "length",
        "reference",
        "minlength",
        "maxlength",
        "mininclusive",
        "minexclusive",
        "maxinclusive",
        "maxexclusive",
        "totaldigits",
        "fractiondigits",
        "values",
        "annotations",
        "semActs"
      ],
      null,
      ...args
    );
    return ret;
  }
  visitShapeRef(reference, ...args) {
    if (typeof reference !== "string")
      throw Error("visitShapeRef expected a string, not " + JSON.stringify(reference));
    return reference;
  }
  visitShapeExternal(expr, ...args) {
    this._testUnknownAttributes(expr, [], "ShapeExternal", this.visitShapeNot);
    return { type: "ShapeExternal" };
  }
  // _visitGroup: visit a grouping expression (someOf or eachOf)
  _visitGroup(expr, ...args) {
    const r = Object.assign(
      // pre-declare an id so it sorts to the top
      "id" in expr ? { id: null } : {},
      { type: expr.type }
    );
    r.expressions = expr.expressions.map((nested) => {
      return this.visitExpression(nested, ...args);
    });
    return this._maybeSet(
      expr,
      r,
      "expr",
      ["id", "min", "max", "annotations", "semActs"],
      ["expressions"],
      ...args
    );
  }
  visitOneOf(expr, ...args) {
    return this._visitGroup(expr, ...args);
  }
  visitEachOf(expr, ...args) {
    return this._visitGroup(expr, ...args);
  }
  visitTripleConstraint(expr, ...args) {
    return this._maybeSet(
      expr,
      Object.assign(
        // pre-declare an id so it sorts to the top
        "id" in expr ? { id: null } : {},
        { type: "TripleConstraint" }
      ),
      "TripleConstraint",
      [
        "id",
        "inverse",
        "predicate",
        "valueExpr",
        "min",
        "max",
        "annotations",
        "semActs"
      ],
      null,
      ...args
    );
  }
  visitTripleExpr(expr, ...args) {
    if (typeof expr === "string")
      return this.visitInclusion(expr);
    switch (expr.type) {
      case "TripleConstraint":
        return this.visitTripleConstraint(expr, ...args);
      case "OneOf":
        return this.visitOneOf(expr, ...args);
      case "EachOf":
        return this.visitEachOf(expr, ...args);
      default:
        throw Error("unexpected expression type: " + expr.type);
    }
  }
  visitExpression(expr, ...args) {
    return this.visitTripleExpr(expr, ...args);
  }
  visitValues(values, ...args) {
    return values.map((t) => {
      return ShExVisitor.isTerm(t) || t.type === "Language" ? t : this.visitStemRange(t, ...args);
    });
  }
  visitStemRange(t, ...args) {
    if (!("type" in t))
      this.runtimeError(Error("expected " + JSON.stringify(t) + " to have a 'type' attribute."));
    const stemRangeTypes = ["IriStem", "LiteralStem", "LanguageStem", "IriStemRange", "LiteralStemRange", "LanguageStemRange"];
    if (stemRangeTypes.indexOf(t.type) === -1)
      this.runtimeError(Error("expected type attribute '" + t.type + "' to be in '" + stemRangeTypes + "'."));
    let stem;
    if (ShExVisitor.isTerm(t)) {
      this._expect(t.stem, "type", "Wildcard");
      stem = { type: t.type, stem: { type: "Wildcard" } };
    } else {
      stem = { type: t.type, stem: t.stem };
    }
    if (t.exclusions) {
      stem.exclusions = t.exclusions.map((c) => {
        return this.visitExclusion(c, ...args);
      });
    }
    return stem;
  }
  visitExclusion(c, ...args) {
    if (!ShExVisitor.isTerm(c)) {
      if (!("type" in c))
        this.runtimeError(Error("expected " + JSON.stringify(c) + " to have a 'type' attribute."));
      const stemTypes = ["IriStem", "LiteralStem", "LanguageStem"];
      if (stemTypes.indexOf(c.type) === -1)
        this.runtimeError(Error("expected type attribute '" + c.type + "' to be in '" + stemTypes + "'."));
      return { type: c.type, stem: c.stem };
    } else {
      return c;
    }
  }
  visitInclusion(inclusion, ...args) {
    if (typeof inclusion !== "string")
      throw Error("visitInclusion expected a string, not " + JSON.stringify(inclusion));
    return inclusion;
  }
  /** internal generic handler for visiting ShExJ structure members
   * treats members as keys on object
   */
  _maybeSet(obj, ret, context, members, ignore, ...args) {
    this._testUnknownAttributes(obj, ignore ? members.concat(ignore) : members, context, this._maybeSet);
    members.forEach((member) => {
      const methodName = "visit" + member.charAt(0).toUpperCase() + member.slice(1);
      if (member in obj) {
        const f = this[methodName];
        if (typeof f !== "function") {
          throw Error(methodName + " not found in Visitor");
        }
        const t = f.call(this, obj[member], ...args);
        if (t !== void 0) {
          ret[member] = t;
        }
      }
    });
    return ret;
  }
  _visitValue(v, ...args) {
    return v;
  }
  // "visit@context",
  visitBase(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitInclude(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitStart(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitAbstract(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitClosed(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitInverse(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitPredicate(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitName(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitId(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitCode(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMin(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMax(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitType(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitNodeKind(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitDatatype(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitPattern(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitFlags(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitLength(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMinlength(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMaxlength(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMininclusive(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMinexclusive(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMaxinclusive(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitMaxexclusive(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitTotaldigits(x, ...args) {
    return this._visitValue(x, ...args);
  }
  visitFractiondigits(x, ...args) {
    return this._visitValue(x, ...args);
  }
  _visitList(l, ...args) {
    return l.slice();
  }
  visitExtra(extra) {
    return this._visitList(extra);
  }
  visitAnnotations(annotations) {
    return this._visitList(annotations);
  }
  _testUnknownAttributes(obj, expected, context, captureFrame) {
    const unknownMembers = Object.keys(obj).reduce(function(ret, k) {
      return k !== "type" && expected.indexOf(k) === -1 ? ret.concat(k) : ret;
    }, []);
    if (unknownMembers.length > 0) {
      const e = Error("unknown propert" + (unknownMembers.length > 1 ? "ies" : "y") + ": " + unknownMembers.map(function(p) {
        return '"' + p + '"';
      }).join(",") + " in " + context + ": " + JSON.stringify(obj));
      Error.captureStackTrace(e, captureFrame);
      throw e;
    }
  }
  _expect(o, p, v) {
    if (!(p in o))
      this.runtimeError(Error("expected " + JSON.stringify(o) + " to have a ." + p));
    if (arguments.length > 2 && o[p] !== v)
      this.runtimeError(Error("expected " + o[p] + " to equal " + v));
  }
}

export { ShExVisitor };
//# sourceMappingURL=ShExVisitor.js.map
