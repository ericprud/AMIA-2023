const MANIFEST = {
  param: 'manifest',
  default: 'playground/manifests/manifest.yaml'
};

class Playground {

  constructor () {
  }

  init () {
    document.addEventListener("DOMContentLoaded", this.onLoad.bind(this));
    return this;
  }

  async onLoad () {
    const params = new URLSearchParams(location.search);
    const manifestURL = params.get(MANIFEST.param) || MANIFEST.default;
    let now = '';
    try {

      now = `fetch <${manifestURL}>`;
      const body = await this.getBody(manifestURL, 'manifest');
      now = `parse manifest ${body}`;
      const manifest = Stuff.JsYaml.load(body);
      this.paintManifest(manifest, $('body > .header'), this.headerManifestSelect.bind(this));
      console.log(`Manifest <${manifestURL}>:`, manifest)
    } catch (e) {
      console.error(e);
      document.querySelector('body').classList.add('error');
      // alert(e);
    }
  }

  paintManifest (manifest, from, action) {
    from.find('.manifest').append(
      manifest.map(item => $(`<li/>`).append(
        $(`<button/>`)
          .text(item.label)
          .on('click', evt => action(evt, item))
      ))
    )
  }

  async genericManifestSelect (manifestEntry, fieldToSelector) {
    for (const [manifestKey, selector] of Object.entries(fieldToSelector)) {
      // $(selector).empty();
      const derefMe = `${manifestKey}URL`;
      if (derefMe in manifestEntry) {
        const url = manifestEntry[derefMe];
        let body = null;
        try {
          body = await this.getBody(url, manifestKey);
        } catch (e) {
          body = e;
        }
        $(selector).val(body);
      } else {
        $(selector).val(manifestEntry[manifestKey]);
      }
    }
  }

  async headerManifestSelect (evt, manifestEntry) {
    await this.genericManifestSelect(manifestEntry, {
      data: '#data textarea',
      dataFormat: '#data select',
      sparqlQuery: '#query textarea',
    });
    $('#text').empty();
    // if ('text' in manifestEntry)
    //   $('#text').get(0).innerHTML = manifestEntry.text;
    try {
      const textStuff = await this.expectOneQueryResult(`PREFIX fhir: <http://hl7.org/fhir/>
SELECT ?id ?div {
  ?resource fhir:nodeRole fhir:treeRoot ;
    fhir:id [ fhir:v ?id ] ;
    fhir:text [ fhir:div ?div ] }`);
      if (textStuff)
        $('#text').get(0).innerHTML = textStuff.div.value;
    } catch (e) {
      $('#text').append(
        $('<p/>', {"class": "error"}).text(e.message)
      );
    }

    if (!!$('#query textarea').val()) {
      $('#query button')
        .prop('disabled', false)
        .on('click', this.renderQueryResults.bind(this))
    }
    if (manifestEntry.sparqlQueries) {
      this.paintManifest(manifestEntry.sparqlQueries, $('#query > .header'), this.queryManifestSelect.bind(this));
    }
  }

  async queryManifestSelect (evt, manifestEntry) {
    await this.genericManifestSelect(manifestEntry, {
      sparqlQuery: '#query textarea',
    });
    if (!!$('#query textarea').val()) {
      $('#query button')
        .prop('disabled', false)
        .on('click', this.renderQueryResults.bind(this))
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
    if (typed.length !== 1)
      throw Error(`Expected 1 result, got ${typed.length}:\n${query}`);
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

  async renderQueryResults (evt) {
    $('#queryResults').empty();
    const db = await this.parseDataPane();
    const typed = await this.executeQuery(db, $('#query textarea').val());
    if (typed.length === 0) {
      $('#queryResults').text('no results');
    } else {
      $('#queryResults').text(`${typed.length} results`);
      const variables = Object.keys(typed[0]); // TODO: look for more elegant solution
      const heading = $('<tr/>').append('<th/>').text('#');
      heading.append(variables.map(v => $('<th/>').text(v)));
      const table = $('<table/>').append($('<thead/>').append(heading));
      $('#queryResults').append(table);
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
}

new Playground().init();
