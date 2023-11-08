const MANIFEST = {
  param: 'manifest',
  default: 'playground/manifests/manifest.yaml'
};
const PARSE_TIMEOUT = 400; // wait after keystroke before re-parsing data

import {FhirSparql} from './fhir-sparql/src/FhirSparql.js';
import {SparqlQuery} from './fhir-sparql/src/RdfUtils';

class TooFewResultsError extends Error {}
class TooManyResultsError extends Error {}

class Playground {

  constructor () {
    this.startTime = new Date();
    this.resource = null;
    this.id = null;
    this.sources = [];
    this.fhirSchema = null;
    this.rewriter = null
    this.dataParseTimer = null; // serves as a dirty bit
    this.fhirEndpoint = 'http://ec2-54-241-145-243.us-west-1.compute.amazonaws.com:8080/hapi/fhir/'; // e.g. Observation?code=8302-2
  }

  async init () {
    this.fhirSchema = await this.loadFhirShEx("playground/FHIR-R5-ShEx.json");
    delete this.fhirSchema['@context']; // breaks ShExVisitor
    this.rewriter = new FhirSparql(this.fhirSchema);
    this.onLoad();
    return this;
  }

  async loadFhirShEx (url) {
    const resp = await fetch(url);
    if (!resp.ok)
      throw Error(`failed to load FHIR ShEx JSON from <${url}>:\n${await resp.text()}`);
    return resp.json();
  }

  async onLoad () {
    const params = new URLSearchParams(location.search);
    this.setupEvents();
    const manifestURL = params.get(MANIFEST.param) || MANIFEST.default;
    let now = '';
    try {
      now = `fetch <${manifestURL}>`;
      const body = await this.getBody(manifestURL, 'manifest');
      now = `parse manifest ${body}`;
      const manifest = Stuff.JsYaml.load(body);
      this.paintManifest(manifest, $('body > .header'), this.headerManifestSelect.bind(this), new URL(manifestURL, location));
      console.log(`Manifest <${manifestURL}>:`, manifest)
    } catch (e) {
      console.error(e);
      document.querySelector('body').classList.add('error');
      // alert(e);
    }
  }

  setupEvents () {
    // Left pane
    $('#data .format').on('change', evt => {
      try {
        const url = $('#data textarea').data('url');
        if ($('#data .format').val() === 'Turtle' && $('#data textarea').val().length > 0) {
          const resource = JSON.parse($('#data textarea').val());
          const xlator = new Stuff.FhirJsonToTurtle();
          const ttl = xlator.prettyPrint(resource);
          $('#data textarea').val(ttl);
          const src = this.sources.find(src => src.url.href === url.href) || {label: 'console', url};
          src.db = null;
          src.db = this.parseTurtle(url.href, ttl);
        } else if ($('#data .format').val() === 'JSON' && $('#data textarea').val().length > 0) {
          const tz = new N3.Parser({baseIRI: url.href, format: 'text/turtle'}).parse($('#data textarea').val());
          // console.log(tz.map(t => `${t.subject} ${t.predicate} ${t.object} .`))
          const {resource, ignored} = new Stuff.FhirTurtleToJson().transpose(tz); // s1_s9
          $('#data textarea').val(JSON.stringify(resource, null, 2));
          // $('#text').empty().addClass('error').append($('<pre/>').text('Turtle to JSON not implemented'));
          // $('#data .format').val('Turtle');
        }
      } catch (e) {
        $('#text').empty().addClass('error').append($('<pre/>').text(e?.stack || e?.message || e));
      }
    });

    $('#curSources').on('change', evt => {
      // swap the selected data file into the textarea
      if (this.dataParseTimer) {
        clearTimeout(this.dataParseTimer);
        this.reflectUpdatesToSources();
      }
      const source = this.sources.find(src => src.url.href === $('#curSources').val());
      $('#data textarea').val(source.body);
      $('#data textarea').data('url', source.url);
      this.reflectUpdatesToSources();
    });

    $('#data textarea').on('keyup', evt => {
      // set timer to update the sources to relect the current contents of the textarea
      if (this.dataParseTimer)
        clearTimeout(this.dataParseTimer);

      this.dataParseTimer = setTimeout(_ => this.reflectUpdatesToSources(), PARSE_TIMEOUT);
    });

    // Right panel
    const actionToTextarea = {
      query: '.query',
      validate: '.validate',
      fhir: '.query',
    }

    $('#right select').on('change', evt => {
      // Reveal one right pane depending on select.
      for (const findMe of Object.values(actionToTextarea))
        $('#right').find(findMe).hide();
      $('#right').find(actionToTextarea[$('#right select option:selected').val()]).show();
    });
    $('#right .run').on('click', this.rightPaneRunHandler.bind(this))
  }

