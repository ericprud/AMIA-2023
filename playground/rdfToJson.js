
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

let turtle = `
<s1>
  <p1> ( # (_:n3-0, _:n3-4)
    [ <p2>  ( # _:n3-1 <p2> (_:n3-2)
      [ <p3> 3; <p4> 4 ] # _:n3-3 <p3> 3; <p4> 4
    ) ]
    [ <p5> 5 ] # _:n3-5 <p5> 5
  ) ;
  <p6> [ <p7> 7; <p8> 8 ] .
<s9> <p9> 9 .
`;
let tStrs = [
  /* 0*/ '_:n3-0 rdf:first _:n3-1 .', // ( [ <p2> @_:n3-2 ] [ <p5> 5 ] )
  /* 1*/ '_:n3-2 rdf:first _:n3-3 .', // ( [ <p3> 3 ; <p4> 4 ] )
  /* 2*/ '_:n3-3 <p3> "3"^^xsd:integer .',
  /* 3*/ '_:n3-3 <p4> "4"^^xsd:integer .',
  /* 4*/ '_:n3-2 rdf:rest rdf:nil .', // close @_:n3-2
  /* 5*/ '_:n3-1 <p2> _:n3-2 .',
  /* 6*/ '_:n3-0 rdf:rest _:n3-4 .',  // _:n3-0 ... ( [ <p5> 5 ] )
  /* 7*/ '_:n3-4 rdf:first _:n3-5 .', // _:n3-0 ... ( [ <p5> 5 ] )
  /* 8*/ '_:n3-5 <p5> "5"^^xsd:integer .',
  /* 9*/ '_:n3-4 rdf:rest rdf:nil .', // close @_:n3-0
  /*10*/ '<s1> <p1> _:n3-0 .',
  /*11*/ '_:n3-6 <p7> "7"^^xsd:integer .',
  /*12*/ '_:n3-6 <p8> "8"^^xsd:integer .',
  /*13*/ '<s1> <p6> _:n3-6 .',
  /*14*/ "<s9> <p9> 9 .",
];
const Ns = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
};

const ROOT = '<root>';

function transpose (graph) {
  const ret = {};
  const ignored = [];
  const lists = {};
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
          const appending = Object.values(lists).find(elt => elt.tail === sKey);
          if (appending) {
            appending.elements.push(keyFor(o));
          } else {
            lists[sKey] = {
              elements: [keyFor(o)],
              // tail: undefined,
            }
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
            // const appending = Object.entries(lists).find(([head, elt]) => elt.tail === o.value);
            appending.tail = keyFor(o); // lists[sKey].elements.push(keyFor(o)); // appending.elements.push(o.value);
          }
        }
        break;
      default:
        if (!ret[sKey]) {
          ret[sKey] = {}
          if (s.termType === 'NamedNode') {
            ret[sKey].id = s.value;
          }
        }
        switch (o.termType) {
        case 'BlankNode':
          const oKey = keyFor(o);
          if (oKey in lists) {
            ret[sKey][p.value] = lists[oKey].elements;
            // delete lists[oKey];
          } else {
            ret[sKey][p.value] = ret[oKey];
            delete ret[oKey];
          }
          break;
        case 'NamedNode':
          ret[sKey][p.value] = o.value;
          break;
        case 'Literal':
          ret[sKey][p.value] = jsonize(o);
          break;
        default:
          throw Error(`expected RdfJs triple or quad; got ${JSON.stringify(target)}`);
        }
      }
    }
  }
  console.log(JSON.stringify(lists, null, 2))
  return {resource: ret, ignored};
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
const tz = new N3.Parser({baseURI: 'http://a.example/some/base/file', format: 'text/turtle'})
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
