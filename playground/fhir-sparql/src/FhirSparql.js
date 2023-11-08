import { QueryAnalyzer } from './QueryAnalyzer.js';
import { Rdf, Ns } from './Namespaces.js';
import { SparqlQuery, RdfUtils } from './RdfUtils.js';
import { ArcTreeFitsInShapeExpr } from './ArcTreeFitsInShapeExpr.js';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
class ConnectingVariables {
  static toString(cvs) {
    const lines = [];
    for (const [variable, trees] of cvs) {
      lines.push(variable);
      trees.forEach(
        (tree, i) => lines.push(` ${i}: ${tree.pos} of { ${tree.arcTree.toString()} }`)
      );
    }
    return lines.join("\n");
  }
}
class Rule {
  constructor(fhirQuery, sparql, arg = (values) => values[0]) {
    this.fhirQuery = fhirQuery;
    this.arg = arg;
    __publicField(this, "arcTree");
    const query = SparqlQuery.parse("PREFIX fhir: <http://hl7.org/fhir/> PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> SELECT ?v1 { " + sparql + " }");
    this.arcTree = new QueryAnalyzer(null).getArcTrees(query).arcTrees[0].out[0];
    this.arg = arg;
  }
  toString() {
    return "TODO";
  }
}
const Rule_Id = new Rule("id", "[] fhir:id [ fhir:v ?v1 ]");
const Rule_Subject = new Rule("subject", "[] fhir:subject [ fhir:reference ?v1 ]");
const Rule_CodeWithSystem = new Rule(
  // exported for tests/FhirSparq-test
  "code",
  `
[] fhir:code [
  fhir:coding [
    (rdf:first/rdf:rest)*/rdf:first [
      fhir:code [ fhir:v ?v1 ] ;
      fhir:system [ fhir:v ?v2 ]
    ]
  ]
]`,
  (values) => values[1] + "|" + values[0]
);
const Rule_CodeWithOutSystem = new Rule(
  "code",
  `
[] fhir:code [
    fhir:coding [
       (rdf:first/rdf:rest)*/rdf:first [
        fhir:code [
          fhir:v ?v1
        ]
      ]
    ]
  ]`
);
const Rule_Family = new Rule(
  "family",
  `
[] fhir:name [
  fhir:family [
    fhir:v ?v1
  ]
]`
);
const Rule_Given = new Rule(
  "given",
  `
[] fhir:name [
  fhir:given [
    fhir:v ?v1
  ]
]`
);
class QueryParam {
  constructor(name, value) {
    this.name = name;
    this.value = value;
  }
}
class FhirPathExecution {
  constructor(type, version, paths) {
    this.type = type;
    this.version = version;
    this.paths = paths;
  }
}
class RuleChoice {
  constructor(choices) {
    this.choices = choices;
  }
  accept(arcTrees, sparqlSolution) {
    for (let choiceNo = 0; choiceNo < this.choices.length; ++choiceNo) {
      const choice = this.choices[choiceNo];
      const values = this.parallelWalk(arcTrees, choice.arcTree, choiceNo, sparqlSolution);
      if (values !== null)
        return new QueryParam(choice.fhirQuery, choice.arg(values.map((v) => v.value)));
    }
    return null;
  }
  parallelWalk(testArcTrees, myArcTree, choiceNo, sparqlSolution) {
    const needed = myArcTree.out.slice();
    const matched = testArcTrees.map((testArcTree) => {
      if (RdfUtils.pmatch(testArcTree.tp.predicate, myArcTree.tp.predicate)) {
        if (myArcTree.out.length === 0) {
          let matchedTerm = testArcTree.tp.object;
          if (["Variable", "BlankNode"].indexOf(matchedTerm.termType) !== -1) {
            if (!sparqlSolution[matchedTerm.value])
              return null;
            matchedTerm = sparqlSolution[matchedTerm.value];
          }
          if (RdfUtils.isPath(matchedTerm)) {
            throw Error(`unexpected RDF Property Path in ${JSON.stringify(matchedTerm)}`);
          } else {
            switch (matchedTerm.termType) {
              case "NamedNode":
              case "Literal":
                return [matchedTerm];
              default:
                throw Error(`unexpected RDF term type in ${JSON.stringify(matchedTerm)}`);
            }
          }
        } else {
          const nestedRet = [];
          for (let myOutIdx = 0; myOutIdx < needed.length; ++myOutIdx) {
            const ret = this.parallelWalk(testArcTree.out, needed[myOutIdx], choiceNo, sparqlSolution);
            if (ret !== null) {
              needed.splice(myOutIdx, 1);
              --myOutIdx;
              nestedRet.push(ret);
            }
          }
          return nestedRet.length === 0 ? null : nestedRet.flat();
        }
      } else {
        return null;
      }
    }).flat();
    const vals = matched.filter((x) => !!x);
    if (vals.length && needed.length === 0) {
      return vals;
    } else {
      return null;
    }
  }
}
const RuleChoice_Id = new RuleChoice([Rule_Id]);
const ResourceToPaths = {
  "EveryResource": [RuleChoice_Id],
  "Observation": [new RuleChoice([Rule_Subject]), new RuleChoice([Rule_CodeWithSystem, Rule_CodeWithOutSystem])],
  "Patient": [new RuleChoice([Rule_Given]), new RuleChoice([Rule_Family])],
  // new RuleChoice([Rule_NameFamily]), new RuleChoice([Rule_NameGiven])
  "Procedure": [new RuleChoice([Rule_Subject]), new RuleChoice([Rule_CodeWithSystem, Rule_CodeWithOutSystem])],
  "Questionnaire": []
};
const AllResources = [
  "Observation",
  "Patient",
  "Procedure",
  "Questionnaire"
];
const ResourceTypeRegexp = new RegExp(
  "^https?://.*?/([A-Z][a-z]+)/([^/|]+)(?:\\|(.*))?$"
);
class FhirSparql extends QueryAnalyzer {
  constructor(shex) {
    super(shex);
    __publicField(this, "tester");
    this.tester = new ArcTreeFitsInShapeExpr(shex);
  }
  opBgpToFhirPathExecutions(arcTree, referents, sparqlSolution, meta = { base: "", prefixes: {} }) {
    let resourceType = null;
    let resourceId = null;
    let resourceUrl = null;
    let resourceVersion = null;
    const prefilledRules = [];
    const allResourceRules = ResourceToPaths.EveryResource.slice();
    let candidateTypes = null;
    const rootTriple = arcTree.out[0].tp;
    switch (rootTriple.subject.termType) {
      case "NamedNode":
        resourceUrl = rootTriple.subject.value;
        break;
      case "Variable":
        if (referents.has(rootTriple.subject.value) && sparqlSolution[rootTriple.subject.value])
          resourceUrl = sparqlSolution[rootTriple.subject.value].value;
    }
    if (resourceUrl !== null) {
      const match = resourceUrl.match(ResourceTypeRegexp);
      if (!match)
        throw Error(`subject node ${resourceUrl} didn't match FHIR protocol`);
      resourceType = match[1];
      resourceId = match[2];
      resourceVersion = match[3] || null;
      if (AllResources.indexOf(resourceType) === -1)
        throw Error(`did not recognize FHIR Resource in ${resourceUrl}`);
      candidateTypes = [resourceType];
      prefilledRules.push(new QueryParam(Rule_Id.fhirQuery, resourceId));
      const idRuleIdx = allResourceRules.indexOf(RuleChoice_Id);
      if (idRuleIdx === -1)
        throw Error(`should have an id rule from ResourceToPaths.EveryResource: ${ResourceToPaths.EveryResource}`);
      allResourceRules.splice(idRuleIdx, 1);
    } else if (RdfUtils.pmatch(rootTriple.predicate, Rdf.type)) {
      resourceType = rootTriple.object.value.substring(Ns.fhir.length);
      candidateTypes = [resourceType];
    } else {
      candidateTypes = AllResources;
    }
    return candidateTypes.filter((type) => {
      const candidateShapeLabels = this.resourceTypeToShapeDeclIds.get(type);
      return candidateShapeLabels.find((label) => {
        if (arcTree.tp !== null)
          throw Error(`Expected root of ArcTree to be null: ${arcTree.toString()}`);
        return !arcTree.out.find((child) => !this.tester.visitShapeRef(label, child));
      });
    }).map((type) => {
      const myResourceRules = allResourceRules.slice();
      Array.prototype.push.apply(myResourceRules, ResourceToPaths[type]);
      const acceptedPaths = myResourceRules.map((ruleChoice) => ruleChoice.accept(arcTree.out, sparqlSolution)).filter((queryParam) => queryParam !== null);
      const paths = prefilledRules.concat(acceptedPaths);
      return new FhirPathExecution(type, resourceVersion, paths);
    });
  }
}

export { ConnectingVariables, FhirPathExecution, FhirSparql, Rule_CodeWithSystem };
//# sourceMappingURL=FhirSparql.js.map