  reflectUpdatesToSources () {
    $('#text').empty().removeClass('error');
    const url = $('#data textarea').data('url');
    const src = this.sources.find(src => src.url.href === url.href) || {label: 'console', url};
    src.body = $('#data textarea').val();
    src.db = null;
    try {
      src.db = this.parseTurtle(url.href, src.body);
    } catch (e) {
      $('#text').addClass('error').append($('<pre/>').text(e?.stack || e?.message || e));
    }
    this.dataParseTimer = null;
  }

  paintManifest (manifest, from, action, base) {
    from.find('.manifest').empty().append(
      manifest.map(item => $(`<li/>`).append(
        $(`<button/>`)
          .text(item.label)
          .on('click', evt => action(evt, item, base))
      ))
    )
  }

  async genericManifestSelect (manifestEntry, base, fieldToSelector) {
    const pz = [];
    const ret = [];
    for (const [manifestKey, selector] of Object.entries(fieldToSelector)) {
      // $(selector).empty();
      let aborted = false;
      const derefMe = `${manifestKey}URL`;
      if (derefMe in manifestEntry) {
        const relUrlStrs = Array.isArray(manifestEntry[derefMe])
              ? manifestEntry[derefMe]
              : [manifestEntry[derefMe]];
        for (const relUrlStr of relUrlStrs) {
          if (aborted)
            break;
          const url = new URL(relUrlStr, base);
          pz.push(
            fetch(url)
              .then(
                resp => resp.text().then(body => {
                  if (aborted)
                    return;
                  if (!resp.ok) {
                    aborted = true;
                    const e = Error(`${url} => ${resp.status}`);
                    console.error(e.message);
                    e.url = url;
                    e.body = body;
                    throw e;
                  }
                  add(selector, manifestKey, url, body);
                }),
                e => {
                  console.error(`Error reading ${url}:`, e);
                  e.url = url;
                  throw e;
                }
              )
          );
        }
      } else if (manifestKey in manifestEntry) {
        add(selector, manifestKey, base, manifestEntry[manifestKey]);
      }
    }
    if (pz.length > 0)
      await Promise.all(pz)
    return ret;

    function add (selector, manifestKey, url, body) {
      if (!(manifestKey in ret)) {
        $(selector).val(body);
        $(selector).data('url', url);
        ret[manifestKey] = [{url, body}];
      } else {
        ret[manifestKey].push({url, body});
      }
    }
  }

  makeLabel (url) {
    const m = url.pathname.match(/([^/]+\/[^/]+)$/);
    const str = m ? m[1] : url.pathname;
    const len = Math.floor(window.innerWidth/3);
    const start = str.length - len;
    return start < 0 ? str : str.substring(start);
  }

