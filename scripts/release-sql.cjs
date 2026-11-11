// Pure SQL splitting and safety classification for release-db.cjs.
// No I/O — loaded both by the release CLI and the unit tests.

// ---------- SQL splitting ----------

// Returns statements with comments removed and no trailing semicolons.
// Handles 'str', E'str', "ident", $$..$$ and $tag$..$tag$ quoting.
function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  const push = () => {
    const s = cur.trim();
    if (s) out.push(s);
    cur = '';
  };
  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];
    if (c === '-' && c2 === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && c2 === '*') {
      i += 2;
      while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (c === "'") {
      // E'...' allows backslash escapes
      const prev = cur.trimEnd();
      const ePrefix = /[eE]$/.test(prev) && /(^|[^A-Za-z0-9_])[eE]$/.test(prev);
      cur += c;
      i++;
      while (i < n) {
        cur += sql[i];
        if (ePrefix && sql[i] === '\\') {
          cur += sql[i + 1] ?? '';
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            cur += "'";
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      cur += c;
      i++;
      while (i < n) {
        cur += sql[i];
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            cur += '"';
            i += 2;
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end === -1) {
          cur += sql.slice(i);
          i = n;
          break;
        }
        cur += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }
    if (c === ';') {
      push();
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  push();
  return out;
}

// ---------- statement classification ----------

const IDENT = '(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z0-9_$]*)';

function unquote(ident) {
  return ident.startsWith('"') ? ident.slice(1, -1).replace(/""/g, '"') : ident;
}

// Parses "name" or "schema.name" at the start of s. Returns {schema,name,rest} or null.
function parseQName(s) {
  const re = new RegExp(`^\\s*(${IDENT})(\\s*\\.\\s*(${IDENT}))?`);
  const m = re.exec(s);
  if (!m) return null;
  const name = unquote(m[3] ?? m[1]);
  const schema = m[3] ? unquote(m[1]) : 'public';
  return { schema, name, rest: s.slice(m[0].length) };
}

function isPublic(q) {
  return q != null && q.schema === 'public';
}

// Split comma-separated items at top level (respecting quotes and parens).
function splitTopLevel(s, sep = ',') {
  const parts = [];
  let cur = '';
  let depth = 0;
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'") {
      cur += c;
      i++;
      while (i < s.length) {
        cur += s[i];
        if (s[i] === "'" && s[i + 1] === "'") {
          cur += "'";
          i += 2;
          continue;
        }
        if (s[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '"') {
      cur += c;
      i++;
      while (i < s.length) {
        cur += s[i];
        if (s[i] === '"' && s[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        if (s[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    if (c === sep && depth === 0) {
      parts.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  parts.push(cur);
  return parts;
}

const BUILTIN_TYPES = new RegExp(
  '^\\s*(' +
    [
      'TEXT',
      '(?:VAR)?CHAR(?:ACTER(?:\\s+VARYING)?)?\\s*\\(\\s*\\d+\\s*\\)',
      'INT(?:EGER|2|4|8)?',
      'SMALLINT',
      'BIGINT',
      'SERIAL\\d*',
      'BIGSERIAL',
      'BOOL(?:EAN)?',
      'REAL',
      'FLOAT\\d*',
      'DOUBLE\\s+PRECISION',
      'NUMERIC(?:\\s*\\(\\s*\\d+\\s*(?:,\\s*\\d+\\s*)?\\))?',
      'DECIMAL(?:\\s*\\(\\s*\\d+\\s*(?:,\\s*\\d+\\s*)?\\))?',
      'MONEY',
      'DATE',
      'TIME(?:\\s*\\(\\s*\\d+\\s*\\))?(?:\\s+(?:WITH|WITHOUT)\\s+TIME\\s+ZONE)?',
      'TIMESTAMP(?:\\s*\\(\\s*\\d+\\s*\\))?(?:\\s+(?:WITH|WITHOUT)\\s+TIME\\s+ZONE)?',
      'TIMESTAMPTZ',
      'INTERVAL',
      'JSONB?',
      'UUID',
      'BYTEA',
      'INET',
      'CIDR',
      'MACADDR',
    ].join('|') +
    ')(\\s*\\[\\s*\\])?\\s*$',
  'i'
);

const FORBIDDEN_COLUMN_TAIL =
  /\b(NOT\s+NULL|DEFAULT|UNIQUE|PRIMARY\s+KEY|REFERENCES|CHECK|GENERATED|CONSTRAINT|EXCLUDE|DEFERRABLE|ON\s+(?:UPDATE|DELETE)\s+CASCADE)\b/i;

function classify(stmt, ctx) {
  const s = stmt.trim();

  // CREATE SCHEMA IF NOT EXISTS public — only that exact form.
  let m = /^CREATE\s+SCHEMA\s+(.+)$/is.exec(s);
  if (m) {
    return /^IF\s+NOT\s+EXISTS\s+("public"|public)\s*$/i.test(m[1].trim())
      ? 'allow'
      : `deny: schema change not allowed: ${s.slice(0, 80)}`;
  }

  // CREATE TYPE name AS ENUM (...)
  m = /^CREATE\s+TYPE\s+/i.exec(s);
  if (m) {
    const q = parseQName(s.slice(m[0].length));
    if (!isPublic(q)) return 'deny: type outside public schema';
    if (!/^\s*AS\s+ENUM\s*\(/i.test(q.rest)) return `deny: not an enum creation: ${s.slice(0, 80)}`;
    ctx.newEnums.add(q.name);
    return 'allow';
  }

  // CREATE TABLE name (...)
  m = /^CREATE\s+TABLE\s+/i.exec(s);
  if (m) {
    let rest = s.slice(m[0].length);
    const ifne = /^IF\s+NOT\s+EXISTS\s+/i.exec(rest);
    if (ifne) rest = rest.slice(ifne[0].length);
    const q = parseQName(rest);
    if (!isPublic(q)) return 'deny: table outside public schema';
    if (/\bAS\b/i.test(q.rest)) return 'deny: CREATE TABLE AS is not allowed';
    if (/\b(INHERITS|PARTITION\s+BY|LIKE)\b/i.test(q.rest))
      return 'deny: table feature not allowed';
    ctx.newTables.add(q.name);
    return 'allow';
  }

  // CREATE [UNIQUE] INDEX ... ON table (cols)
  m = /^CREATE\s+(UNIQUE\s+)?INDEX\s+/i.exec(s);
  if (m) {
    let rest = s.slice(m[0].length);
    if (/^CONCURRENTLY\b/i.test(rest)) return 'deny: CREATE INDEX CONCURRENTLY';
    const ifne = /^IF\s+NOT\s+EXISTS\s+/i.exec(rest);
    if (ifne) rest = rest.slice(ifne[0].length);
    const idxName = new RegExp(`^${IDENT}`).exec(rest.trim());
    if (!idxName) return 'deny: unparseable index name';
    rest = rest.trim().slice(idxName[0].length);
    const on = /^\s+ON\s+/i.exec(rest);
    if (!on) return 'deny: index without ON';
    let t = rest.slice(on[0].length);
    const only = /^ONLY\s+/i.exec(t);
    if (only) t = t.slice(only[0].length);
    const q = parseQName(t);
    if (!isPublic(q)) return 'deny: index on table outside public schema';
    rest = q.rest;
    const using = /^\s+USING\s+(\w+)/i.exec(rest);
    if (using) {
      if (using[1].toLowerCase() !== 'btree') return `deny: index method ${using[1]}`;
      rest = rest.slice(using[0].length);
    }
    if (/^\s+WHERE\b/i.test(rest)) return 'deny: partial index';
    const cols = /^\s*\((.*)\)\s*$/is.exec(rest);
    if (!cols) return 'deny: unparseable index columns';
    for (const col of splitTopLevel(cols[1])) {
      const ok = new RegExp(
        `^\\s*${IDENT}(\\s+(ASC|DESC))?(\\s+NULLS\\s+(FIRST|LAST))?(\\s+(ASC|DESC)\\s+NULLS\\s+(FIRST|LAST))?\\s*$`,
        'i'
      ).test(col);
      if (!ok) return `deny: index column not a plain field: ${col.trim().slice(0, 60)}`;
    }
    if (m[1] && !ctx.newTables.has(q.name)) return 'deny: unique index on a pre-existing table';
    return 'allow';
  }

  // ALTER TABLE name <op>[, <op>...]
  m = /^ALTER\s+TABLE\s+/i.exec(s);
  if (m) {
    let rest = s.slice(m[0].length);
    const ife = /^IF\s+EXISTS\s+/i.exec(rest);
    if (ife) rest = rest.slice(ife[0].length);
    const only = /^ONLY\s+/i.exec(rest);
    if (only) rest = rest.slice(only[0].length);
    const q = parseQName(rest);
    if (!isPublic(q)) return 'deny: table outside public schema';
    const ops = splitTopLevel(q.rest);
    for (const op of ops) {
      const r = classifyAlterOp(op.trim(), q, ctx);
      if (r !== 'allow') return r;
    }
    return 'allow';
  }

  return `deny: unrecognized statement: ${s.slice(0, 80)}`;
}

function classifyAlterOp(op, table, ctx) {
  // ADD [COLUMN] name TYPE  — nullable, no default, no constraints
  let m = /^ADD\s+(?:COLUMN\s+)?(IF\s+NOT\s+EXISTS\s+)?/i.exec(op);
  if (m && !/^ADD\s+(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|EXCLUDE)\b/i.test(op)) {
    let rest = op.slice(m[0].length);
    const col = new RegExp(`^(${IDENT})\\s+`).exec(rest.trim());
    if (!col) return `deny: unparseable ADD COLUMN: ${op.slice(0, 60)}`;
    const tail = rest.trim().slice(col[0].length).trim();
    if (FORBIDDEN_COLUMN_TAIL.test(tail))
      return `deny: new column has a constraint or default: ${op.slice(0, 60)}`;
    const typeOk =
      BUILTIN_TYPES.test(tail) || ctx.newEnums.has(unquote(tail.replace(/\[\]$/, '').trim()));
    if (!typeOk) return `deny: unrecognized column type in: ${op.slice(0, 60)}`;
    return 'allow';
  }

  // ADD [CONSTRAINT name] PRIMARY KEY|UNIQUE|FOREIGN KEY — only on new tables
  m = /^ADD\s+(?:CONSTRAINT\s+)?/i.exec(op);
  if (m) {
    let rest = op.slice(m[0].length).trim();
    const named = new RegExp(`^(${IDENT})\\s+`).exec(rest);
    // constraint name optional for PRIMARY KEY/FOREIGN KEY keywords
    const body = /^PRIMARY\s+KEY|^UNIQUE|^FOREIGN\s+KEY|^CHECK|^EXCLUDE/i.test(rest)
      ? rest
      : named
        ? rest.slice(named[0].length).trim()
        : rest;
    if (/^(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY)\b/i.test(body)) {
      if (!ctx.newTables.has(table.name))
        return `deny: constraint added to pre-existing table ${table.name}`;
      return 'allow';
    }
    return `deny: constraint kind not allowed: ${op.slice(0, 60)}`;
  }

  return `deny: ALTER TABLE operation not allowed: ${op.slice(0, 60)}`;
}

function analyzeSql(sqlText) {
  const statements = splitSql(sqlText);
  if (statements.length === 0) return { ok: false, reason: 'diff produced no statements' };
  const ctx = { newTables: new Set(), newEnums: new Set() };
  for (const s of statements) {
    const r = classify(s, ctx);
    if (r !== 'allow') return { ok: false, reason: `${r}\n  in: ${s.slice(0, 120)}` };
  }
  return { ok: true, statements: statements.length };
}

module.exports = { splitSql, analyzeSql };
