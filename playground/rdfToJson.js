
const N3 = require('n3');

let tStrs0 = [
  /*0*/ "_:b34 <p3> 3 .",
  /*1*/ "_:b34 <p4> 4 .",
  /*2*/ "_:b25 <p2> _:b34 .",
  /*3*/ "_:b25 <p5> 5 .",
  /*4*/ "<s1> <p1> _:b25 .",
  /*5*/ "_:b78 <p7> 7 .",
  /*6*/ "_:b78 <p8> 8 .",
  /*7*/ "<s1> <p6> _:b78 .",
  /*8*/ "<s9> <p9> 9 .",
];

const Ns = {
  fhir: 'http://hl7.org/fhir/',
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const ROOT = '<root>';

function transpose (graph) {
  const ret = {};
  const ignored = [];
  const lists = {};
  const literals = {};
  let rootTerm = null;
  for (let target of graph) {
    const {subject: s, predicate: p, object: o} = target;
    const sKey = keyFor(s);
    if (sKey === ROOT && rootTerm && !rootTerm.equals(s)) {
      ignored.push(target);
    } else {
      if (sKey === ROOT && !rootTerm)
        rootTerm = s;

      switch (p.value) {
      case Ns.rdf + 'first':
        {
          const appending = Object.keys(lists).find(key => lists[key].tail === sKey);
          if (!ret[keyFor(o)])
            ret[keyFor(o)] = o.termType === 'BlankNode' ? {} : jsonize(o)
          if (appending) {
            ret[appending].push(ret[keyFor(o)]);
          } else {
            lists[sKey] = {
              // tail: undefined,
            }
            ret[sKey] = [ret[keyFor(o)]];
          }
        }
        break;
      case Ns.rdf + 'rest':
        {
          const appending = Object.values(lists).find(elt => elt.tail === sKey) || lists[sKey];
          if (o.termType === 'NamedNode' && o.value === Ns.rdf + 'nil') {
            appending.closed = true;
            delete appending.tail;
          } else {
            appending.tail = keyFor(o);
          }
        }
        break;
      default:
        const property = p.value.substring(Ns.fhir.length);
        switch (property) {
        case 'v':
          literals[sKey] = o;
          break;
        case 'link':
          break;
        default:
          let o2 = o;
          if (o.termType === 'BlankNode' && keyFor(o) in literals) {
            o2 = literals[keyFor(o)];
            delete literals[keyFor(o)];
          }
          if (!ret[sKey]) {
            ret[sKey] = {}
            // if (s.termType === 'NamedNode') {
            //   ret[sKey].id = s.value;
            // }
          }
          switch (o2.termType) {
          case 'BlankNode':
            const oKey = keyFor(o2);
            ret[sKey][property] = ret[oKey];
            delete ret[oKey];
            break;
          case 'NamedNode':
            ret[sKey][property] = o2.value;
            break;
          case 'Literal':
            ret[sKey][property] = jsonize(o2);
            break;
          default:
            throw Error(`expected RdfJs triple or quad; got ${JSON.stringify(target)}`);
          }
        }
      }
    }
  }
  return {resource: ret[ROOT], ignored};
}

function keyFor (term) {
  return term.termType === 'NamedNode' ? ROOT : term.value;
}

function jsonize (term) {
  if (!term.datatype.value.startsWith(Ns.xsd))
    throw Error(`no support for non-XSD datatype ${term.datatype.value}`);
  switch (term.datatype.value.substring(Ns.xsd.length)) {
  case 'integer': return parseInt(term.value);
  case 'decimal': return parseFloat(term.value);
  case 'boolean': return term.value === 'true';
  default: return term.value;
  }
}

let goal = {
  s1: {
    p1: {
      p2: { p3: 3, p4: 4 },
      p5: 5
    },
    p6: { p7: 7, p8: 8 }
  },
  s9: { p9: 9 }
}

let s1_s9 = [
  {
    "subject": { "termType": "BlankNode", "value": "b34" },
    "predicate": { "termType": "NamedNode", "value": "p3" },
    "object": {
      "termType": "Literal",
      "value": "3",
      "language": "",
      "datatype": { "termType": "NamedNode", "value": "http://www.w3.org/2001/XMLSchema#integer" }
    }
  },
  {
    "subject": { "termType": "BlankNode", "value": "b34" },
    "predicate": { "termType": "NamedNode", "value": "p4" },
    "object": {
      "termType": "Literal",
      "value": "4",
      "language": "",
      "datatype": { "termType": "NamedNode", "value": "http://www.w3.org/2001/XMLSchema#integer" }
    }
  },
  {
    "subject": { "termType": "BlankNode", "value": "b25" },
    "predicate": { "termType": "NamedNode", "value": "p2" },
    "object": { "termType": "BlankNode", "value": "b34" }
  },
  {
    "subject": { "termType": "BlankNode", "value": "b25" },
    "predicate": { "termType": "NamedNode", "value": "p5" },
    "object": {
      "termType": "Literal",
      "value": "5",
      "language": "",
      "datatype": { "termType": "NamedNode", "value": "http://www.w3.org/2001/XMLSchema#integer" }
    }
  },
  {
    "subject": { "termType": "NamedNode", "value": "s1" },
    "predicate": { "termType": "NamedNode", "value": "p1" },
    "object": { "termType": "BlankNode", "value": "b25" }
  },
  {
    "subject": { "termType": "BlankNode", "value": "b78" },
    "predicate": { "termType": "NamedNode", "value": "p7" },
    "object": {
      "termType": "Literal",
      "value": "7",
      "language": "",
      "datatype": {
        "termType": "NamedNode",
        "value": "http://www.w3.org/2001/XMLSchema#integer"
      }
    }
  },
  {
    "subject": { "termType": "BlankNode", "value": "b78" },
    "predicate": { "termType": "NamedNode", "value": "p8" },
    "object": {
      "termType": "Literal",
      "value": "8",
      "language": "",
      "datatype": { "termType": "NamedNode", "value": "http://www.w3.org/2001/XMLSchema#integer" }
    }
  },
  {
    "subject": { "termType": "NamedNode", "value": "s1" },
    "predicate": { "termType": "NamedNode", "value": "p6" },
    "object": { "termType": "BlankNode", "value": "b78" }
  },
  {
    "subject": { "termType": "NamedNode", "value": "s9" },
    "predicate": { "termType": "NamedNode", "value": "p9" },
    "object": {
      "termType": "Literal",
      "value": "9",
      "language": "",
      "datatype": { "termType": "NamedNode", "value": "http://www.w3.org/2001/XMLSchema#integer" }
    }
  }
]
blessTerms(s1_s9, {equals, toString: termToString});

const NsTerm = "http://terminology.hl7.org/CodeSystem/";
let turtle = `
PREFIX fhir: <http://hl7.org/fhir/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
<smoker-1_smoking-2023-06-20>
  fhir:id [ fhir:v "smoker-1_smoking-2023-06-20" ]; # _:n3-0
  fhir:category ( # (_:n3-1, _:n3-7, _:n3-8)
    [ fhir:coding  ( # _:n3-2 fhir:coding (_:n3-3)
      [ fhir:system [ fhir:v "${NsTerm}observation-category"^^xsd:anyURI ]; # _:n3-4 fhir:system _:n3-5. _:n3-5 fhir:v "..."
        fhir:code [fhir:v "social-history"] ]                                # _:n3-4 fhir:code _:n3-6. _:n3-6 fhir:v "social-history"
    ) ]
    "some literal"
    [ fhir:text "boogers" ] # _:n3-6 fhir:text "boogers"                     # _:n3-9 fhir:text "..."
  ) ;
  fhir:subject [                                                             # fhir:subject _:n3-10
    fhir:link <../Patient/smoker-1>;
    fhir:reference [ fhir:v "Patient/smoker-1" ]                                  # _:n3-11 fhir:v "..."
  ] .                                                                        # _:n3-7 fhir:link 7; fhir:reference 8
<../Patient/smoker-1> a fhir:Patient .
`;

let tStrs = [
  /* 0*/ '_:n3-0 fhir:v "smoker-1_smoking-2023-06-20" .',
  /* 1*/ '<smoker-1_smoking-2023-06-20> fhir:id _:n3-0 .',
  /* 2*/ '_:n3-1 rdf:first _:n3-2 .',
  /* 3*/ '_:n3-3 rdf:first _:n3-4 .',
  /* 4*/ '_:n3-5 fhir:v ".../observation-category"^^xsd:anyURI .',
  /* 5*/ '_:n3-4 fhir:system _:n3-5 .',
  /* 6*/ '_:n3-6 fhir:v "social-history" .',
  /* 7*/ '_:n3-4 fhir:code _:n3-6 .',
  /* 8*/ '_:n3-3 rdf:rest rdf:nil .',
  /* 9*/ '_:n3-2 fhir:coding _:n3-3 .',
  /*10*/ '_:n3-1 rdf:rest _:n3-7 .',
  /*11*/ '_:n3-7 rdf:first "some literal" .',
  /*12*/ '_:n3-7 rdf:rest _:n3-8 .',
  /*13*/ '_:n3-8 rdf:first _:n3-9 .',
  /*14*/ '_:n3-9 fhir:text "boogers" .',
  /*15*/ '_:n3-8 rdf:rest rdf:nil .',
  /*16*/ '<smoker-1_smoking-2023-06-20> fhir:category _:n3-1 .',
  /*17*/ '_:n3-10 fhir:link <../abc> .',
  /*18*/ '_:n3-11 fhir:v "Patient/smoker-1" .',
  /*19*/ '_:n3-10 fhir:reference _:n3-11 .',
  /*20*/ '<smoker-1_smoking-2023-06-20> fhir:subject _:n3-10 .',
  /*21*/ '<../Patient/smoker-1> rdf:type fhir:Patient .'
];


const tz = new N3.Parser({baseIRI: 'http://a.example/Observation/', format: 'text/turtle'})
      .parse(turtle);
blessTerms(tz, {toString: termToString});
// console.log(tz.map(t => `${t.subject} ${t.predicate} ${t.object} .`))
const {resource, ignored} = transpose(tz); // s1_s9
for (const ign of ignored)
  console.error(`ignoring ${ign.subject.toString()} ${ign.predicate.toString()} ${ign.object.toString()} .`);
console.log(JSON.stringify(resource, null, 2));

function blessTerms (tz, fz) {
  for (const triple of tz)
    for (const pos of ['subject', 'predicate', 'object']) {
      for (const [methodName, blessMe] of Object.entries(fz))
        triple[pos][methodName] = blessMe.bind(triple[pos]);
    }
}

function equals (o) {
  return o.termType === this.termType
    && o.value === this.value;
}

function termToString () {
  switch (this.termType) {
  case 'BlankNode': return '_:' + this.value;
  case 'NamedNode': return '<' + this.value + '>';
  case 'Literal': return '"' + this.value + '"' +
      (this.language !== ''
       ? '@' + this.language
       : this.datatype && this.datatype.value !== "http://www.w3.org/2001/XMLSchema#string"
       ? '^^<' + this.datatype.value + '>'
       : '')
  default: throw Error(`termToString ${JSON.stringify(this)}`);
  }
}
