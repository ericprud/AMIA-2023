const MANIFEST = {
  param: 'manifest',
  default: 'playground/manifests/manifest.yaml'
};

class Playground {

  constructor () {
  }

  init () {
    document.addEventListener("DOMContentLoaded", this.onLoad.bind(this))
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

  async genericManifestSelect (manifestEntry, manifestKeyToInput) {
    for (const [manifestKey, selector] of Object.entries(manifestKeyToInput)) {
      $(selector).empty();
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
    const manifestKeyToInput = {
      data: '#data textarea',
      dataFormat: '#data select',
      sparqlQuery: '#query textarea',
    }
    this.genericManifestSelect(manifestEntry, manifestKeyToInput);
    $('#text').empty();
    if ('text' in manifestEntry)
      $('#text').get(0).innerHTML = manifestEntry.text;
    if ($('#query textarea')) {
      $('#query button')
        .prop('disabled', false)
        .on('click', this.executeQuery.bind(this))
    }
    if (manifestEntry.sparqlQueries) {
      this.paintManifest(manifestEntry.sparqlQueries, $('#query > .header'), this.queryManifestSelect.bind(this));
    }
  }

  async queryManifestSelect (evt, manifestEntry) {
    this.genericManifestSelect(manifestEntry, {
      sparqlQuery: '#query textarea',
    });
    if ($('#query textarea')) {
      $('#query button')
        .prop('disabled', false)
        .on('click', this.executeQuery.bind(this))
    }
  }

  async getBody (url, what) {
    const resp = await fetch(url);
    const body = await resp.text();
    if (!resp.ok)
      throw Error(`Unable to fetch ${what} at <${url}>:\n${body}`);
    return body;
  }

  async executeQuery (evt) {
    $('#results').empty();
    const db = new N3.Store();
    const parser = new N3.Parser({baseIRI: location.href})
    db.addQuads(parser.parse($('#data textarea').val()));
    const myEngine = new Comunica.QueryEngine();
    const query = $('#query textarea').val();
    const typedStream = await myEngine.queryBindings(query, {sources: [db]});
    const typed = (await typedStream.toArray()).map(
      b => Object.fromEntries(b.entries)
    );
    if (typed.length === 0) {
      $('#results').text('no results');
    } else {
      $('#results').text(`${typed.length} results`);
      const variables = Object.keys(typed[0]); // TODO: look for more elegant solution
      const heading = $('<tr/>').append('<th/>').text('#');
      heading.append(variables.map(v => $('<th/>').text(v)));
      const table = $('<table/>').append($('<thead/>').append(heading));
      $('#results').append(table);
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