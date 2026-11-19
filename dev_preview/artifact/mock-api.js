/* In-page stand-in for the app's backend, used by the shareable preview link.
 * Answers /api/* requests (XMLHttpRequest and fetch) from data.json, a snapshot
 * of the real server. Admin edits (create / update / delete) are applied in
 * memory and replayed from localStorage, so they stay in this browser only.
 * Bookings, guest questions and AI features are not sent anywhere. */
(function () {
  var BASE = window.__PREVIEW_BASE__;
  var LOG_KEY = "am_preview_ops_v1";
  var NO_SERVER = "Versione anteprima: questa funzione richiede il server vero (anteprima live o app pubblicata).";
  var DB = null;
  var ready = fetch(BASE + "data.json").then(function (r) { return r.json(); }).then(function (snap) {
    DB = {};
    Object.keys(snap).forEach(function (k) { DB[k] = snap[k].body; });
    readOps().forEach(function (op) { try { apply(op.m, op.p, op.b, op.id, true); } catch (e) {} });
  });

  function readOps() { try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch (e) { return []; } }
  function saveOp(op) { try { var o = readOps(); o.push(op); localStorage.setItem(LOG_KEY, JSON.stringify(o)); } catch (e) {} }
  function uid() { return "p" + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  function listOf(body) {
    if (Array.isArray(body)) return body;
    if (body && typeof body === "object") {
      for (var k in body) if (Array.isArray(body[k])) return body[k];
    }
    return null;
  }
  function keysFor(path) { return Object.keys(DB).filter(function (k) { return k === path || k.indexOf(path + "?") === 0; }); }

  function apply(method, path, body, newId, replay) {
    var parts = path.split("/");
    var last = parts[parts.length - 1];
    var parent = parts.slice(0, -1).join("/");
    if (method === "POST") {
      var ks = keysFor(path).filter(function (k) { return listOf(DB[k]); });
      if (!ks.length) return null;
      var item = Object.assign({ id: newId, created_at: new Date().toISOString() }, body || {});
      ks.forEach(function (k) { listOf(DB[k]).unshift(item); });
      return item;
    }
    if (method === "PUT" || method === "PATCH") {
      var hit = null;
      keysFor(parent).forEach(function (k) {
        var l = listOf(DB[k]);
        if (!l) return;
        l.forEach(function (it, i) { if (it && it.id === last) { l[i] = Object.assign({}, it, body || {}); hit = l[i]; } });
      });
      if (hit) return hit;
      if (DB[path] && !Array.isArray(DB[path]) && typeof DB[path] === "object") {
        DB[path] = Object.assign({}, DB[path], body || {});
        return DB[path];
      }
      return null;
    }
    if (method === "DELETE") {
      var removed = false;
      keysFor(parent).forEach(function (k) {
        var l = listOf(DB[k]);
        if (!l) return;
        for (var i = l.length - 1; i >= 0; i--) if (l[i] && l[i].id === last) { l.splice(i, 1); removed = true; }
      });
      return removed ? { ok: true } : null;
    }
    return null;
  }

  function handle(method, url, bodyText) {
    var u = new URL(url, location.href);
    var path = u.pathname, full = path + u.search;
    var body = null;
    try { body = bodyText ? JSON.parse(bodyText) : null; } catch (e) {}
    method = (method || "GET").toUpperCase();
    if (method === "GET") {
      if (full in DB) return [200, DB[full]];
      if (path in DB) return [200, DB[path]];
      var pre = keysFor(path)[0];
      if (pre) return [200, DB[pre]];
      var parts = path.split("/"), id = parts.pop(), parent = parts.join("/");
      var found = null;
      keysFor(parent).forEach(function (k) {
        var l = listOf(DB[k]);
        if (l) l.forEach(function (it) { if (it && it.id === id) found = it; });
      });
      if (found) return [200, found];
      return [404, { detail: NO_SERVER }];
    }
    if (path === "/api/auth/login") {
      if (body && body.username === "Matteo" && body.password === "D5230") {
        return [200, { token: "preview-token", username: "Matteo", access_token: "preview-token" }];
      }
      return [401, { detail: "Credenziali non valide" }];
    }
    if (path === "/api/track/visit") return [200, { ok: true }];
    if (path === "/api/verify-code") {
      var code = String((body && body.code) || "").trim().toUpperCase();
      var today = new Date().toISOString().slice(0, 10);
      var bk = (listOf(DB["/api/bookings"]) || []).filter(function (b) { return b.confirmation_code === code && b.status === "approved"; })[0];
      if (bk) return [200, { valid: true, kind: "booking", guest_name: bk.guest_name, check_in: bk.check_in, check_out: bk.check_out }];
      var ai = (listOf(DB["/api/discount-codes"]) || []).filter(function (c) {
        return c.code === code && c.active && c.type === "ai_access" && c.valid_from <= today && today <= c.valid_to;
      })[0];
      if (ai) return [200, { valid: true, kind: "ai_access" }];
      return [403, { detail: "Codice non valido o scaduto." }];
    }
    if (/^\/api\/(bookings|guest-questions|quote)\b/.test(path) && method === "POST" && path.split("/").length <= 3) {
      return [503, { detail: "Versione anteprima: richieste e prenotazioni non vengono inviate." }];
    }
    var id2 = uid();
    var res = apply(method, path, body, id2, false);
    if (res) { saveOp({ m: method, p: path, b: body, id: id2 }); return [200, res]; }
    return [503, { detail: NO_SERVER }];
  }

  function isApi(url) {
    try { return new URL(url, location.href).pathname.indexOf("/api/") === 0; } catch (e) { return false; }
  }

  // ---- fetch ----
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

  // ---- XMLHttpRequest (axios) ----
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
})();
