module.exports = {
  JsYaml: require('js-yaml'),
  RdfDataFactory: require('rdf-data-factory'),
  ShExLoader: require('@shexjs/loader'),
  ShExValidator: require('@shexjs/validator'),
  RdfJsDb: require('@shexjs/neighborhood-rdfjs'),
  FhirJsonToRdf: require('./FhirJsonToRdf').FhirJsonToRdf,
  // SparqlRdfjs: require('@comunica/query-sparql-rdfjs'),
};
