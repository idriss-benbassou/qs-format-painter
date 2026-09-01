define([], function () {
  'use strict';

  var SELECTORS = [
    '[data-qid="{id}"]',
    '[class~="qv-object-{id}"]',
    '[aria-labelledby^="{id}_"]',
    '[tid="{id}"]',
    '[data-testid="{id}"]',
    '#{id}'
  ];

  var CONTENT_SELECTORS = [
    '.qv-object-content-container',
    '.qv-object-content',
    '.qv-inner-object'
  ];

  var CHILD_SELECTORS = [
    '.board-object',
    '.chart-object',
    '[data-qid]',
    '.njs-viz',
    '[data-render-count]',
    '.qv-object-wrapper',
    '.qv-object',
    '.qv-inner-object',
    '.qv-gridcell'
  ];

  function findElement(id) {
    for (var i = 0; i < SELECTORS.length; i++) {
      try {
        var el = document.querySelector(SELECTORS[i].replace('{id}', id));
        if (el) { return el; }
      } catch (e) { /* id non utilisable comme selecteur */ }
    }
    var token = 'qv-object-' + id;
    var all = document.querySelectorAll('.qv-object, .qv-gridcell, .njs-viz, .board-object, [class*="object-wrapper"]');
    for (var j = 0; j < all.length; j++) {
      var node = all[j];
      if (node.classList && node.classList.contains(token)) { return node; }
      var attrs = node.attributes || [];
      for (var k = 0; k < attrs.length; k++) {
        var v = attrs[k].value;
        if (v === id || v === token || (v && v.indexOf(id + '_') === 0)) { return node; }
      }
    }
    return null;
  }

  function boxOf(el) {
    var r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height, area: r.width * r.height };
  }

  function contentBox(el) {
    for (var i = 0; i < CONTENT_SELECTORS.length; i++) {
      var inner = el.querySelector(CONTENT_SELECTORS[i]);
      if (inner) {
        var b = boxOf(inner);
        if (b.width > 8 && b.height > 8) { return b; }
      }
    }
    return boxOf(el);
  }

  function derive(parentBox, bounds) {
    var w = parentBox.width * bounds.w;
    var h = parentBox.height * bounds.h;
    return {
      left: parentBox.left + parentBox.width * bounds.x,
      top: parentBox.top + parentBox.height * bounds.y,
      width: w, height: h, area: w * h
    };
  }

  function toArray(nodeList) {
    return Array.prototype.slice.call(nodeList || []);
  }

  function objectRootsIn(el, excluded) {
    var found = [];
    CHILD_SELECTORS.forEach(function (sel) {
      toArray(el.querySelectorAll(sel)).forEach(function (n) {
        if (n !== el && found.indexOf(n) === -1 && (excluded || []).indexOf(n) === -1) {
          found.push(n);
        }
      });
    });

    var outer = found.filter(function (n) {
      return !found.some(function (o) { return o !== n && o.contains && o.contains(n); });
    });
    return outer.filter(function (n) {
      var r = n.getBoundingClientRect();
      return r.width > 12 && r.height > 12;
    });
  }

  function centre(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function contains(r, p) {
    return p.x >= r.left && p.x <= r.left + r.width && p.y >= r.top && p.y <= r.top + r.height;
  }

  function nearest(roots, target) {
    var t = centre(target);
    var best = null, bestD = Infinity;
    roots.forEach(function (n) {
      var r = boxOf(n);
      var c = centre(r);
      if (!contains(target, c) && !contains(r, t)) { return; }
      var d = Math.pow(c.x - t.x, 2) + Math.pow(c.y - t.y, 2);
      if (d < bestD) { bestD = d; best = n; }
    });
    return best;
  }

  /**
   * @param {Array} items {id, ownerId, depth, bounds}
   * @returns {Object} id -> {rect, via, el}
   */
  function resolveRects(items) {
    var out = {};
    var ordered = items.slice().sort(function (a, b) { return (a.depth || 0) - (b.depth || 0); });
    var used = [];

    
    ordered.forEach(function (it) {
      var el = findElement(it.id);
      if (el && used.indexOf(el) === -1) {
        used.push(el);
        out[it.id] = { rect: boxOf(el), via: 'dom', el: el };
      } else {
        out[it.id] = { rect: null, via: null, el: null };
      }
    });

    var groups = {};
    ordered.forEach(function (it) {
      if (!out[it.id].rect && it.ownerId) {
        if (!groups[it.ownerId]) { groups[it.ownerId] = []; }
        groups[it.ownerId].push(it);
      }
    });

    Object.keys(groups).forEach(function (ownerId) {
      var owner = out[ownerId];
      if (!owner || !owner.rect) { return; }
      var parentBox = owner.el ? contentBox(owner.el) : owner.rect;
      var kids = groups[ownerId];
      var derived = kids.map(function (k) { return k.bounds ? derive(parentBox, k.bounds) : null; });
      var roots = owner.el ? objectRootsIn(owner.el, used) : [];
      var free = roots.slice();
      var byOrder = derived.every(function (d) { return !d; }) && roots.length === kids.length;

      kids.forEach(function (k, i) {
        var pick = null;
        if (byOrder) {
          pick = roots[i] || null;
        } else if (derived[i] && free.length) {
          pick = nearest(free, derived[i]);
        }
        if (pick) {
          if (free.indexOf(pick) !== -1) { free.splice(free.indexOf(pick), 1); }
          used.push(pick);
          out[k.id] = { rect: boxOf(pick), via: 'dom-imbrique', el: pick };
        } else if (derived[i]) {
          out[k.id] = { rect: derived[i], via: 'calcul', el: null };
        }
      });
    });

    return out;
  }

  function pickBest(candidates, x, y) {
    var preferes = candidates.filter(function (c) { return c.prefer !== false; });
    return deepestAt(preferes, x, y) || deepestAt(candidates, x, y);
  }

  function deepestAt(candidates, x, y) {
    var best = null;
    candidates.forEach(function (c) {
      var r = c.rect;
      if (!r || r.width < 8 || r.height < 8) { return; }
      if (x < r.left || x > r.left + r.width || y < r.top || y > r.top + r.height) { return; }
      if (!best) { best = c; return; }
      if ((c.depth || 0) > (best.depth || 0)) { best = c; return; }
      if ((c.depth || 0) === (best.depth || 0) && r.area < best.rect.area) { best = c; }
    });
    return best;
  }

  function create() {
    var overlay = null;
    var hint = null;
    var applyBtn = null;
    var boxes = {};
    var state = null;

    function destroy() {
      if (overlay) { overlay.remove(); overlay = null; }
      if (hint) { hint.remove(); hint = null; }
      applyBtn = null;
      boxes = {};
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      state = null;
    }

    function onKey(e) {
      if (!state) { return; }
      if (e.key === 'Escape') {
        e.preventDefault(); e.stopPropagation();
        var cancel = state.onCancel;
        destroy();
        if (cancel) { cancel(); }
      } else if (e.key === 'Enter' && state.multi) {
        e.preventDefault(); e.stopPropagation();
        confirm();
      }
    }

    function confirm() {
      var picked = state.selected.slice();
      if (!picked.length) { return; }
      if (state.persist) {
        state.phase = 'kept';
        if (state.onPick) { state.onPick(picked); }
        paint();
        return;
      }
      var done = state.onPick;
      destroy();
      if (done) { done(picked); }
    }

    function close() {
      var fin = state.onClose;
      destroy();
      if (fin) { fin(); }
    }

    function measure() {
      if (!state) { return; }
      var resolved = resolveRects(state.items);
      state.candidates = state.items.map(function (it) {
        var r = resolved[it.id] || {};
        return {
          id: it.id,
          label: it.label || it.id,
          depth: it.depth || 0,
          prefer: it.prefer !== false,
          rect: r.rect || null,
          via: r.via || null
        };
      });
      paint();
    }

    function hitTest(x, y) { return pickBest(state.candidates, x, y); }

    function boxFor(id, kind) {
      var b = boxes[id];
      if (!b) {
        b = document.createElement('div');
        b.className = 'qsp-hit';
        overlay.appendChild(b);
        boxes[id] = b;
      }
      b.className = 'qsp-hit qsp-hit--' + kind;
      return b;
    }

    function escape(s) {
      return String(s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }

    function place(box, rect, label) {
      box.style.left = rect.left + 'px';
      box.style.top = rect.top + 'px';
      box.style.width = rect.width + 'px';
      box.style.height = rect.height + 'px';
      box.innerHTML = label ? '<span class="qsp-hit__tag">' + escape(label) + '</span>' : '';
    }

    function paint() {
      if (applyBtn) {
        var n = state.selected.length;
        var garde = state.phase === 'kept';
        applyBtn.disabled = !garde && !n;
        applyBtn.textContent = garde
          ? 'Done'
          : (state.confirmLabel || 'Apply') + (n ? ' (' + n + ')' : '');
      }
      if (hint && state.phase === 'kept') {
        hint.querySelector('.qsp-hint__text').textContent =
          state.selected.length + ' object(s) still selected, run another align or press Esc';
      }
      Object.keys(boxes).forEach(function (id) {
        if (state.selected.indexOf(id) === -1 && id !== state.hover) {
          boxes[id].remove();
          delete boxes[id];
        }
      });
      state.selected.forEach(function (id, i) {
        var c = state.candidates.filter(function (x) { return x.id === id; })[0];
        if (!c || !c.rect) { return; }
        var premier = state.multi && state.reference && i === 0;
        place(boxFor(id, premier ? 'ref' : 'selected'), c.rect,
          state.multi ? (premier ? 'Ref' : String(i + 1)) : '');
      });
      if (state.hover && state.selected.indexOf(state.hover) === -1) {
        var h = state.candidates.filter(function (x) { return x.id === state.hover; })[0];
        if (h && h.rect) { place(boxFor(state.hover, 'hover'), h.rect, h.label); }
      }
    }

    function open(opts) {
      destroy();
      overlay = document.createElement('div');
      overlay.className = 'qsp-overlay qsp-overlay--' + (opts.tone || 'target');
      document.body.appendChild(overlay);

      hint = document.createElement('div');
      hint.className = 'qsp-hint';
      hint.innerHTML = '<span class="qsp-hint__text"></span>' +
        '<span class="qsp-hint__keys">' +
        (opts.multi ? '<b>Enter</b> confirm ' : '') + '<b>Esc</b> cancel</span>' +
        (opts.multi
          ? '<button type="button" class="qsp-hint__btn" disabled>' +
            (opts.confirmLabel || 'Apply') + '</button>'
          : '');
      document.body.appendChild(hint);
      hint.querySelector('.qsp-hint__text').textContent = opts.hint || 'Click an object';
      if (opts.multi) {
        applyBtn = hint.querySelector('.qsp-hint__btn');
        applyBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!state) { return; }
          if (state.phase === 'kept') { close(); } else if (state.selected.length) { confirm(); }
        });
      }

      state = {
        multi: !!opts.multi,
        selected: [],
        hover: null,
        onPick: opts.onPick,
        onCancel: opts.onCancel,
        items: opts.items || [],
        confirmLabel: opts.confirmLabel || 'Apply',
        persist: !!opts.persist,
        reference: !!opts.reference,
        phase: 'picking',
        onClose: opts.onClose,
        candidates: []
      };

      measure();

      overlay.addEventListener('mousemove', function (e) {
        var hit = hitTest(e.clientX, e.clientY);
        var id = hit ? hit.id : null;
        if (id !== state.hover) { state.hover = id; paint(); }
        overlay.style.cursor = id ? 'crosshair' : 'not-allowed';
      });

      overlay.addEventListener('click', function (e) {
        var hit = hitTest(e.clientX, e.clientY);
        if (!hit) { return; }
        if (!state.multi) {
          var done = state.onPick;
          destroy();
          if (done) { done([hit.id]); }
          return;
        }
        var i = state.selected.indexOf(hit.id);
        if (i === -1) { state.selected.push(hit.id); } else { state.selected.splice(i, 1); }
        paint();
      });

      overlay.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        if (state.multi && state.selected.length) { confirm(); return; }
        var cancel = state.onCancel;
        destroy();
        if (cancel) { cancel(); }
      });

      window.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', measure);
      window.addEventListener('scroll', measure, true);
    }

    return {
      open: open,
      close: destroy,
      isOpen: function () { return !!state; },
      selection: function () { return state ? state.selected.slice() : []; },
      update: function (items) {
        if (!state) { return; }
        if (items) { state.items = items; }
        measure();
      },
      unresolved: function (items) {
        var r = resolveRects(items);
        return items.filter(function (it) { return !r[it.id] || !r[it.id].rect; })
          .map(function (it) { return it.id; });
      },
      diagnose: function (items) {
        var r = resolveRects(items);
        return items.map(function (it) {
          return { id: it.id, via: r[it.id] ? r[it.id].via : null, rect: r[it.id] ? r[it.id].rect : null };
        });
      },
      probe: function (items, x, y) {
        var r = resolveRects(items);
        var cands = items.map(function (it) {
          return {
            id: it.id, depth: it.depth || 0, prefer: it.prefer !== false,
            rect: r[it.id] ? r[it.id].rect : null
          };
        });
        var hit = pickBest(cands, x, y);
        return hit ? hit.id : null;
      },

      boundsWithin: function (parentId, childIds) {
        var pel = findElement(parentId);
        if (!pel) { return {}; }
        var box = contentBox(pel);
        if (!(box.width > 8 && box.height > 8)) { return {}; }
        var out = {};
        childIds.forEach(function (id) {
          var el = findElement(id);
          if (!el) { return; }
          var r = boxOf(el);
          out[id] = {
            x: (r.left - box.left) / box.width,
            y: (r.top - box.top) / box.height,
            w: r.width / box.width,
            h: r.height / box.height
          };
        });
        return out;
      },

      domReport: function (items) {
        var r = resolveRects(items);
        var parents = {};
        items.forEach(function (it) { if (it.ownerId) { parents[it.ownerId] = true; } });
        var report = {};
        Object.keys(parents).forEach(function (pid) {
          var info = r[pid];
          var el = info && info.el;
          report[pid] = {
            elementTrouve: !!el,
            selecteur: info ? info.via : null,
            enfantsModele: items.filter(function (it) { return it.ownerId === pid; }).length,
            racinesDom: null,
            exemples: []
          };
          if (el) {
            var roots = objectRootsIn(el, []);
            report[pid].racinesDom = roots.length;
            report[pid].exemples = roots.slice(0, 6).map(function (n) {
              var b = n.getBoundingClientRect();
              var attrs = {};
              toArray(n.attributes).forEach(function (a) { attrs[a.name] = a.value; });
              return {
                tag: n.tagName,
                classe: (n.className && n.className.baseVal !== undefined ? n.className.baseVal : n.className) || '',
                attributs: attrs,
                rect: { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }
              };
            });
          }
        });
        report.objets = items.map(function (it) {
          return { id: it.id, ownerId: it.ownerId, depth: it.depth, via: r[it.id] ? r[it.id].via : null };
        });
        return report;
      }
    };
  }

  return { create: create };
});
