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
      $('#manifest').append(
        manifest.map(item => $(`<li/>`).append(
          $(`<button/>`)
            .text(item.manifestLabel)
            .on('click', evt => this.manifestClick(this, item))
        ))
      );
      console.log(manifest)
    } catch (e) {
      console.error(e);
      document.querySelector('body').classList.add('error');
      // alert(e);
    }
  }

  async manifestClick (evt, manifestEntry) {
    const manifestKeyToInput = {
      data: '#data textarea',
      dataFormat: '#data select',
    }
    for (const [manifestKey, selector] of Object.entries(manifestKeyToInput)) {
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
    $('#text').empty();
    if ('text' in manifestEntry)
      $('#text').get(0).innerHTML = manifestEntry.text;
  }

  async getBody (url, what) {
    const resp = await fetch(url);
    const body = await resp.text();
    if (!resp.ok)
      throw Error(`Unable to fetch ${what} at <${url}>:\n${body}`);
    return body;
  }
}

new Playground().init();
