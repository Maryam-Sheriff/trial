// Tiny HTML templating: every interpolated value is escaped unless it was
// produced by `html` or wrapped in `raw`, so content from the YAML files can
// never break the markup.

class Raw {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

export function raw(value) {
  return new Raw(String(value ?? ''));
}

function render(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(render).join('');
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += render(values[i]) + strings[i + 1];
  return new Raw(out);
}

/** Renders attributes from an object; `true` → bare attribute, null/false → omitted. */
export function attrs(map) {
  const parts = [];
  for (const [name, value] of Object.entries(map)) {
    if (value === null || value === undefined || value === false) continue;
    parts.push(value === true ? ` ${name}` : ` ${name}="${escapeHtml(value)}"`);
  }
  return raw(parts.join(''));
}

/** Replaces {placeholders} in a template string. */
export function fill(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match,
  );
}
