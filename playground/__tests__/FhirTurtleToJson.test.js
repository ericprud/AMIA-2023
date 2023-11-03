
const N3 = require('n3');
const {FhirTurtleToJson} = require('../FhirTurtleToJson');

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
<smoker-1_smoking-2023-06-20> a fhir:Observation ;
  fhir:nodeRole fhir:treeRoot ;
  fhir:id [ fhir:v "smoker-1_smoking-2023-06-20" ]; # _:n3-0
  fhir:category ( # (_:n3-1, _:n3-7, _:n3-8)
    [ fhir:coding  ( # _:n3-2 fhir:coding (_:n3-3)
      [ fhir:system [ fhir:v "${NsTerm}observation-category"^^xsd:anyURI ]; # _:n3-4 fhir:system _:n3-5. _:n3-5 fhir:v "..."
        fhir:code [fhir:v "social-history"] ]                                # _:n3-4 fhir:code _:n3-6. _:n3-6 fhir:v "social-history"
    ) ]
    [ fhir:v "some literal" ]
    [ fhir:text [ fhir:v "boogers" ] ] # _:n3-6 fhir:text "boogers"                     # _:n3-9 fhir:text "..."
  ) ;
  fhir:subject [                                                             # fhir:subject _:n3-12
    fhir:link <../Patient/smoker-1>;
    fhir:reference [ fhir:v "Patient/smoker-1" ]                                  # _:n3-13 fhir:v "..."
  ] .                                                                        # _:n3-7 fhir:link 7; fhir:reference 8
<../Patient/smoker-1> a fhir:Patient .
`;

let tStrs = [
  /* 0*/ '<smoker-1_smoking-2023-06-20> a fhir:Observation .',
  /* 1*/ '<smoker-1_smoking-2023-06-20> fhir:nodeRole fhir:treeRoot .',
  /* 2*/ '_:n3-0 fhir:v "smoker-1_smoking-2023-06-20" .',
  /* 3*/ '<smoker-1_smoking-2023-06-20> fhir:id _:n3-0 .',
  /* 4*/ '_:n3-1 rdf:first _:n3-2 .',
  /* 5*/ '_:n3-3 rdf:first _:n3-4 .',
  /* 6*/ '_:n3-5 fhir:v ".../observation-category"^^xsd:anyURI .',
  /* 7*/ '_:n3-4 fhir:system _:n3-5 .',
  /* 8*/ '_:n3-6 fhir:v "social-history" .',
  /* 9*/ '_:n3-4 fhir:code _:n3-6 .',
  /*10*/ '_:n3-3 rdf:rest rdf:nil .',
  /*11*/ '_:n3-2 fhir:coding _:n3-3 .',
  /*12*/ '_:n3-1 rdf:rest _:n3-7 .',
  /*13*/ '_:n3-7 rdf:first _:n3-8 .',
  /*14*/ '_:n3-8 fhir:v "some literal" .',
  /*15*/ '_:n3-7 rdf:rest _:n3-9 .',
  /*16*/ '_:n3-9 rdf:first _:n3-10 .',
  /*17*/ '_:n3-11 fhir:v "boogers" .',
  /*18*/ '_:n3-10 fhir:text _:n3-11 .',
  /*19*/ '_:n3-9 rdf:rest rdf:nil .',
  /*20*/ '<smoker-1_smoking-2023-06-20> fhir:category _:n3-1 .',
  /*21*/ '_:n3-12 fhir:link <../Patient/smoker-1> .',
  /*22*/ '_:n3-13 fhir:v "Patient/smoker-1" .',
  /*23*/ '_:n3-12 fhir:reference _:n3-13 .',
  /*24*/ '<smoker-1_smoking-2023-06-20> fhir:subject _:n3-12 .',
  /*25*/ '<../Patient/smoker-1> a fhir:Patient .'
];

describe('FhirTurtleToJson', () => {

  it('should parse an Observation', () => {
    const tz = new N3.Parser({baseIRI: 'http://a.example/Observation/', format: 'text/turtle'})
          .parse(turtle);
    blessTerms(tz, {toString: termToString});
    // console.log(tz.map(t => `${t.subject} ${t.predicate} ${t.object} .`))
    const {resource, ignored} = new FhirTurtleToJson().transpose(tz); // s1_s9
    // for (const ign of ignored)
    //   console.error(`ignoring ${ign.subject.toString()} ${ign.predicate.toString()} ${ign.object.toString()} .`);
    expect(ignored.map(
      ign => `ignoring ${ign.subject.toString()} ${ign.predicate.toString()} ${ign.object.toString()} .`
    )).toEqual([
      'ignoring <http://a.example/Patient/smoker-1> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://hl7.org/fhir/Patient> .'
    ]);
    // console.log(JSON.stringify(resource, null, 2));
    expect(resource).toEqual({
      "resourceType": "Observation",
      "id": "smoker-1_smoking-2023-06-20",
      "category": [
        {
          "coding": [
            {
              "system": "http://terminology.hl7.org/CodeSystem/observation-category",
              "code": "social-history"
            }
          ]
        },
        "some literal",
        {
          "text": "boogers"
        }
      ],
      "subject": {
        "reference": "Patient/smoker-1"
      }
    });
  })
});

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
