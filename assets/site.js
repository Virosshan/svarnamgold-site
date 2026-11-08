(function () {
  "use strict";
  var ROOT = document.documentElement.dataset.root || "";
  var LIST_KEY = "kanaka.enquiry.v1";
  var VELVET_KEY = "kanaka.velvet";

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) {
      return null;
    }
  }

  /* ---------- Enquiry list ---------- */
  function readList() {
    try {
      var list = JSON.parse(store(LIST_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }
  function writeList(list) {
    store(LIST_KEY, JSON.stringify(list));
    showCount(list);
  }
  function showCount(list) {
    var n = list.reduce(function (sum, item) { return sum + item.qty; }, 0);
    document.querySelectorAll("[data-count]").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("is-on", n > 0);
    });
  }
  function addToList(code) {
    var list = readList();
    var found = list.find(function (item) { return item.code === code; });
    if (found) found.qty += 1;
    else list.push({ code: code, qty: 1 });
    writeList(list);
  }

  var toastTimer;
  function toast(html) {
    var el = document.querySelector("[data-toast]");
    if (!el) return;
    el.innerHTML = html;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 4500);
  }
  function escapeText(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  document.addEventListener("submit", function (event) {
    var form = event.target;
    if (!form.classList.contains("add-form")) return;
    event.preventDefault();
    addToList(form.dataset.code);
    toast("<span>" + escapeText(form.dataset.label) + " added</span><a href=\"" + ROOT + "enquiry/\">View list</a>");
  });
  showCount(readList());

  /* ---------- Velvet switch ---------- */
  function setVelvet(value) {
    document.documentElement.dataset.velvet = value;
    store(VELVET_KEY, value);
    var piece = document.querySelector(".hero__piece");
    if (piece) piece.setAttribute("href", piece.dataset[value]);
  }
  var radios = document.querySelectorAll('input[name="velvet-switch"]');
  if (radios.length) {
    var current = document.documentElement.dataset.velvet;
    radios.forEach(function (radio) {
      radio.checked = radio.value === current;
      radio.addEventListener("change", function () { setVelvet(radio.value); });
    });
    setVelvet(current);
  }

  /* ---------- Collection filters ---------- */
  var filters = document.querySelector("[data-filters]");
  if (filters) {
    var gridEl = document.getElementById("grid");
    var cards = Array.prototype.slice.call(gridEl.children);
    var results = document.querySelector("[data-results]");
    var empty = document.querySelector("[data-empty]");

    var value = function (name) { return (new FormData(filters).get(name) || "").toString(); };

    var apply = function (updateUrl) {
      var deity = value("deity");
      var velvet = value("velvet");
      var band = value("band");
      var sort = value("sort");
      var shown = 0;

      cards.forEach(function (card) {
        var d = card.dataset;
        var match = (!deity || d.deity === deity) &&
          (!velvet || d.velvet === velvet) &&
          (!band || d.band === band);
        card.hidden = !match;
        if (match) shown += 1;
      });

      var sorted = cards.slice();
      if (sort) {
        sorted.sort(function (a, b) {
          var diff = Number(a.dataset.area) - Number(b.dataset.area);
          return sort === "small" ? diff : -diff;
        });
      }
      sorted.forEach(function (card) { gridEl.appendChild(card); });

      results.textContent = shown === 1 ? "1 piece" : shown + " pieces";
      empty.hidden = shown !== 0;

      if (updateUrl) {
        var params = new URLSearchParams();
        ["deity", "velvet", "band", "sort"].forEach(function (k) {
          if (value(k)) params.set(k, value(k));
        });
        var qs = params.toString();
        history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
      }
    };

    var incoming = new URLSearchParams(location.search);
    incoming.forEach(function (val, key) {
      var field = filters.elements[key];
      if (field) field.value = val;
    });

    // On phones the filters start closed so pieces come first, unless a link set some.
    var panel = filters.querySelector("[data-filter-panel]");
    var wide = window.matchMedia("(min-width: 760px)");
    var hasFilters = ["deity", "velvet", "band", "sort"].some(function (k) { return incoming.get(k); });
    var syncPanel = function () { panel.open = wide.matches || hasFilters; };
    wide.addEventListener("change", syncPanel);
    syncPanel();

    filters.addEventListener("input", function () { apply(true); });
    filters.addEventListener("submit", function (event) {
      event.preventDefault();
      apply(true);
    });
    var clear = document.querySelector("[data-clear]");
    if (clear) {
      clear.addEventListener("click", function () {
        filters.reset();
        apply(true);
      });
    }
    apply(false);
  }

  /* ---------- Enquiry page ---------- */
  var enquiry = document.querySelector("[data-enquiry]");
  if (enquiry && window.KANAKA) {
    var data = window.KANAKA;
    var listEl = enquiry.querySelector("[data-list]");
    var listEmpty = enquiry.querySelector("[data-list-empty]");
    var form = enquiry.querySelector("[data-enquiry-form]");
    var totalEl = enquiry.querySelector("[data-total]");

    var money = function (n) { return "RM" + n.toLocaleString("en-MY"); };
    var totalOf = function (list) {
      return list.reduce(function (sum, item) { return sum + data.products[item.code].price * item.qty; }, 0);
    };

    var params = new URLSearchParams(location.search);
    var incomingCode = params.get("add");
    if (incomingCode && data.products[incomingCode]) {
      addToList(incomingCode);
      history.replaceState(null, "", location.pathname);
    }

    var cleanList = function () {
      return readList().filter(function (item) { return data.products[item.code]; });
    };

    var render = function () {
      var list = cleanList();
      listEl.innerHTML = list.map(function (item) {
        var p = data.products[item.code];
        return '<li class="enq__item">' +
          '<a class="enq__art" href="' + ROOT + "pieces/" + p.slug + '/"><img class="cut" src="' + ROOT + "assets/products/" + item.code + '-480.webp" width="' + p.w + '" height="' + p.h + '" alt=""></a>' +
          '<div class="enq__text"><a href="' + ROOT + "pieces/" + p.slug + '/">' + escapeText(p.name) + "</a>" +
          "<p>" + escapeText(p.size) + "</p><p>" + escapeText(p.velvet) + "</p><p>" + item.code + "</p>" +
          '<p class="enq__price">' + (data.estimate ? "About " : "") + money(p.price) + (item.qty > 1 ? " each" : "") + "</p></div>" +
          '<div class="qty" role="group" aria-label="Quantity of ' + escapeText(p.name) + '">' +
          '<button type="button" data-step="-1" data-code="' + item.code + '" aria-label="One fewer">&minus;</button>' +
          '<output aria-live="polite">' + item.qty + "</output>" +
          '<button type="button" data-step="1" data-code="' + item.code + '" aria-label="One more">+</button></div>' +
          '<button type="button" class="enq__remove" data-remove="' + item.code + '">Remove<span class="vh"> ' + escapeText(p.name) + "</span></button>" +
          "</li>";
      }).join("");
      listEmpty.hidden = list.length > 0;
      totalEl.hidden = list.length === 0;
      totalEl.textContent = (data.estimate ? "Estimated total " : "Total ") + money(totalOf(list)) + ", before delivery";
      form.hidden = list.length === 0;
    };

    listEl.addEventListener("click", function (event) {
      var btn = event.target.closest("button");
      if (!btn) return;
      var list = cleanList();
      if (btn.dataset.remove) {
        list = list.filter(function (item) { return item.code !== btn.dataset.remove; });
      } else if (btn.dataset.step) {
        list = list.map(function (item) {
          if (item.code === btn.dataset.code) item.qty += Number(btn.dataset.step);
          return item;
        }).filter(function (item) { return item.qty > 0; });
      }
      writeList(list);
      render();
    });

    var message = function () {
      var fd = new FormData(form);
      var lines = ["Hello " + data.brand + ", I would like to order:", ""];
      var list = cleanList();
      list.forEach(function (item, i) {
        var p = data.products[item.code];
        lines.push((i + 1) + ". " + item.code + " " + p.name + ", " + p.size + ", " + p.velvet + " (qty " + item.qty + ", " + (data.estimate ? "about " : "") + money(p.price) + " each)");
      });
      lines.push("", (data.estimate ? "Estimated total: " : "Total: ") + money(totalOf(list)), "Please confirm the final price and availability.");
      lines.push("", "Name: " + fd.get("name"), "Deliver to: " + fd.get("city"));
      if (fd.get("occasion")) lines.push("Occasion: " + fd.get("occasion"));
      if (fd.get("note")) lines.push("Note: " + fd.get("note"));
      return lines.join("\n");
    };

    var validate = function () {
      var firstBad = null;
      ["name", "city"].forEach(function (name) {
        var input = form.elements[name];
        var err = input.parentElement.querySelector(".err");
        var bad = !input.value.trim();
        err.hidden = !bad;
        input.setAttribute("aria-invalid", bad ? "true" : "false");
        if (bad && !firstBad) firstBad = input;
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    };

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var via = event.submitter ? event.submitter.value : "copy";
      if (!validate()) return;
      var text = message();
      if (via === "whatsapp") {
        window.open("https://wa.me/" + data.whatsapp + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      } else if (via === "email") {
        location.href = "mailto:" + data.email + "?subject=" + encodeURIComponent("Enquiry for " + data.brand) + "&body=" + encodeURIComponent(text);
      } else {
        var done = function () { toast("<span>Your list has been copied</span>"); };
        if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy your list:", text); });
        else window.prompt("Copy your list:", text);
      }
    });

    render();
  }
})();
