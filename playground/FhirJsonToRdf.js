class FhirJsonToRdf {

  static parseDateType (x) {
    const m = x.match(/([0-9]([0-9]([0-9][1-9]|[1-9]0)|[1-9]00)|[1-9]000)(-(0[1-9]|1[0-2])(-(0[1-9]|[1-2][0-9]|3[0-1])(T([01][0-9]|2[0-3]):[0-5][0-9]:([0-5][0-9]|60)(\.[0-9]{1,9})?)?)?(Z|(\+|-)((0[0-9]|1[0-3]):[0-5][0-9]|14:00)?)?)?/);
    return m[4]
      ? 'dateTime'
      : m[3]
      ? 'date'
      : m[2]
      ? 'gYearMonth'
      : 'gYear'
  }

  static Types = {
    anyURI  : { label: 'anyURI'  ,                                         },
    dateTime: { label: 'dateTime', microparse: FhirJsonToRdf.parseDateType },
    date    : { label: 'date'    , microparse: FhirJsonToRdf.parseDateType },
  }
  static Typed = {
    lastUpdated: FhirJsonToRdf.Types.dateTime,
    effectiveDateTime: FhirJsonToRdf.Types.dateTime,
    issued: FhirJsonToRdf.Types.dateTime,
    source: FhirJsonToRdf.Types.anyURI,
    system: FhirJsonToRdf.Types.anyURI,
  };

  static Ns = {
    fhir: 'http://hl7.org/fhir/',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
  }

  static SystemBases = {
    'http://terminology.hl7.org/CodeSystem/observation-category': 'http://terminology.hl7.org/CodeSystem/observation-category/',
    'http://loinc.org': 'http://loinc.org/rdf#',
    'http://snomed.info/sct': 'http://snomed.info/id/',
  }

  prettyPrint (resource) {
    const root = resource.id
          ? `<${resource.id}>`
          : '[]';
    const namespacePrefixes = new Set(['fhir', 'xsd']);

    // PREFIXes
    const out = [];
    for (const p of namespacePrefixes) {
      out.push(`PREFIX ${p}: <${FhirJsonToRdf.Ns[p]}>`)
    }
    out.push('');

    // node, type, nodeRole
    const skips = new Set(['resourceType']); // handled here
    out.push(`${root} a fhir:${resource.resourceType};`)
    out.push(`  fhir:nodeRole fhir:treeRoot;`)

    const types = [];
    Array.prototype.push.apply(out, this.visit('  ', resource, skips, true, types))
    if (Object.keys(types.length)) {
      out.push('');
      out.push('# Triples not in FHIR Resource:');
      Array.prototype.push.apply(out, Object.values(types))
    }

    return out.map(l => l + '\n').join('');
  }

  visit (leader, obj, skips, outer, types) {
    const ret = [];
    const entries = Object.entries(obj);
    for (const entryNo in entries) {
      const [key, value] = entries[entryNo];
      const punct = entryNo < entries.length - 1
            ? ';'
            : outer
            ? '.'
            : '';
      if (skips.has(key)) {
        // skip it
      } else if (typeof value === 'boolean' || typeof value === 'number') {
        ret.push(`${leader}fhir:value [ fhir:v ${value} ]${punct}`)
      } else if (typeof value === 'string') {
        if (key === 'system') {
          const base = FhirJsonToRdf.SystemBases[value];
          if (base)
            ret.push(`${leader}a <${base}${obj.code}>;`)
        } else if (key === 'reference') {
          if (!(value in types))
            types[value] = `<../${value}> a fhir:${value.substring(0, value.indexOf('/'))}.`
          ret.push(`${leader}fhir:link <../${value}>;`)
        }
        let valueStr = null;
        const typed = FhirJsonToRdf.Typed[key];
        if (!typed) {
          valueStr = this.quote(value);
        } else {
          const dt = typed.microparse
                ? typed.microparse(value)
                : typed.label
          valueStr = this.quote(value) + '^^xsd:' + dt;
        }
        ret.push(`${leader}fhir:${key} [ fhir:v ${valueStr} ]${punct}`)
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; ++i) {
          if (typeof value[i] === 'string') {
            if (i === 0)
              ret.push(`${leader}fhir:${key} (`);
            ret.push(`${leader}  [ fhir:v ${this.quote(value[i])} ]`)
            if (i === value.length - 1)
              ret.push(`${leader})${punct}`);
          } else {
            ret.push(i === 0 ? `${leader}fhir:${key} ( [` : `${leader}[`)
            Array.prototype.push.apply(ret, this.visit(leader + '  ', value[i], skips, false, types));
            ret.push(i < value.length - 1 ? `${leader}]` : `${leader}] )${punct}`)
          }
        }
      } else if (typeof value === 'object') {
        ret.push(`${leader}fhir:${key} [`)
        Array.prototype.push.apply(ret, this.visit(leader + '  ', value, skips, false, types));
        ret.push(`${leader}]${punct}`)
      } else { throw Error(`visit not expecting ${JSON.stringify(value)}`); }
    }
    return ret;
  }

  quote (str) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\"/g, '\\"') + '"';
  }
}

if (typeof module !== undefined)
  module.exports = {FhirJsonToRdf};