  async headerManifestSelect (evt, manifestEntry, base) {
    $('#text').removeClass('error').empty();
    try {
      const {data} = await this.genericManifestSelect(manifestEntry, base, {
        data: '#data textarea',
        dataFormat: '#data .format',
        action: '#right .header select',
        sparqlQuery: '#right textarea.query',
        shexSchema: '#right textarea.validate',
        // sparqlQuery: '#right textarea.query',
      });
      if (data) {
        this.sources = data.map(({url, body}) => {
          return {
            label: this.makeLabel(url),
            url,
            body,
            db: this.parseTurtle(url.href, body, manifestEntry.dataFormat),
          };
        } );
        const nowShowing = $('#data textarea').data('url').href;
        $('#curSources').empty().append(this.sources.map(src => $('<option/>', {value: src.url.href, selected: src.url.href === nowShowing}).text(src.label)));
        console.assert(this.sources.find(source => source.url.href === $('#data textarea').data('url').href));
      } else {
        this.sources = null;
      }
    } catch (e) {
      $('#text').addClass('error').append($('<pre/>').text(e?.stack || e?.message || e));
      return;
    }

    if (this.sources)
      try {
        const textStuff = await this.expectOneQueryResult(`PREFIX fhir: <http://hl7.org/fhir/>
SELECT ?resource ?id ?div {
  ?resource fhir:nodeRole fhir:treeRoot ;
    fhir:id [ fhir:v ?id ] ;
    fhir:text [ fhir:div ?div ] }`);
        if (textStuff) {
          $('#text').get(0).innerHTML = textStuff.div.value;
          this.resource = textStuff.resource;
          this.id = textStuff.id;
        }
      } catch (e) {
        $('#text').empty().append(
          e instanceof TooFewResultsError
            ? $('<p/>', {"class": "warning"}).text('no div in Resource')
          : $('<p/>', {"class": "error"}).text(e.message)
        );
      }

    // if (!!$('#right textarea:visible').val()) {
    //   $('#right .run')
    //     .on('click', this.rightPaneRunHandler.bind(this))
    // }
    if (manifestEntry.sparqlQueries) {
      this.paintManifest(manifestEntry.sparqlQueries, $('#right > .header'), this.queryManifestSelect.bind(this), base);
    }
  }

  async queryManifestSelect (evt, manifestEntry, base) {
    await this.genericManifestSelect(manifestEntry, base, {
      action: '#right .header select',
      sparqlQuery: '#right textarea.query',
      shexSchema: '#right textarea.validate',
    });
    $('#right select').change();
    // if (!!$('#right textarea:visible').val()) {
    //   $('#right .run')
    //     .off()
    //     .on('click', this.rightPaneRunHandler.bind(this))
    // }
  }

  async getBody (url, what) {
    const resp = await fetch(url);
    const body = await resp.text();
    if (!resp.ok)
      throw Error(`Unable to fetch ${what} at <${url}>:\n${body}`);
    return body;
  }

  async expectOneQueryResult (query) {
    // const db = await this.parseDataPane();
    const typed = await this.executeQuery(this.sources.map(src => src.db), query);
    if (typed.length < 1)
      throw new TooFewResultsError(`Expected 1 result, got ${typed.length}:\n${query}`);
    if (typed.length > 1)
      throw new TooManyResultsError(`Expected 1 result, got ${typed.length}:\n${query}`);
    return typed[0];
  }

  async parseDataPane () {
    return this.parseTurtle(location.href, $('#data textarea').val());
  }

  parseTurtle (baseIRI, text, dataFormat = 'Turtle') {
    if (dataFormat === 'JSON')
      text = new Stuff.FhirJsonToTurtle().prettyPrint(JSON.parse(text));

    const db = new N3.Store();
    const parser = new N3.Parser({baseIRI})
    db.addQuads(parser.parse(text));
    return db;
  }

  async executeQuery (sources, query) {
    const myEngine = new Comunica.QueryEngine();
    const typedStream = await myEngine.queryBindings(query, {sources});
    const asArray = await typedStream.toArray();
    const rows = asArray.map(
      b => Object.fromEntries(b.entries)
    );
    console.log('Query result rows:', rows);
    return rows;
  }

  async rightPaneRunHandler (evt) {
    $('#runResults').empty();
    const reqStr = $('#right select').val();
    try {
      switch (reqStr) {
      case 'query': return await this.renderQueryResults(evt);
      case 'validate': return await this.renderValidationResults(evt);
      case 'fhir': return await this.renderFhirResults(evt);
      default: throw Error(`unknown run request: ${reqStr}`);
      }
    } catch (e) {
      console.error(e);
      $('#runResults').append(
        $('<p/>', {"class": "error"}).text(`failure trying to ${reqStr}:`),
        $('<pre/>', {"class": "error"}).text(e.stack),
      );
    }
  }

