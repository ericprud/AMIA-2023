const MANIFEST = {
  param: 'manifest',
  default: 'playground/manifests/manifest.yaml'
};
const PARSE_TIMEOUT = 400; // wait 1 second before re-parsing data

class TooFewResultsError extends Error {}
class TooManyResultsError extends Error {}

class Playground {

  constructor () {
  }

  init () {
    document.addEventListener("DOMContentLoaded", this.onLoad.bind(this));
    this.fhirPreprocessorReady = this.loadFhirShEx("playground/FHIR-R5-ShEx.json");
    this.resource = null;
    this.id = null;
    this.sources = [];
    this.dataParseTimer = null; // serves as a dirty bit
    return this;
  }

  async loadFhirShEx (url) {
    const resp = await fetch(url);
    if (!resp.ok)
      throw Error(`failed to load FHIR ShEx JSON from <${url}>:\n${await resp.text()}`);
    const schema = await resp.json();
    const processor = new Stuff.FhirPreprocessor.toRdf_rdvCh(
      schema, {r: true, d: true, v: true, c: false, h: false}
    );
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
    $('#left select').on('change', evt => {
      if ($('#data select').val() === 'JSON' && $('#data textarea').val().length > 0) {
        // const proprocessor = await this.fhirPreprocessorReady;
        // const json = JSON.parse($('#data textarea').val());
        // const db = proprocessor.preprocess(json);
      }
    });

    $('#right select').on('change', evt => {
      // Reveal one right pane depending on select.
      $('#right select option').get().map(elt => {
        const setMe = $('#right').find('.' + elt.value);
        elt.selected ? setMe.show() : setMe.hide();
      })
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
      } else {
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
    $('#text').empty();
    try {
      const {data} = await this.genericManifestSelect(manifestEntry, base, {
        data: '#data textarea',
        dataFormat: '#data select',
        // sparqlQuery: '#right textarea.query',
      });
      this.sources = data.map(({url, body}) => ({label: this.makeLabel(url), url, body, db: this.parseTurtle(url.href, body)}));
      const nowShowing = $('#data textarea').data('url').href;
      $('#curSources').empty().append(this.sources.map(src => $('<option/>', {value: src.url.href, selected: src.url.href === nowShowing}).text(src.label)));
      console.assert(this.sources.find(source => source.url.href === $('#data textarea').data('url').href));
    } catch (e) {
      $('#data').addClass('error');
      $('#data textarea').val(e?.stack || e?.message || e)
      return;
    }
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

    if (!!$('#right textarea:visible').val()) {
      $('#right .run')
        .prop('disabled', false)
        .on('click', this.rightPaneRunHandler.bind(this))
    }
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
    if (!!$('#right textarea:visible').val()) {
      $('#right .run')
        .prop('disabled', false)
        .off()
        .on('click', this.rightPaneRunHandler.bind(this))
    }
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

  parseTurtle (baseIRI, text) {
    const db = new N3.Store();
    const parser = new N3.Parser({baseIRI})
    db.addQuads(parser.parse(text));
    return db;
  }

  async executeQuery (sources, query) {
    const myEngine = new Comunica.QueryEngine();
    const startTime = new Date();
    $('button.run').text(`Started ${startTime}`);
    const typedStream = await myEngine.queryBindings(query, {sources});
    const asArray = await typedStream.toArray();
    $('button.run').text(`Done ${(new Date() - startTime)/1000}`);
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
    const db = new N3.Store();// await this.parseDataPane();
    this.sources.forEach(src => db.addQuads(src.db.getQuads()));
    const typed = await this.executeQuery([db], $('#right textarea.query').val());
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
    const validator = new Stuff.ShExValidator.ShExValidator(
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
      Stuff.ShExValidator.ShExValidator.Start, // shape
    );
    console.log('Validation results:', res);
    statusElt.empty().append($('<pre/>', {"class": !!res.errors ? 'error' : 'success'}).text(JSON.stringify(res, null, 2)));
  }
}

  const UI = new Playground();
  UI.init();
