module.exports = {
  JsYaml: require('js-yaml'),
  RdfDataFactory: require('rdf-data-factory'),
  ShExLoader: require('@shexjs/loader'),
  ShExValidator: require('@shexjs/validator').ShExValidator,
  RdfJsDb: require('@shexjs/neighborhood-rdfjs'),
  FhirJsonToTurtle: require('./FhirJsonToTurtle').FhirJsonToTurtle,
  FhirTurtleToJson: require('./FhirTurtleToJson').FhirTurtleToJson,
  // SparqlRdfjs: require('@comunica/query-sparql-rdfjs'),
};