  async renderQueryResults (evt) {
    // const db = await this.parseDataPane();
    if (this.sources === null) {
      $('#runResults').text('no data (so no results)');
      return;
    }

    const db = new N3.Store();// await this.parseDataPane();
    this.sources.forEach(src => db.addQuads(src.db.getQuads()));
    const startTime = new Date();
    $('button.run').text(`Started ${startTime}`);
    const typed = await this.executeQuery([db], $('#right textarea.query').val());
    $('button.run').text(`Done ${(new Date() - startTime)/1000}`);
    if (typed.length === 0) {
      $('#runResults').text('no results');
    } else {
      $('#runResults').text(`${typed.length} results`);
      const variables = Object.keys(typed[0]); // TODO: look for more elegant solution
      const heading = $('<tr/>').append('<th/>').text('#');
      heading.append(variables.map(v => $('<th/>').text(v)));
      const table = $('<table/>').append($('<thead/>').append(heading));
      $('#runResults').append(table);
      for (const rowNo in typed) {
        const row = typed[rowNo];
        table.append(
          $('<tr/>').append([ $('<td/>').text('' + rowNo) ].concat(
            variables.map(v => $('<td/>').text(row[v].value))
          ) )
        )
      }
    }
    console.log(typed);
  }

  async renderValidationResults (evt) {
    const shExLoader = Stuff.ShExLoader({fetch: window.fetch.bind(window), rdfjs: N3, jsonld: null});
    const db = await this.parseDataPane();
    const statusElt = $('#runResults');

    class ProgressLoadController extends shExLoader.ResourceLoadControler {
      constructor (statusElt, src) {
        super(src);
        this.statusElt = statusElt;
      }
      add (promise) {
        const index = this.toLoad.length;
        super.add(promise.then(ret => {
          const msg = `Loaded ${index} of ${this.schemasSeen.length} imports: ${ret.url}`;
          this.statusElt.empty().append('<p/>').text(msg);
          console.log(msg);
          return ret;
        }));
      }
      allLoaded () {
        return super.allLoaded().then(x => {
          const msg = `Loaded ${this.toLoad.length} imports.\n`;
          this.statusElt.empty().append('<p/>').text(msg);
          console.log(msg);
          return x;
        });
      }
    }

    statusElt.empty().append('<p/>').text('loading schema');
    const loaded = await shExLoader.load(
      {shexc: [{
        text: $('#right textarea.validate').val(),
        url: $('#right textarea.validate').data('url').href
      }]},
      {turtle: [{
        text: $('#data textarea').val(),
        url: $('#data textarea').data('url').href
      }]},
      {
        collisionPolicy: (type, left, right) => {
          const lStr = JSON.stringify(left);
          const rStr = JSON.stringify(right);
          if (lStr === rStr) {
            return false; // keep left/old assignment
          }
          throw new Error(`Conflicing definitions: ${lStr} !== ${rStr}`);
        },
        skipCycleCheck: true,
        // loadController: new ProgressLoadController(statusElt, [$('#right textarea.validate').data('url').href]),
      }
    );
    const validator = new Stuff.ShExValidator(
      loaded.schema,
      Stuff.RdfJsDb.ctor(loaded.data),
      {
        results: "api",
        // regexModule: ShExWebApp[$("#regexpEngine").val()],
        // ignoreClosed: $("#ignoreClosed").is(":checked"),
      });
    console.log(loaded, validator);
    statusElt.empty().append('<p/>').text('validating');
    const res = validator.validateNodeShapePair(
      this.resource, // node
      Stuff.ShExValidator.Start, // shape
    );
    console.log('Validation results:', res);
    statusElt.empty().append($('<pre/>', {"class": !!res.errors ? 'error' : 'success'}).text(JSON.stringify(res, null, 2)));
  }

