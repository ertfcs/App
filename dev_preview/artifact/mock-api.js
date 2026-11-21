/* In-page stand-in for the app's backend, used by the private preview link.
 * Answers /api/* requests (XMLHttpRequest and fetch) from data.json, a snapshot
 * of the real server, and reproduces the server's rules for quotes, bookings,
 * approvals, availability, prices, discount codes, guest questions, stats and
 * accounting. Every change is recorded in localStorage and replayed on load,
 * so it stays in this browser only. Nothing is sent to anyone (no WhatsApp,
 * no e-mail); AI features need the real server. */
(function () {
  var BASE = window.__PREVIEW_BASE__;
  var LOG_KEY = "am_preview_ops_v2";
  var NO_SERVER = "Nella versione in chat questa funzione non è disponibile (serve il server: AI, upload, PDF).";
  var DB = null;

  // ---------- recorded randomness / time, so replays give identical results ----------
  var rec = null; // array being recorded (live) or consumed (replay)
  var replaying = false;
  function gen(make) {
    if (replaying) return rec.length ? rec.shift() : make();
    var v = make();
    if (rec) rec.push(v);
    return v;
  }
  function uid() {
    return gen(function () {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 3) | 8).toString(16);
      });
    });
  }
  function nowIso() { return gen(function () { return new Date().toISOString(); }); }
  function code8() {
    return gen(function () {
      var a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", s = "";
      for (var i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)];
      return s;
    });
  }
  function today() { return nowIso().slice(0, 10); }

  function readOps() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch (e) { return []; } }
  function saveOp(op) { try { var o = readOps(); o.push(op); localStorage.setItem(LOG_KEY, JSON.stringify(o)); } catch (e) {} }

  var ready = fetch(BASE + "data.json").then(function (r) { return r.json(); }).then(function (snap) {
    DB = {};
    Object.keys(snap).forEach(function (k) { DB[k] = snap[k].body; });
    if (!Array.isArray(DB["/api/prices"])) DB["/api/prices"] = [];
    if (!Array.isArray(DB["/api/bookings"])) DB["/api/bookings"] = [];
    if (!Array.isArray(DB["/api/custom-fees"])) DB["/api/custom-fees"] = [];
    if (!Array.isArray(DB["/api/discount-codes"])) DB["/api/discount-codes"] = [];
    if (!DB["/api/admin/guest-questions"]) DB["/api/admin/guest-questions"] = { questions: [], counts: {} };
    replaying = true;
    readOps().forEach(function (op) {
      rec = (op.r || []).slice();
      try { route(op.m, op.p, op.b); } catch (e) {}
    });
    replaying = false;
    rec = null;
  });

  // ---------- helpers ----------
  function listOf(body) {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") for (var k in body) if (Array.isArray(body[k])) return body[k];
    return null;
  }
  function keysFor(path) { return Object.keys(DB).filter(function (k) { return k === path || k.indexOf(path + "?") === 0; }); }
  function err(status, detail) { var e = new Error(detail); e.status = status; e.detail = detail; throw e; }
  function r2(x) { return Math.round(x * 100) / 100; }
  function days(ci, co) {
    var out = [], d = new Date(ci + "T00:00:00Z"), end = new Date(co + "T00:00:00Z");
    while (d < end) { out.push(d.toISOString().slice(0, 10)); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  }
  function bookings() { return DB["/api/bookings"]; }
  function questions() { return DB["/api/admin/guest-questions"].questions; }
  function fees() {
    return Object.assign({ base_price_per_night: 80, base_booking_price_per_night: 95, base_guests: 2, extra_person_per_night: 15,
      ac_per_night: 5, tourist_tax_per_person_per_night: 2, cleaning_fee: 40, booking_url: "" }, DB["/api/fees"] || {});
  }
  function blocked(skipId) {
    var s = {};
    bookings().forEach(function (b) {
      if (b.status !== "approved" || b.id === skipId) return;
      days(b.check_in, b.check_out).forEach(function (d) { s[d] = true; });
    });
    return s;
  }
  function priceMaps() {
    var p = {}, bp = {};
    DB["/api/prices"].forEach(function (o) {
      if (o.price != null) p[o.date] = o.price;
      if (o.booking_price != null) bp[o.date] = o.booking_price;
    });
    return { p: p, bp: bp };
  }
  function findBooking(id) { var b = bookings().filter(function (x) { return x.id === id; })[0]; if (!b) err(404, "Prenotazione non trovata"); return b; }
  function findQuestion(id) { var q = questions().filter(function (x) { return x.id === id; })[0]; if (!q) err(404, "Domanda non trovata"); return q; }

  // ---------- server rules (ported from backend/server.py) ----------
  function quote(b) {
    if (!b || !b.check_in || !b.check_out || b.check_out <= b.check_in) err(400, "Date non valide");
    var f = fees(), pm = priceMaps(), list = days(b.check_in, b.check_out), nights = list.length;
    var guests = Number(b.guests) || 1, nt = 0, bnt = 0;
    list.forEach(function (d) {
      nt += d in pm.p ? pm.p[d] : f.base_price_per_night;
      bnt += d in pm.bp ? pm.bp[d] : (f.base_booking_price_per_night || 0);
    });
    var extraGuestFees = Math.max(0, guests - f.base_guests) * f.extra_person_per_night * nights;
    var ac = b.extras && b.extras.ac ? f.ac_per_night * nights : 0;
    var tax = f.tourist_tax_per_person_per_night * guests * nights;
    var cleaning = f.cleaning_fee, cfTotal = 0, cfList = [];
    DB["/api/custom-fees"].forEach(function (cf) {
      var cost = cf.mode === "per_night" ? cf.amount * nights : cf.amount;
      cfTotal += cost;
      cfList.push({ name: cf.name, amount: cf.amount, mode: cf.mode, cost: r2(cost) });
    });
    var subtotal = nt + extraGuestFees + ac + cleaning + cfTotal, disc = 0, discInfo = null;
    if (b.discount_code) {
      var t = today(), c = String(b.discount_code).toUpperCase();
      var dc = DB["/api/discount-codes"].filter(function (x) { return x.code === c && x.active && x.type !== "ai_access"; })[0];
      if (dc && dc.percent && dc.valid_from <= t && t <= dc.valid_to) {
        disc = r2(subtotal * dc.percent / 100);
        discInfo = { code: dc.code, percent: dc.percent };
      }
    }
    var total = subtotal - disc + tax;
    var bSub = bnt + extraGuestFees + ac + cleaning + cfTotal;
    var bTotal = bnt > 0 ? bSub + tax : 0;
    return {
      nights: nights, nightly_total: r2(nt), booking_nightly_total: r2(bnt), extra_guest_fees: r2(extraGuestFees),
      ac_fee: r2(ac), cleaning_fee: r2(cleaning), custom_fees: cfList, custom_fees_total: r2(cfTotal), tourist_tax: r2(tax),
      subtotal: r2(subtotal), discount_amount: r2(disc), discount_info: discInfo, total: r2(total),
      booking_total: r2(bTotal), savings: bTotal > 0 ? r2(bTotal - total) : 0,
    };
  }

  function availability() {
    var f = fees(), pm = priceMaps();
    return { blocked_dates: Object.keys(blocked()).sort(), prices: pm.p, booking_prices: pm.bp,
      base_price: f.base_price_per_night, base_booking_price: f.base_booking_price_per_night || 0, booking_url: f.booking_url || "" };
  }

  function stats() {
    var s = DB["/api/admin/stats"] || {}, bs = bookings();
    var count = function (fn) { return bs.filter(fn).length; };
    var visits = s.total_visits || 0, approved = count(function (b) { return b.status === "approved"; });
    return {
      total_visits: visits, total_bookings: bs.length, approved_bookings: approved,
      pending_bookings: count(function (b) { return b.status === "pending"; }),
      rejected_bookings: count(function (b) { return b.status === "rejected"; }),
      site_bookings: count(function (b) { return b.source === "site"; }),
      booking_com_bookings: count(function (b) { return b.source === "booking"; }),
      conversion_rate: visits ? r2(approved / visits * 100) : 0, daily_visits: s.daily_visits || [],
    };
  }

  function accounting() {
    var rates = Object.assign({ state_pct: 21, booking_pct: 15, vat_pct: 3.7, bank_pct: 1.5 }, DB["/api/admin/commission-rates"] || {});
    var T = { gross_total: 0, net_total: 0, commissions_total: 0, site_gross: 0, site_net: 0, booking_gross: 0, booking_net: 0,
      by_commission: { state: 0, booking: 0, vat: 0, bank: 0 } };
    var items = bookings().filter(function (b) { return b.status === "approved"; })
      .sort(function (a, b) { return a.check_in < b.check_in ? -1 : 1; })
      .map(function (b) {
        var g = Number((b.quote || {}).total) || 0, src = b.source || "site";
        var bd = { gross: r2(g), state: 0, booking: 0, vat: 0, bank: 0, total_commissions: 0, net: r2(g) };
        if (src === "booking") {
          var st = g * rates.state_pct / 100, bk = g * rates.booking_pct / 100, va = g * rates.vat_pct / 100, ba = g * rates.bank_pct / 100;
          var tc = st + bk + va + ba;
          bd = { gross: r2(g), state: r2(st), booking: r2(bk), vat: r2(va), bank: r2(ba), total_commissions: r2(tc), net: r2(g - tc),
            rates: { state_pct: rates.state_pct, booking_pct: rates.booking_pct, vat_pct: rates.vat_pct, bank_pct: rates.bank_pct } };
          T.booking_gross += bd.gross; T.booking_net += bd.net;
          T.by_commission.state += bd.state; T.by_commission.booking += bd.booking; T.by_commission.vat += bd.vat; T.by_commission.bank += bd.bank;
        } else { T.site_gross += bd.gross; T.site_net += bd.net; }
        T.gross_total += bd.gross; T.net_total += bd.net; T.commissions_total += bd.total_commissions;
        return { id: b.id, guest_name: b.guest_name, check_in: b.check_in, check_out: b.check_out, source: src,
          status: b.status, confirmation_code: b.confirmation_code, breakdown: bd };
      });
    Object.keys(T).forEach(function (k) {
      if (typeof T[k] === "object") Object.keys(T[k]).forEach(function (kk) { T[k][kk] = r2(T[k][kk]); });
      else T[k] = r2(T[k]);
    });
    return { rates: rates, items: items, totals: T };
  }

  function threadView(q) {
    var t = (q.thread || []).slice();
    if (!t.length) {
      t = [{ from: "guest", text: q.message || "", at: q.created_at }];
      if (q.answer) t.push({ from: "host", text: q.answer, at: q.answered_at });
    }
    return { id: q.id, name: q.name, status: q.status, created_at: q.created_at, thread: t };
  }
  function appendReply(id, who, text) {
    text = String(text || "").trim().slice(0, 4000);
    if (!text) err(400, "Messaggio vuoto");
    var q = findQuestion(id), tv = threadView(q);
    q.thread = tv.thread.concat([{ from: who, text: text, at: nowIso() }]);
    q.status = who === "host" ? "answered" : "open";
    if (who === "host") { q.answer = text; q.answered_at = nowIso(); }
    return threadView(q);
  }
  function guestQuestionsView() {
    var qs = questions().slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
    var c = function (s) { return qs.filter(function (q) { return q.status === s; }).length; };
    return { questions: qs, counts: { open: c("open"), answered: c("answered"), closed: c("closed") } };
  }

  // ---------- generic create / update / delete on snapshot lists ----------
  function generic(method, path, body) {
    var parts = path.split("/"), last = parts[parts.length - 1], parent = parts.slice(0, -1).join("/");
    if (method === "POST") {
      var ks = keysFor(path).filter(function (k) { return listOf(DB[k]); });
      if (!ks.length) return null;
      var item = Object.assign({ id: uid(), created_at: nowIso() }, body || {});
      ks.forEach(function (k) { listOf(DB[k]).unshift(item); });
      return item;
    }
    if (method === "PUT" || method === "PATCH") {
      var hit = null;
      keysFor(parent).forEach(function (k) {
        var l = listOf(DB[k]);
        if (l) l.forEach(function (it, i) { if (it && it.id === last) { l[i] = Object.assign({}, it, body || {}); hit = l[i]; } });
      });
      if (hit) return hit;
      if (DB[path] && !Array.isArray(DB[path]) && typeof DB[path] === "object") { DB[path] = Object.assign({}, DB[path], body || {}); return DB[path]; }
      return null;
    }
    if (method === "DELETE") {
      var removed = false;
      keysFor(parent).forEach(function (k) {
        var l = listOf(DB[k]);
        if (l) for (var i = l.length - 1; i >= 0; i--) if (l[i] && l[i].id === last) { l.splice(i, 1); removed = true; }
      });
      return removed ? { ok: true } : null;
    }
    return null;
  }

  function getAny(path, full) {
    if (full in DB) return DB[full];
    if (path in DB) return DB[path];
    var pre = keysFor(path)[0];
    if (pre) return DB[pre];
    var parts = path.split("/"), id = parts.pop(), parent = parts.join("/"), found;
    keysFor(parent).forEach(function (k) { var l = listOf(DB[k]); if (l) l.forEach(function (it) { if (it && it.id === id) found = it; }); });
    if (found) return found;
    err(404, NO_SERVER);
  }

  // ---------- router: returns the response body or throws err(status, detail) ----------
  function route(method, path, body, full) {
    var m;
    if (method === "GET") {
      if (path === "/api/availability") return availability();
      if (path === "/api/gallery-photos") return DB["/api/private-photos"] || [];
      if (path === "/api/admin/stats") return stats();
      if (path === "/api/admin/accounting") return accounting();
      if (path === "/api/bookings") return bookings().slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; });
      if (path === "/api/prices") return DB["/api/prices"];
      if (path === "/api/admin/guest-questions") return guestQuestionsView();
      if ((m = path.match(/^\/api\/guest-questions\/([^/]+)$/))) return threadView(findQuestion(m[1]));
      if ((m = path.match(/^\/api\/discount-codes\/validate\/(.+)$/))) {
        var c = decodeURIComponent(m[1]).toUpperCase(), t = today();
        var dc = DB["/api/discount-codes"].filter(function (x) { return x.code === c && x.active && (x.type || "discount") === "discount"; })[0];
        if (!dc) err(404, "Codice non valido");
        if (dc.valid_from > t || dc.valid_to < t) err(400, "Codice scaduto o non ancora attivo");
        return dc;
      }
      return getAny(path, full || path);
    }
    if (path === "/api/auth/login") {
      if (body && body.username === "Matteo" && body.password === "D5230") return { token: "preview-token", access_token: "preview-token", username: "Matteo" };
      err(401, "Credenziali non valide");
    }
    if (path === "/api/track/visit") return { ok: true };
    if (path === "/api/verify-code") {
      var code = String((body && body.code) || "").trim().toUpperCase();
      if (!code) err(400, "Codice mancante");
      var bk = bookings().filter(function (b) { return b.confirmation_code === code && b.status === "approved"; })[0];
      if (bk) return { valid: true, kind: "booking", guest_name: bk.guest_name, check_in: bk.check_in, check_out: bk.check_out };
      var td = today();
      var ai = DB["/api/discount-codes"].filter(function (x) { return x.code === code && x.active && x.type === "ai_access" && x.valid_from <= td && td <= x.valid_to; })[0];
      if (ai) return { valid: true, kind: "ai_access" };
      err(403, "Codice non valido o scaduto.");
    }
    if (path === "/api/quote" && method === "POST") return quote(body);
    if (path === "/api/bookings" && method === "POST") {
      if (!body || !String(body.guest_phone || "").trim()) err(400, "Il numero di telefono è obbligatorio");
      if (!body.check_in || !body.check_out || body.check_out <= body.check_in) err(400, "Date non valide");
      var bl = blocked();
      days(body.check_in, body.check_out).forEach(function (d) { if (bl[d]) err(400, "Data " + d + " non disponibile"); });
      var doc = { id: uid(), guest_name: body.guest_name, guest_email: body.guest_email, guest_phone: body.guest_phone,
        check_in: body.check_in, check_out: body.check_out, guests: body.guests, extras: body.extras || {},
        discount_code: body.discount_code || null, message: body.message || null, quote: quote(body), source: "site",
        status: "pending", confirmation_code: null, created_at: nowIso() };
      bookings().unshift(doc);
      return doc;
    }
    if (path === "/api/admin/bookings/manual" && method === "POST") {
      if (["site", "booking"].indexOf(body.source) < 0) err(400, "Sorgente non valida (usa 'site' o 'booking')");
      if (["pending", "approved", "rejected"].indexOf(body.status) < 0) err(400, "Stato non valido");
      if (!body.check_in || !body.check_out || body.check_out <= body.check_in) err(400, "Date non valide");
      var nights = days(body.check_in, body.check_out).length;
      if (body.status === "approved") {
        var bl2 = blocked();
        days(body.check_in, body.check_out).forEach(function (d) { if (bl2[d]) err(400, "Conflitto: la data " + d + " è già occupata da un'altra prenotazione approvata"); });
      }
      var created = nowIso();
      var md = { id: uid(), guest_name: body.guest_name, guest_email: body.guest_email || "", guest_phone: body.guest_phone,
        check_in: body.check_in, check_out: body.check_out, guests: body.guests, extras: {}, discount_code: null,
        message: body.notes, quote: { total: Number(body.total_amount) || 0, nights: nights, manual: true }, source: body.source,
        status: body.status, confirmation_code: body.status === "approved" ? code8() : null, manual: true,
        created_at: created, approved_at: body.status === "approved" ? created : null };
      bookings().unshift(md);
      return md;
    }
    if ((m = path.match(/^\/api\/bookings\/([^/]+)\/approve$/))) {
      var b1 = findBooking(m[1]), bl3 = blocked(b1.id);
      days(b1.check_in, b1.check_out).forEach(function (d) { if (bl3[d]) err(400, "Conflitto: la data " + d + " è già occupata da un'altra prenotazione approvata"); });
      b1.confirmation_code = b1.confirmation_code || code8();
      b1.status = "approved"; b1.approved_at = nowIso();
      return { ok: true, confirmation_code: b1.confirmation_code };
    }
    if ((m = path.match(/^\/api\/bookings\/([^/]+)\/reject$/))) {
      var b2 = findBooking(m[1]); b2.status = "rejected"; b2.rejected_at = nowIso();
      return { ok: true };
    }
    if ((m = path.match(/^\/api\/bookings\/([^/]+)$/)) && method === "DELETE") {
      findBooking(m[1]);
      DB["/api/bookings"] = bookings().filter(function (b) { return b.id !== m[1]; });
      return { ok: true };
    }
    if (path === "/api/prices/bulk") {
      var dates = (body && body.dates) || [];
      if (method === "DELETE") {
        var before = DB["/api/prices"].length;
        DB["/api/prices"] = DB["/api/prices"].filter(function (o) { return dates.indexOf(o.date) < 0; });
        return { deleted: before - DB["/api/prices"].length };
      }
      if (!dates.length) return { updated: 0 };
      if (body.price == null && body.booking_price == null) err(400, "Specifica almeno un prezzo");
      dates.forEach(function (d) {
        var o = DB["/api/prices"].filter(function (x) { return x.date === d; })[0];
        if (!o) { o = { date: d }; DB["/api/prices"].push(o); }
        if (body.price != null) o.price = body.price;
        if (body.booking_price != null) o.booking_price = body.booking_price;
      });
      return { updated: dates.length };
    }
    if (path === "/api/discount-codes" && method === "POST") {
      var cc = String(body.code || "").trim().toUpperCase(), type = body.type || "discount";
      if (!cc) err(400, "Codice non valido");
      if (type !== "discount" && type !== "ai_access") err(400, "Tipo non valido");
      if (type === "discount" && !(body.percent > 0)) err(400, "Percentuale obbligatoria per i codici sconto");
      if (body.valid_from > body.valid_to) err(400, "Date non valide");
      if (DB["/api/discount-codes"].some(function (x) { return x.code === cc; })) err(400, "Codice già esistente");
      var nd = { id: uid(), code: cc, type: type, percent: type === "discount" ? body.percent : null, valid_from: body.valid_from,
        valid_to: body.valid_to, active: body.active !== false, created_at: nowIso() };
      DB["/api/discount-codes"].unshift(nd);
      return nd;
    }
    if (path === "/api/discount-codes/expired" && method === "DELETE") {
      var t2 = today(), n0 = DB["/api/discount-codes"].length;
      DB["/api/discount-codes"] = DB["/api/discount-codes"].filter(function (x) { return x.valid_to >= t2; });
      return { deleted: n0 - DB["/api/discount-codes"].length };
    }
    if (path === "/api/guest-questions" && method === "POST") {
      if (!body || !String(body.name || "").trim() || !String(body.message || "").trim() || !String(body.contact || "").trim()) err(400, "Campi obbligatori mancanti");
      var gq = { id: uid(), name: body.name.trim().slice(0, 120), contact: body.contact.trim().slice(0, 200),
        contact_kind: (body.contact_kind || "email").toLowerCase(), message: body.message.trim().slice(0, 4000),
        language: body.language || "it", status: "open", answer: null, created_at: nowIso(), answered_at: null, promoted_to_faq_id: null };
      questions().unshift(gq);
      return { ok: true, id: gq.id };
    }
    if ((m = path.match(/^\/api\/guest-questions\/([^/]+)\/reply$/))) return appendReply(m[1], "guest", body && body.text);
    if ((m = path.match(/^\/api\/admin\/guest-questions\/([^/]+)\/reply$/))) return appendReply(m[1], "host", body && body.text);
    if ((m = path.match(/^\/api\/admin\/guest-questions\/([^/]+)$/)) && method === "PATCH") {
      var q = findQuestion(m[1]);
      if (body.status) {
        if (["open", "answered", "closed"].indexOf(body.status) < 0) err(400, "Status non valido");
        q.status = body.status;
        if (body.status === "answered") q.answered_at = nowIso();
      }
      if (body.answer != null) q.answer = body.answer;
      return { ok: true };
    }
    var g = generic(method, path, body);
    if (g) return g;
    err(503, NO_SERVER);
  }

  function handle(method, url, bodyText) {
    var u = new URL(url, location.href), body = null;
    try { body = bodyText ? JSON.parse(bodyText) : null; } catch (e) {}
    method = (method || "GET").toUpperCase();
    var write = method !== "GET";
    rec = write ? [] : null;
    try {
      var res = route(method, u.pathname, body, u.pathname + u.search);
      if (write && u.pathname !== "/api/auth/login" && u.pathname !== "/api/track/visit" && u.pathname !== "/api/verify-code" && u.pathname !== "/api/quote") {
        saveOp({ m: method, p: u.pathname, b: body, r: rec });
      }
      return [200, res];
    } catch (e) {
      if (e && e.status) return [e.status, { detail: e.detail }];
      return [500, { detail: "Errore: " + (e && e.message) }];
    } finally { rec = null; }
  }

  function isApi(url) { try { return new URL(url, location.href).pathname.indexOf("/api/") === 0; } catch (e) { return false; } }

  // ---------- fetch ----------
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (url.indexOf("api.open-meteo.com/") !== -1) return realFetch(BASE + "weather.json");
    if (!isApi(url)) return realFetch(input, init);
    var method = (init && init.method) || (input && input.method) || "GET";
    var bodyText = init && typeof init.body === "string" ? init.body : null;
    return ready.then(function () {
      var r = handle(method, url, bodyText);
      return new Response(JSON.stringify(r[1]), { status: r[0], headers: { "Content-Type": "application/json" } });
    });
  };

  // ---------- XMLHttpRequest (axios) ----------
  var RealXHR = window.XMLHttpRequest;
  function FakeXHR() {
    this.readyState = 0; this.status = 0; this.statusText = ""; this.response = null; this.responseText = "";
    this.responseType = ""; this.responseURL = ""; this.timeout = 0; this.withCredentials = false;
    this._h = {}; this._l = {}; this.upload = { addEventListener: function () {}, removeEventListener: function () {} };
  }
  FakeXHR.UNSENT = 0; FakeXHR.OPENED = 1; FakeXHR.HEADERS_RECEIVED = 2; FakeXHR.LOADING = 3; FakeXHR.DONE = 4;
  FakeXHR.prototype.open = function (m, url) { this._m = m; this._u = url; this.readyState = 1; };
  FakeXHR.prototype.setRequestHeader = function (k, v) { this._h[k] = v; };
  FakeXHR.prototype.getAllResponseHeaders = function () { return this._real ? this._real.getAllResponseHeaders() : (this.readyState === 4 ? "content-type: application/json\r\n" : ""); };
  FakeXHR.prototype.getResponseHeader = function (k) { return this._real ? this._real.getResponseHeader(k) : (/content-type/i.test(k) ? "application/json" : null); };
  FakeXHR.prototype.overrideMimeType = function () {};
  FakeXHR.prototype.addEventListener = function (t, f) { (this._l[t] = this._l[t] || []).push(f); };
  FakeXHR.prototype.removeEventListener = function (t, f) { this._l[t] = (this._l[t] || []).filter(function (x) { return x !== f; }); };
  FakeXHR.prototype._fire = function (t) {
    var ev = { type: t, target: this, currentTarget: this };
    if (typeof this["on" + t] === "function") this["on" + t](ev);
    (this._l[t] || []).forEach(function (f) { f.call(this, ev); }, this);
  };
  FakeXHR.prototype.abort = function () { if (this._real) this._real.abort(); this._aborted = true; this._fire("abort"); };
  FakeXHR.prototype.send = function (body) {
    var self = this;
    if (!isApi(this._u)) {
      var x = (this._real = new RealXHR());
      x.open(this._m, this._u, true);
      Object.keys(this._h).forEach(function (k) { x.setRequestHeader(k, self._h[k]); });
      x.responseType = this.responseType;
      x.timeout = this.timeout;
      ["readystatechange", "load", "loadend", "error", "timeout", "abort"].forEach(function (t) {
        x.addEventListener(t, function () {
          self.readyState = x.readyState; self.status = x.status; self.statusText = x.statusText;
          self.response = x.response; self.responseURL = x.responseURL;
          if (x.responseType === "" || x.responseType === "text") self.responseText = x.responseText;
          self._fire(t);
        });
      });
      x.send(body);
      return;
    }
    ready.then(function () {
      if (self._aborted) return;
      var r = handle(self._m, self._u, typeof body === "string" ? body : null);
      var text = JSON.stringify(r[1]);
      self.status = r[0]; self.statusText = r[0] === 200 ? "OK" : "Error";
      self.responseText = text;
      self.response = self.responseType === "json" ? r[1] : text;
      self.responseURL = new URL(self._u, location.href).href;
      self.readyState = 4;
      self._fire("readystatechange"); self._fire("load"); self._fire("loadend");
    });
  };
  window.XMLHttpRequest = FakeXHR;

  // Reset all test data (used by the "Azzera prove" button).
  window.__PREVIEW_RESET__ = function () { try { localStorage.removeItem(LOG_KEY); } catch (e) {} location.replace(window.__PREVIEW_HREF__ || location.href); };
})();
