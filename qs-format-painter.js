/**
 * QS Format Painter
 *
 * By  : Idriss Benbassou
 * MAJ : 30/08/2026
 */
define([
  'qlik',
  './lib/qsp-engine',
  './lib/qsp-picker',
  './lib/qsp-ui',
  'text!./qs-format-painter.css'
], function (qlik, Engine, Picker, UI, cssContent) {
  'use strict';

  if (!document.getElementById('qsp-style')) {
    var style = document.createElement('style');
    style.id = 'qsp-style';
    style.textContent = cssContent;
    document.head.appendChild(style);
  }

  var singleton = null;

  function labelOf(o) {
    var base = o.title || o.type;
    return base + ' · ' + o.id;
  }

  function boot(selfId) {
    if (singleton) { return singleton; }

    var app = qlik.currApp();
    var engine = Engine.create(app);
    var picker = Picker.create();
    var state = { sourceId: null, sourceLabel: null, sticky: false, arrangeActif: false };
    var ui;

    function items(needGeometry) {
      return engine.objects()
        .filter(function (o) { return o.id !== selfId; })
        .filter(function (o) { return !needGeometry || engine.hasGeometry(o.id); })
        .map(function (o) {
          var geo = engine.geometryOf(o.id);
          return {
            id: o.id,
            label: labelOf(o) + (!geo && needGeometry !== null ? ' · style only' : ''),
            ownerId: o.ownerId,
            depth: o.depth || 0,
            prefer: needGeometry === null ? true : !!geo,
            bounds: geo
          };
        });
    }

    function fail(err) {
      ui.setBusy(false);
      ui.setStatus(err && err.message ? err.message : String(err), 'error');
    }

    function bindAnonymousGeometry() {
      var pending = engine.pendingBindings();
      var relies = 0;
      pending.forEach(function (p) {
        var mesures = picker.boundsWithin(p.ownerId, p.orphelins);
        var libres = p.blocs.filter(function (b) { return b.bounds; });
        var pairs = [];
        var pris = {};

        p.orphelins.forEach(function (id, rang) {
          var m = mesures[id];
          var choix = null;
          if (m) {
            var meilleur = Infinity;
            libres.forEach(function (b) {
              if (pris[b.index]) { return; }
              var d = Math.pow(b.bounds.x - m.x, 2) + Math.pow(b.bounds.y - m.y, 2) +
                Math.pow(b.bounds.w - m.w, 2) + Math.pow(b.bounds.h - m.h, 2);
              if (d < meilleur) { meilleur = d; choix = b; }
            });
          }
          if (!choix && libres.length === p.orphelins.length && !pris[rang]) {
            choix = libres[rang];
          }
          if (choix) { pris[choix.index] = true; pairs.push({ id: id, index: choix.index }); }
        });

        if (pairs.length) { relies += engine.bindAnonymous(p.ownerId, pairs); }
      });
      return relies;
    }

    function reload() {
      ui.setBusy(true);
      return engine.refresh(qlik, selfId).then(function () {
        try {
          bindAnonymousGeometry();
        } catch (e) {
          /* eslint-disable no-console */
          console.log('[QS Format Painter] appariement impossible', e);
        }
        ui.setBusy(false);
        return true;
      });
    }

    function pickSource() {
      state.arrangeActif = false;
      reload().then(function () {
        var modes = ui.modes();
        var viseTaille = modes.size || modes.position;
        ui.setStatus('Click the object you want to copy the format from');
        picker.open({
          items: items(viseTaille ? false : null),
          tone: 'source',
          hint: 'Pick the format from an object',
          onPick: function (picked) {
            state.sourceId = picked[0];
            var o = engine.objects().filter(function (x) { return x.id === picked[0]; })[0];
            state.sourceLabel = o ? (o.title || o.type) : picked[0];
            var g = engine.geometryOf(state.sourceId);
            ui.setSource({
              label: state.sourceLabel,
              size: g ? Math.round(g.w * 100) + ' × ' + Math.round(g.h * 100) : 'style only'
            });
            if (g) {
              ui.setStatus('Format picked. ' + Math.round(g.w * 100) + ' x ' +
                Math.round(g.h * 100) + ' percent', 'ok');
            } else {
              var why = engine.reasonFor(state.sourceId);
              /* eslint-disable no-console */
              console.log('[QS Format Painter] geometrie introuvable', why);
              var trouves = (why.nombresOwner || []).concat(why.nombresObjet || []);
              if (!trouves.length) {
                ui.setStatus('Style only. This object is laid out by its ' +
                  (why.ownerType || 'parent') + ', it has no size of its own. ' +
                  'Pick the ' + (why.ownerType || 'parent') + ' to copy a size', 'ok');
              } else {
                console.log('[QS Format Painter] blocs en attente', engine.pendingBindings());
                ui.setStatus('Style only. ' + trouves.length +
                  ' layout number(s) could not be matched. See the console', 'error');
              }
            }
          },
          onCancel: function () { ui.setStatus('Selector cancelled'); }
        });
      }).catch(fail);
    }

    function applyTo(sticky) {
      if (!state.sourceId) {
        ui.setStatus('Pick a format with the selector first', 'error');
        return;
      }
      var modes = ui.modes();
      if (!modes.size && !modes.position && !modes.style) {
        ui.setStatus('Turn on at least Size, Position or Style', 'error');
        return;
      }
      state.arrangeActif = false;
      state.sticky = sticky;
      ui.setSticky(sticky);
      openApplyPicker();
    }

    function openApplyPicker() {
      var modes = ui.modes();
      var viseTaille = modes.size || modes.position;
      picker.open({
        items: modes.style
          ? items(viseTaille ? false : null)
          : items(true),
        multi: true,
        tone: 'target',
        hint: 'Click the objects to receive the format' + (state.sticky ? ' (continuous mode)' : ''),
        confirmLabel: 'Paste format',
        onPick: function (targets) {
          ui.setBusy(true);
          engine.beginGroup();
          var chain = Promise.resolve(0);
          if (modes.size || modes.position) {
            chain = chain.then(function () {
              return engine.applyGeometry(state.sourceId, targets, modes);
            });
          }
          if (modes.style) {
            chain = chain.then(function () {
              return engine.applyStyle(state.sourceId, targets);
            });
          }
          chain.then(function () {
            engine.endGroup();
            ui.setBusy(false);
            return reload();
          }).then(function () {
            var connus = {};
            engine.objects().forEach(function (o) { connus[o.id] = true; });
            var perdus = targets.filter(function (t) { return !connus[t]; });
            var plats = targets.filter(function (t) {
              var g = engine.geometryOf(t);
              return g && (g.w < 0.005 || g.h < 0.005);
            });
            if (perdus.length || plats.length) {
              ui.setStatus('Problem on ' + (perdus.length + plats.length) +
                ' object(s), undo with the arrow and please report it', 'error');
            } else {
              ui.setStatus(targets.length + ' object(s) formatted. Remember to save', 'ok');
            }
            if (state.sticky) { openApplyPicker(); }
          }).catch(function (err) {
            engine.endGroup();
            fail(err);
          });
        },
        onCancel: function () {
          state.sticky = false;
          ui.setSticky(false);
          ui.setStatus('Apply cancelled');
        }
      });
    }

    function arrange(mode) {
      if (state.arrangeActif && picker.isOpen()) {
        var courante = picker.selection();
        if (courante.length > 1) { runArrange(mode, courante); return; }
      }
      reload().then(function () {
        state.arrangeActif = true;
        picker.open({
          items: items(true),
          multi: true,
          persist: true,
          reference: true,
          tone: 'target',
          hint: 'Click the objects to arrange. The first one you click is the reference, ' +
            'and they must all sit in the same container',
          confirmLabel: 'Apply',
          onClose: function () {
            state.arrangeActif = false;
            ui.setStatus('Arrange mode closed');
          },
          onPick: function (ids) {
            ui.setBusy(true);
            var avant = {};
            ids.forEach(function (id) { avant[id] = engine.geometryOf(id); });
            runArrange(mode, ids);
          },
          onCancel: function () {
            state.arrangeActif = false;
            ui.setStatus('Action cancelled');
          }
        });
      }).catch(fail);
    }

    function runArrange(mode, ids) {
      ui.setBusy(true);
      var avant = {};
      ids.forEach(function (id) { avant[id] = engine.geometryOf(id); });
      engine.arrange(mode, ids, null).then(function (bilan) {
        ui.setBusy(false);
        return reload().then(function () {
          var bouges = ids.filter(function (id) {
            var a = avant[id], b = engine.geometryOf(id);
            if (!a || !b) { return false; }
            return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) +
              Math.abs(a.w - b.w) + Math.abs(a.h - b.h) > 0.0005;
          });
          /* eslint-disable no-console */
          console.log('[QS Format Painter] arrange', mode, { avant: avant, bilan: bilan });
          if (picker.isOpen()) { picker.update(items(true)); }
          if (!bouges.length) {
            ui.setStatus('Nothing moved, these objects were already aligned', 'ok');
          } else if (bilan && bilan.ignores) {
            ui.setStatus(bouges.length + ' object(s) moved, ' + bilan.ignores +
              ' ignored because they sit in another container. Remember to save', 'ok');
          } else {
            ui.setStatus(bouges.length + ' object(s) moved. Selection kept, ' +
              'run another align or press Esc', 'ok');
          }
        });
      }).catch(fail);
    }

    var reglagesLayout = { gap: 0.012, zone: 'reference' };

    var GABARITS = [
      { id: 'row', nom: 'Row', aide: 'One line, full width' },
      { id: 'column', nom: 'Column', aide: 'One column, full height' },
      { id: 'grid', nom: 'Auto grid', aide: 'Squarest grid for the count' },
      { id: 'grid-2', nom: '2 columns', aide: 'Two per line' },
      { id: 'grid-3', nom: '3 columns', aide: 'Three per line' },
      { id: 'grid-4', nom: '4 columns', aide: 'Four per line' }
    ];

    function renderLayout(panel) {
      panel.innerHTML = '<div class="qsp-layout__head">Layout templates</div>';

      var choix = document.createElement('div');
      choix.className = 'qsp-layout__grid';
      GABARITS.forEach(function (g) {
        var b = document.createElement('button');
        b.className = 'qsp-layout__tpl';
        b.innerHTML = '<span class="qsp-layout__name">' + g.nom + '</span>' +
          '<span class="qsp-layout__hint">' + g.aide + '</span>';
        b.addEventListener('click', function () { runLayout(g.id); });
        choix.appendChild(b);
      });
      panel.appendChild(choix);

      var options = document.createElement('div');
      options.className = 'qsp-layout__opts';
      options.appendChild(ui.element('span', 'qsp-row__tag', 'Gap'));
      [['None', 0], ['S', 0.012], ['M', 0.03]].forEach(function (o) {
        var chip = document.createElement('button');
        chip.className = 'qsp-chip' + (reglagesLayout.gap === o[1] ? ' is-on' : '');
        chip.textContent = o[0];
        chip.addEventListener('click', function () {
          reglagesLayout.gap = o[1];
          renderLayout(panel);
        });
        options.appendChild(chip);
      });
      options.appendChild(ui.element('span', 'qsp-row__tag', 'Size'));
      [['From reference', 'reference'], ['Fill container', 'holder']].forEach(function (o) {
        var chip = document.createElement('button');
        chip.className = 'qsp-chip' + (reglagesLayout.zone === o[1] ? ' is-on' : '');
        chip.textContent = o[0];
        chip.addEventListener('click', function () {
          reglagesLayout.zone = o[1];
          renderLayout(panel);
        });
        options.appendChild(chip);
      });
      panel.appendChild(options);
    }

    function runLayout(template) {
      if (state.arrangeActif && picker.isOpen()) {
        var courante = picker.selection();
        if (courante.length) { applyLayout(template, courante); return; }
      }
      reload().then(function () {
        state.arrangeActif = true;
        picker.open({
          items: items(true),
          multi: true,
          persist: true,
          reference: true,
          tone: 'target',
          hint: 'Click the objects to lay out, in the order you want them placed',
          confirmLabel: 'Lay out',
          onClose: function () {
            state.arrangeActif = false;
            ui.setStatus('Layout mode closed');
          },
          onCancel: function () {
            state.arrangeActif = false;
            ui.setStatus('Action cancelled');
          },
          onPick: function (ids) { applyLayout(template, ids); }
        });
      }).catch(fail);
    }

    function applyLayout(template, ids) {
      ui.setBusy(true);
      engine.layout(template, ids, reglagesLayout).then(function (bilan) {
        ui.setBusy(false);
        return reload().then(function () {
          if (picker.isOpen()) { picker.update(items(true)); }
          ui.setStatus(bilan.modifies + ' object(s) laid out in ' + bilan.cols + ' × ' +
            bilan.rows + (bilan.ignores ? ', ' + bilan.ignores + ' ignored' : '') +
            (bilan.deborde ? '. Warning, the grid runs past the container edge' : '') +
            '. Selection kept, try another template or press Esc', 'ok');
        });
      }).catch(fail);
    }

    function renderList(panel) {
      panel.innerHTML = '<div class="qsp-list__head">Sheet objects</div>';
      reload().then(function () {
        var all = items(false);
        var objects = engine.objects().filter(function (o) { return o.id !== selfId; });
        var missing = picker.unresolved(all);
        var via = {};
        picker.diagnose(all).forEach(function (d) { via[d.id] = d.via; });
        if (!objects.length) {
          panel.innerHTML += '<div class="qsp-list__empty">No object read. Click Reload sheet.</div>';
          return;
        }
        objects.forEach(function (o) {
          var row = document.createElement('div');
          row.className = 'qsp-list__row';
          var geo = engine.geometryOf(o.id);
          var geoSrc = engine.geometrySource(o.id);
          var pointage = via[o.id];
          var libelle = { 'dom-imbrique': 'nested dom', calcul: 'computed' };
          var source = pointage === 'dom' ? '' : (libelle[pointage] || pointage || 'not pointable');
          if (geoSrc === 'aucune') { source = (source ? source + ', ' : '') + 'no size'; }
          row.innerHTML = '<span class="qsp-list__label" title="' + o.id + '">' +
            (o.depth ? '<span class="qsp-list__nest"></span>' : '') +
            (o.title || o.type) + '</span>' +
            (source ? '<span class="qsp-list__via">' + source + '</span>' : '') +
            '<span class="qsp-list__meta">' + (geo
              ? Math.round(geo.w * 100) + ' x ' + Math.round(geo.h * 100)
              : 'no size') + '</span>';
          var take = document.createElement('button');
          take.className = 'qsp-mini';
          take.textContent = 'Pick';
          take.addEventListener('click', function () {
            state.sourceId = o.id;
            state.sourceLabel = o.title || o.type;
            ui.setSource({
              label: state.sourceLabel,
              size: geo ? Math.round(geo.w * 100) + ' × ' + Math.round(geo.h * 100) : 'style only'
            });
            ui.setStatus('Format picked from ' + state.sourceLabel, 'ok');
          });
          row.appendChild(take);
          panel.appendChild(row);
        });
        if (missing.length) {
          var warn = document.createElement('div');
          warn.className = 'qsp-list__warn';
          warn.textContent = missing.length + ' object(s) not found in the page. ' +
            'They can still be picked from this list, but not with the selector.';
          panel.appendChild(warn);
        }
      }).catch(fail);
    }

    ui = UI.create({
      onPick: pickSource,
      onApply: applyTo,
      onArrange: arrange,
      onModes: function () { ui.setStatus('Modes updated'); },
      onUndo: function () {
        ui.setBusy(true);
        engine.undo().then(function (label) {
          ui.setBusy(false);
          ui.setStatus('Undone: ' + label, 'ok');
          return reload();
        }).catch(fail);
      },
      onSave: function () {
        ui.setBusy(true);
        Promise.resolve(engine.save()).then(function () {
          ui.setBusy(false);
          ui.setStatus('App saved', 'ok');
        }).catch(fail);
      },
      onRefresh: function () {
        reload().then(function () {
          ui.setStatus(engine.objects().length + ' object(s) read on the sheet', 'ok');
        }).catch(fail);
      },
      onClearSource: function () {
        state.sourceId = null;
        state.sourceLabel = null;
        state.sticky = false;
        ui.setSticky(false);
        ui.setSource(null);
        ui.setStatus('Format cleared. Pick a new one with the selector');
      },
      onLayout: renderLayout,
      onList: renderList,
      onDiag: function () {
        ui.setBusy(true);
        reload().then(function () {
          var report = engine.dump();
          report.dom = picker.domReport(items(false));
          report.raccourcis = raccourcis;
          var text = JSON.stringify(report, null, 2);
          console.log('[QS Format Painter] diagnostic', report);
          ui.setBusy(false);
          var sansGeo = report.objects.filter(function (o) { return o.geometrie === 'aucune'; }).length;
          function done(ok) {
            ui.setStatus((ok ? 'Diagnostic copied. ' : 'Diagnostic in the console. ') +
              report.objects.length + ' object(s), ' + sansGeo + ' without a size', 'ok');
          }
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
          } else {
            done(false);
          }
        }).catch(fail);
      }
    });

    ui.mount();
    ui.setSource(null);

    var raccourcis = { altVus: 0, declenches: 0, dernier: null };

    function saisieEnCours(cible) {
      if (!cible || !cible.tagName) { return false; }
      var t = cible.tagName.toLowerCase();
      return t === 'input' || t === 'textarea' || t === 'select' || cible.isContentEditable;
    }

    function onKey(e) {
      if (!e.altKey || e.metaKey || e.__qspVu) { return; }
      e.__qspVu = true;
      raccourcis.altVus++;
      raccourcis.dernier = { key: e.key, code: e.code, ctrl: e.ctrlKey };
      if (picker.isOpen() || saisieEnCours(e.target)) { return; }

      var code = e.code || '';
      var touche = String(e.key || '').toLowerCase();
      var estC = code === 'KeyC' || touche === 'c' || touche === 'ç';
      var estV = code === 'KeyV' || touche === 'v' || touche === '√';
      if (!estC && !estV) { return; }

      e.preventDefault();
      e.stopPropagation();
      raccourcis.declenches++;
      ui.expand();
      if (estC) { pickSource(); } else { applyTo(false); }
    }

    window.addEventListener('keydown', onKey, true);
    document.addEventListener('keydown', onKey, true);

    reload().then(function () {
      ui.setStatus(engine.objects().length + ' object(s) read. Pick a format with the selector');
    }).catch(fail);

    singleton = {
      destroy: function () {
        window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('keydown', onKey, true);
        picker.close();
        ui.destroy();
        singleton = null;
      }
    };
    return singleton;
  }

  return {
    initialProperties: {},
    definition: {
      type: 'items',
      component: 'accordion',
      items: {
        usage: {
          type: 'items',
          label: 'How to use',
          items: {
            note: {
              component: 'text',
              label: 'Developer tool. Drop this object anywhere on the sheet, switch to analysis ' +
                'mode, then use the floating toolbar. Changes are written to the app and must be saved.'
            }
          }
        },
        about: {
          type: 'items',
          label: 'About',
          items: {
            author: {
              component: 'text',
              label: 'QS Format Painter'
            },
            linkedin: {
              component: 'link',
              label: 'by Idriss Benbassou (LinkedIn)',
              url: 'https://www.linkedin.com/in/idriss-benbassou/'
            },
            metadata: {
              component: 'link',
              label: 'QS Metadata Explorer, export all metadata in 1 click',
              url: 'https://www.idriss-benbassou.com/qs-metadata-explorer-export-all-metadata-in-1-click/'
            }
          }
        }
      }
    },
    support: { snapshot: false, export: false, exportData: false },

    controller: ['$scope', '$element', function ($scope, $element) {
      $scope.$on('$destroy', function () {
        var inst = $element[0].__qspInstance;
        if (inst) { inst.destroy(); $element[0].__qspInstance = null; }
      });
    }],

    paint: function ($element, layout) {
      var host = $element[0];
      host.innerHTML = '<div class="qsp-cell" title="QS Format Painter, developer tool. ' +
        'Remember to delete this object from the sheet once you are done.">' +
        '<span class="qsp-cell__dot"></span>' +
        '<span class="qsp-cell__label">QS Format Painter</span>' +
        '<span class="qsp-cell__hint">dev tool, dont forget to delete this object before going to production</span>' +
        '</div>';
      if (!host.__qspInstance) {
        host.__qspInstance = boot(layout.qInfo.qId);
      }
      host.querySelector('.qsp-cell').addEventListener('click', function () {
        if (singleton) { document.querySelector('.qsp-root').classList.add('is-open'); }
      });
      return qlik.Promise.resolve();
    }
  };
});