  async renderFhirResults (evt) {
    const parserOpts = {
      prefixes: undefined,
      baseIRI: $('#right textarea.query').data('url'),
      factory: N3.DataFactory,
      skipValidation: false,
      skipUngroupedVariableCheck: false,
      pathOnly: false,
    }
    // const sparqlParser = new Stuff.SparqlParser(parserOpts);
    // const iQuery = sparqlParser.parse($('#right textarea.query').val());
    const iQuery = SparqlQuery.parse($('#right textarea.query').val(), parserOpts);
    const {arcTrees, connectingVariables, referents} = this.rewriter.getArcTrees(iQuery);
    console.log(Date.now(), {arcTrees, connectingVariables, referents});

    this.sources = [];
    $('#curSources').empty();
    let results = [{}];
    for (const arcTree of arcTrees) {
      const newResults = [];
      for (const result of results) {
        // opBgpToFhirPathExecutions returns disjuncts
        for (const fhirPathExecution of this.rewriter.opBgpToFhirPathExecutions(arcTree, referents, result)) {
          // {name: 'code', value: 'http://loinc.org|72166-2'} -> code=http%3A%2F%2Floinc.org%7C72166-2
          // const paths = fhirPathExecution.paths.map(qp => encodeURIComponent(qp.name) + '=' + encodeURIComponent(qp.value)).join('&') || '';
          const searchUrl = new URL(fhirPathExecution.type, this.fhirEndpoint);
          for (const {name, value} of fhirPathExecution.paths)
            searchUrl.searchParams.set(name, value);
          console.log(searchUrl.href);
          // const urlStr = this.fhirEndpoint + fhirPathExecution.type + paths;
          const resp = await fetch(searchUrl, { headers: { Accept: 'application/json+fhir' } });
          const body = await resp.text();
          if (!resp.ok)
            throw Error(`Unable to fetch ${urlStr} at <${url}>:\n${body}`);
          const bundle = JSON.parse(body);
          /*
            {
            "resourceType": "Bundle", "id": "5183b131-5b14-47e3-84c6-2e0d398e10d3",
            "meta": { "lastUpdated": "2023-11-07T16:38:22.656+00:00" }, "type": "searchset",
            "link": [
            { "relation": "self", "url": "./fhir/Observation?code=http%3A%2F%2Floinc.org%7C72166-2" },
            { "relation": "next", "url": "./fhir?_getpages=518...0d3&_getpagesoffset=20&_count=20&_pretty=true&_bundletype=searchset" }
            ],
            "entry": [ {
            "fullUrl": "./fhir/Observation/58157",
            "resource": {
            "resourceType": "Observation",
            "id": "58157",
            ... } } ] }
          */
          for (const {fullUrl, resource} of bundle.entry) {
            // const xlator = new Stuff.FhirJsonToTurtle();
            // const ttl = xlator.prettyPrint(resource);
            const url = new URL(fullUrl);
            const label = this.makeLabel(url);
            const ttl = new Stuff.FhirJsonToTurtle().prettyPrint(resource);
            const db = this.parseTurtle(fullUrl, ttl, 'Turtle');
            $("#data .format").val('Turtle'); // yeah, sets multiple times. whatever
            $('#data textarea').val(ttl);
            const src = { label, url, body: ttl, db };
            this.sources.push(src);
            // $('#curSources').append($('<option/>', {value: src.url.href, selected: src.url.href === true}).text(src.label));
            const sel = $('#curSources').get(0);
            const opt = $('<option/>', {value: src.url.href, selected: src.url.href === true}).text(src.label).get(0);
            sel.append(opt);
            const queryStr = SparqlQuery.selectStar(arcTree.getBgp());console.log(queryStr);
            const bindings = await this.executeQuery([db], queryStr);
            Array.prototype.push(newResults, bindings);
          }
        }
      }
      results = newResults;
    }

    this.renderQueryResults(evt);
  }
}

const playgroundInstance = new Playground();
playgroundInstance.init();
console.log('Playground:', playgroundInstance);
