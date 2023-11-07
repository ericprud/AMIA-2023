const Ns = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  fhir: "http://hl7.org/fhir/"
};
const Rdf = {
  type: { termType: "NamedNode", value: Ns.rdf + "type" },
  first: { termType: "NamedNode", value: Ns.rdf + "first" },
  rest: { termType: "NamedNode", value: Ns.rdf + "rest" }
};
const Xsd = {
  integer: { termType: "NamedNode", value: Ns.xsd + "integer" },
  string: { termType: "NamedNode", value: Ns.xsd + "string" },
  anyURI: { termType: "NamedNode", value: Ns.xsd + "anyURI" }
};

export { Ns, Rdf, Xsd };
//# sourceMappingURL=Namespaces.js.map
