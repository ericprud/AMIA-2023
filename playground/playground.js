const MANIFEST = {
  param: 'manifest',
  default: 'playground/manifests/manifest.yaml'
};

class TooFewResultsError extends Error {}
class TooManyResultsError extends Error {}

class Playground {

  constructor () {
  }

  init () {
    document.addEventListener("DOMContentLoaded", this.onLoad.bind(this));
    return this;
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
    $('#right select').on('change', evt => {
      // Reveal one right pane depending on select.
      $('#right select option').get().map(elt => {
        const setMe = $('#right').find('.' + elt.value);
        elt.selected ? setMe.show() : setMe.hide();
      })
    });
  }

  paintManifest (manifest, from, action, base) {
    from.find('.manifest').append(
      manifest.map(item => $(`<li/>`).append(
        $(`<button/>`)
          .text(item.label)
          .on('click', evt => action(evt, item, base))
      ))
    )
  }

  async genericManifestSelect (manifestEntry, base, fieldToSelector) {
    for (const [manifestKey, selector] of Object.entries(fieldToSelector)) {
      // $(selector).empty();
      const derefMe = `${manifestKey}URL`;
      if (derefMe in manifestEntry) {
        const url = new URL(manifestEntry[derefMe], base);
        let body = null;
        try {
          body = await this.getBody(url, manifestKey);
        } catch (e) {
          body = e;
        }
        $(selector).val(body);
        $(selector).data('url', url);
      } else {
        $(selector).val(manifestEntry[manifestKey]);
        $(selector).data('url', base);
      }
    }
  }

  async headerManifestSelect (evt, manifestEntry, base) {
    await this.genericManifestSelect(manifestEntry, base, {
      data: '#data textarea',
      dataFormat: '#data select',
      // sparqlQuery: '#right textarea.query',
    });
    $('#text').empty();
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
    const db = await this.parseDataPane();
    const typed = await this.executeQuery(db, query);
    if (typed.length < 1)
      throw new TooFewResultsError(`Expected 1 result, got ${typed.length}:\n${query}`);
    if (typed.length > 1)
      throw new TooManyResultsError(`Expected 1 result, got ${typed.length}:\n${query}`);
    return typed[0];
  }

  async parseDataPane () {
    const db = new N3.Store();
    const parser = new N3.Parser({baseIRI: location.href})
    db.addQuads(parser.parse($('#data textarea').val()));
    return db;
  }

  async executeQuery (db, query) {
    const myEngine = new Comunica.QueryEngine();
    const typedStream = await myEngine.queryBindings(query, {sources: [db]});
    const rows = (await typedStream.toArray()).map(
      b => Object.fromEntries(b.entries)
    );
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
    const db = await this.parseDataPane();
    const typed = await this.executeQuery(db, $('#right textarea.query').val());
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

new Playground().init();
