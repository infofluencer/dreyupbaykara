/**
 * PostgREST/supabase-js taklidi — bellekte çalışan sahte istemci.
 * Amaç: cron/pipeline kodunu gerçek veriye dokunmadan uçtan uca simüle etmek.
 *
 * Desteklenen: select/insert/update/upsert, eq/neq/in/gte/lte/is/not/or,
 * order/limit, maybeSingle/single, gömülü ilişkiler (leads!inner, contacts,
 * appointments), leads.status CHECK simülasyonu ve status history trigger'ı.
 */

let idCounter = 0;
const nextId = (prefix) => `${prefix}-${++idCounter}`;

function getPath(row, key) {
  if (!key.includes(".")) return row?.[key];
  return key.split(".").reduce((acc, part) => acc?.[part], row);
}

function cmp(a, b) {
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function parseList(raw) {
  return String(raw)
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map((v) => v.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);
}

function matches(row, filter) {
  if (filter.op === "or") return filter.terms.some((t) => matches(row, t));
  const value = getPath(row, filter.col);
  switch (filter.op) {
    case "eq":
      return value === filter.val;
    case "neq":
      return value !== filter.val;
    case "in":
      return filter.val.includes(value);
    case "gte":
      return value != null && cmp(value, filter.val) >= 0;
    case "lte":
      return value != null && cmp(value, filter.val) <= 0;
    case "is":
      return filter.val === null ? value == null : value === filter.val;
    case "not.in":
      return !filter.val.includes(value);
    case "or":
      return filter.terms.some((t) => matches(row, t));
    default:
      throw new Error(`fake-supabase: bilinmeyen filtre ${filter.op}`);
  }
}

export function createFakeSupabase(seed = {}, options = {}) {
  const db = {
    appointments: [],
    leads: [],
    contacts: [],
    lead_status_history: [],
    message_dispatches: [],
    wa_message_opt_outs: [],
    message_rules: [],
    ...structuredClone(seed),
  };

  const now = () => (options.now ? options.now() : new Date());
  /** null = kısıt yok; dizi = leads.status CHECK (migration simülasyonu) */
  const leadStatusCheck = options.leadStatusCheck ?? null;

  const stats = { queries: 0, updates: 0, inserts: 0 };

  function embed(table, rows, selectStr) {
    const s = selectStr ?? "*";
    if (table === "appointments" && /leads/.test(s)) {
      const inner = /leads!inner/.test(s);
      const wantContacts = /contacts/.test(s);
      const out = [];
      for (const row of rows) {
        const lead = db.leads.find((l) => l.id === row.lead_id) ?? null;
        if (inner && !lead) continue;
        let leads = null;
        if (lead) {
          leads = { contact_id: lead.contact_id, status: lead.status };
          if (wantContacts) {
            const c = db.contacts.find((x) => x.id === lead.contact_id) ?? null;
            leads.contacts = c
              ? { id: c.id, phone: c.phone, name: c.name }
              : null;
          }
        }
        out.push({ ...row, leads });
      }
      return out;
    }
    if (table === "message_dispatches" && /appointments\s*\(/.test(s)) {
      return rows.map((row) => {
        const appt =
          db.appointments.find((a) => a.id === row.appointment_id) ?? null;
        return { ...row, appointments: appt ? { starts_at: appt.starts_at } : null };
      });
    }
    return rows.map((row) => ({ ...row }));
  }

  function runTriggers(table, before, after) {
    if (table !== "leads") return;
    if (before.status === after.status) return;
    db.lead_status_history.push({
      id: nextId("hist"),
      lead_id: after.id,
      from_stage: before.stage ?? null,
      to_stage: after.stage ?? null,
      from_status: before.status ?? null,
      to_status: after.status ?? null,
      created_at: now().toISOString(),
    });
  }

  class Query {
    constructor(table) {
      this.table = table;
      this.filters = [];
      this.selectStr = null;
      this.orderBy = null;
      this.limitN = null;
      this.mode = "select";
      this.payload = null;
      this.onConflict = null;
      this.rowMode = null;
    }

    select(str) {
      this.selectStr = str ?? "*";
      if (this.mode === "select") this.mode = "select";
      return this;
    }
    insert(payload) {
      this.mode = "insert";
      this.payload = payload;
      return this;
    }
    update(payload) {
      this.mode = "update";
      this.payload = payload;
      return this;
    }
    upsert(payload, opts) {
      this.mode = "upsert";
      this.payload = payload;
      this.onConflict = opts?.onConflict ?? null;
      return this;
    }
    eq(col, val) {
      this.filters.push({ op: "eq", col, val });
      return this;
    }
    neq(col, val) {
      this.filters.push({ op: "neq", col, val });
      return this;
    }
    in(col, val) {
      this.filters.push({ op: "in", col, val });
      return this;
    }
    gte(col, val) {
      this.filters.push({ op: "gte", col, val });
      return this;
    }
    lte(col, val) {
      this.filters.push({ op: "lte", col, val });
      return this;
    }
    is(col, val) {
      this.filters.push({ op: "is", col, val });
      return this;
    }
    not(col, op, val) {
      if (op !== "in") throw new Error("fake-supabase: yalnızca not.in");
      this.filters.push({ op: "not.in", col, val: parseList(val) });
      return this;
    }
    or(expr) {
      const terms = expr.split(",").map((term) => {
        const [col, op, ...rest] = term.split(".");
        return { op, col, val: rest.join(".") };
      });
      this.filters.push({ op: "or", terms });
      return this;
    }
    order(col, opts) {
      this.orderBy = { col, ascending: opts?.ascending !== false };
      return this;
    }
    limit(n) {
      this.limitN = n;
      return this;
    }
    maybeSingle() {
      this.rowMode = "maybe";
      return this;
    }
    single() {
      this.rowMode = "single";
      return this;
    }

    /** Mutasyonlar için: orijinal satır referansları (gömülü ilişki yok). */
    #matching() {
      return db[this.table].filter((row) =>
        this.filters.every((f) => matches(row, f)),
      );
    }

    /** Select için: önce gömülü ilişkiler, sonra filtre (leads.status vb. çalışsın). */
    #selecting() {
      return embed(this.table, db[this.table], this.selectStr).filter((row) =>
        this.filters.every((f) => matches(row, f)),
      );
    }

    #shape(rows) {
      let out = rows;
      if (this.orderBy) {
        const { col, ascending } = this.orderBy;
        out = [...out].sort((a, b) => {
          const r = cmp(getPath(a, col), getPath(b, col));
          return ascending ? r : -r;
        });
      }
      if (this.limitN != null) out = out.slice(0, this.limitN);
      return out;
    }

    #result(rows) {
      if (this.rowMode === "maybe") return { data: rows[0] ?? null, error: null };
      if (this.rowMode === "single") {
        return rows[0]
          ? { data: rows[0], error: null }
          : { data: null, error: { message: "no rows", code: "PGRST116" } };
      }
      return { data: rows, error: null };
    }

    #checkLeadStatus(row) {
      if (this.table !== "leads" || !leadStatusCheck) return null;
      if (row.status != null && !leadStatusCheck.includes(row.status)) {
        return {
          message: `new row for relation "leads" violates check constraint "leads_status_check"`,
          code: "23514",
        };
      }
      return null;
    }

    #run() {
      stats.queries += 1;

      if (this.mode === "insert") {
        stats.inserts += 1;
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const created = [];
        for (const item of items) {
          if (this.table === "message_dispatches") {
            const dup = db.message_dispatches.find(
              (r) =>
                r.appointment_id === item.appointment_id &&
                r.rule_key === item.rule_key,
            );
            if (dup) {
              return {
                data: null,
                error: {
                  message:
                    'duplicate key value violates unique constraint "message_dispatches_appointment_rule_key"',
                  code: "23505",
                },
              };
            }
          }
          const violation = this.#checkLeadStatus(item);
          if (violation) return { data: null, error: violation };
          const row = { id: nextId(this.table), ...item };
          db[this.table].push(row);
          created.push(row);
        }
        return this.selectStr || this.rowMode
          ? this.#result(created.map((r) => ({ ...r })))
          : { data: null, error: null };
      }

      if (this.mode === "update") {
        stats.updates += 1;
        const targets = this.#matching();
        const updated = [];
        for (const row of targets) {
          const candidate = { ...row, ...this.payload };
          const violation = this.#checkLeadStatus(candidate);
          if (violation) return { data: null, error: violation };
          const before = { ...row };
          Object.assign(row, this.payload);
          runTriggers(this.table, before, row);
          updated.push({ ...row });
        }
        return this.selectStr || this.rowMode
          ? this.#result(this.#shape(embed(this.table, updated, this.selectStr)))
          : { data: null, error: null };
      }

      if (this.mode === "upsert") {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const keys = this.onConflict
          ? this.onConflict.split(",").map((k) => k.trim())
          : ["id"];
        const out = [];
        for (const item of items) {
          const existing = db[this.table].find((row) =>
            keys.every((k) => row[k] === item[k]),
          );
          if (existing) {
            const candidate = { ...existing, ...item };
            const violation = this.#checkLeadStatus(candidate);
            if (violation) return { data: null, error: violation };
            const before = { ...existing };
            Object.assign(existing, item);
            runTriggers(this.table, before, existing);
            out.push({ ...existing });
          } else {
            const violation = this.#checkLeadStatus(item);
            if (violation) return { data: null, error: violation };
            const row = { id: nextId(this.table), ...item };
            db[this.table].push(row);
            out.push({ ...row });
          }
        }
        return this.selectStr || this.rowMode
          ? this.#result(out)
          : { data: null, error: null };
      }

      return this.#result(this.#shape(this.#selecting()));
    }

    then(onFulfilled, onRejected) {
      try {
        return Promise.resolve(this.#run()).then(onFulfilled, onRejected);
      } catch (err) {
        return Promise.reject(err).then(onFulfilled, onRejected);
      }
    }
  }

  return {
    from: (table) => {
      if (!db[table]) db[table] = [];
      return new Query(table);
    },
    __db: db,
    __stats: stats,
  };
}
