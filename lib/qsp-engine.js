define([], function () {
  'use strict';

  var ID_KEYS = ['name', 'refId', 'id', 'objectId', 'qId', 'cellId', 'childId'];

  var AXES = {
    x: ['x', 'left', 'posX', 'xPos', 'startX', 'col', 'l'],
    y: ['y', 'top', 'posY', 'yPos', 'startY', 'row', 't'],
    w: ['width', 'w', 'sizeX', 'colspan', 'cols', 'dx'],
    h: ['height', 'h', 'sizeY', 'rowspan', 'rows', 'dy']
  };

  var GRID_KEYS = ['col', 'row', 'colspan', 'rowspan', 'cols', 'rows'];

  var GEOM_HOLDERS = [null, 'bounds', 'layout', 'position', 'rect', 'size',
    'layoutContainer', 'containerBounds', 'parentBounds', 'layoutOptions'];

  var SKIP_KEYS = ['qHyperCubeDef', 'qListObjectDef', 'qDef', 'qDimensions', 'qMeasures',
    'qAttributeExpressions', 'qAttributeDimensions', 'dataDefinition', 'components',
    'color', 'colorMap', 'qLayoutExclude', 'qUndoExclude', 'legend', 'dataPoint'];

  var DIG_DEPTH = 3;

  var MARGE = 0.012;

  var NEVER_COPY = ['qInfo', 'qMetaDef', 'qExtendsId', 'visualization', 'qChildListDef',
    'qStateName', 'qHyperCubeDef', 'qListObjectDef', 'qUndoExclude', 'qLayoutExclude',
    'children', 'cells', 'columns', 'rows', 'gridResolution', 'title', 'subtitle',
    'footnote', 'description', 'sheetId', 'qSelectionInfo'];

  function isLinkKey(k) {
    return /id$/i.test(k);
  }

  var STYLE_ONLY = ['components', 'showTitles', 'showDetails', 'disableNavMenu',
    'backgroundColor', 'backgroundImage', 'borderRadius', 'borderColor', 'borderWidth',
    'showBorder', 'boxShadow', 'style', 'theme'];

  function isObj(v) { return v && typeof v === 'object'; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function num(v) {
    if (typeof v === 'number') { return isFinite(v) ? v : null; }
    if (typeof v === 'string') {
      var m = /^\s*(-?\d+(?:\.\d+)?)\s*%?\s*$/.exec(v);
      return m ? parseFloat(m[1]) : null;
    }
    return null;
  }

  function put(obj, key, value, rounded) {
    var cur = obj[key];
    var v = rounded ? Math.round(value) : value;
    if (typeof cur === 'string') {
      obj[key] = cur.indexOf('%') >= 0 ? v + '%' : String(v);
    } else {
      obj[key] = v;
    }
  }

  function repsAt(obj, grid, label) {
    if (!isObj(obj) || Array.isArray(obj)) { return []; }
    var map = {};
    ['x', 'y', 'w', 'h'].forEach(function (axis) {
      for (var i = 0; i < AXES[axis].length; i++) {
        var key = AXES[axis][i];
        if (num(obj[key]) !== null) { map[axis] = key; return; }
      }
    });
    if (!map.x || !map.y || !map.w || !map.h) { return []; }

    var vals = {
      x: num(obj[map.x]), y: num(obj[map.y]),
      w: num(obj[map.w]), h: num(obj[map.h])
    };

    if (vals.w <= 0 || vals.h <= 0) { return []; }

    var isGrid = GRID_KEYS.indexOf(map.w) !== -1 && GRID_KEYS.indexOf(map.x) !== -1;
    var sx, sy;
    if (isGrid) {
      sx = grid.cols; sy = grid.rows;
    } else {
      var pct = [vals.x, vals.y, vals.w, vals.h].some(function (v) { return v > 1.5; });
      sx = sy = pct ? 100 : 1;
    }
    return [{
      obj: obj, map: map, scheme: isGrid ? 'grid' : 'free',
      sx: sx, sy: sy, holder: label || 'racine'
    }];
  }

  function repsFor(node, grid) {
    var reps = [];
    GEOM_HOLDERS.forEach(function (holder) {
      var obj = holder ? node[holder] : node;
      reps = reps.concat(repsAt(obj, grid, holder || 'racine'));
    });
    if (reps.length) { return reps; }

    var found = null;
    (function dig(v, depth, path) {
      if (found || !isObj(v) || depth > DIG_DEPTH) { return; }
      Object.keys(v).forEach(function (k) {
        if (found || SKIP_KEYS.indexOf(k) !== -1) { return; }
        var child = v[k];
        if (!isObj(child)) { return; }
        var here = path ? path + '.' + k : k;
        var r = repsAt(child, grid, here);
        if (r.length) { found = r; return; }
        dig(child, depth + 1, here);
      });
    })(node, 0, '');
    return found || [];
  }

  function makeDescriptor(id, node, grid) {
    var reps = repsFor(node, grid);
    if (!reps.length) { return null; }
    var primary = reps.filter(function (r) { return r.scheme === 'free'; })[0] || reps[0];
    return {
      id: id,
      node: node,
      reps: reps,
      scheme: primary.scheme,
      where: reps.map(function (r) { return (r.holder || 'racine') + ':' + r.map.w; }).join(', '),
      get: function () {
        var m = primary.map, o = primary.obj;
        return {
          x: num(o[m.x]) / primary.sx,
          y: num(o[m.y]) / primary.sy,
          w: num(o[m.w]) / primary.sx,
          h: num(o[m.h]) / primary.sy
        };
      },
      set: function (g) {
        reps.forEach(function (r) {
          var m = r.map, o = r.obj, isGrid = r.scheme === 'grid';
          put(o, m.x, clamp01(g.x) * r.sx, isGrid);
          put(o, m.y, clamp01(g.y) * r.sy, isGrid);
          put(o, m.w, Math.max(isGrid ? 1 / r.sx : 0, clamp01(g.w)) * r.sx, isGrid);
          put(o, m.h, Math.max(isGrid ? 1 / r.sy : 0, clamp01(g.h)) * r.sy, isGrid);
        });
      }
    };
  }

  function collectNodes(props, grid, knownIds) {
    var out = [];
    var known = knownIds || {};

    function idOf(node, parentKey) {
      for (var i = 0; i < ID_KEYS.length; i++) {
        var c = node[ID_KEYS[i]];
        if (typeof c === 'string' && c.length > 0 && c.length < 64) { return c; }
      }
      if (parentKey && known[parentKey]) { return parentKey; }
      var keys = Object.keys(node);
      for (var j = 0; j < keys.length; j++) {
        var v = node[keys[j]];
        if (typeof v === 'string' && known[v]) { return v; }
      }
      return null;
    }

    (function walk(v, parentKey) {
      if (Array.isArray(v)) {
        v.forEach(function (item) { walk(item, null); });
        return;
      }
      if (!isObj(v)) { return; }
      var id = idOf(v, parentKey);
      if (id) {
        var d = makeDescriptor(id, v, grid);
        if (d) { out.push(d); }
      }
      Object.keys(v).forEach(function (k) {
        if (SKIP_KEYS.indexOf(k) === -1) { walk(v[k], k); }
      });
    })(props, null);

    return out;
  }

  function collectAnonymous(props, grid, claimed) {
    var out = [];
    (function walk(v, path, depth) {
      if (!isObj(v) || depth > 6) { return; }
      if (Array.isArray(v)) {
        v.forEach(function (item, i) { walk(item, path + '.' + i, depth + 1); });
        return;
      }
      if (path && claimed.indexOf(v) === -1) {
        var reps = [];
        GEOM_HOLDERS.forEach(function (holder) {
          var obj = holder ? v[holder] : v;
          reps = reps.concat(repsAt(obj, grid, holder || 'racine'));
        });
        if (reps.length) {
          out.push({ path: path, node: v });
          return;
        }
      }
      Object.keys(v).forEach(function (k) {
        if (SKIP_KEYS.indexOf(k) === -1) { walk(v[k], path ? path + '.' + k : k, depth + 1); }
      });
    })(props, '', 0);
    return out;
  }

  function groupAnonymous(anon) {
    var groups = {};
    anon.forEach(function (a) {
      var parent = a.path.indexOf('.') === -1 ? '' : a.path.replace(/\.[^.]+$/, '');
      if (!groups[parent]) { groups[parent] = []; }
      groups[parent].push(a);
    });
    return Object.keys(groups).map(function (k) {
      return { path: k, items: groups[k] };
    }).sort(function (a, b) {
      if (b.items.length !== a.items.length) { return b.items.length - a.items.length; }
      return a.path.split('.').length - b.path.split('.').length;
    });
  }

  function titleOf(props) {
    var t = props && props.title;
    if (typeof t === 'string') { return t; }
    if (isObj(t) && t.qStringExpression) { return '(expression)'; }
    return '';
  }

  function create(app) {
    var doc = app.model.enigmaModel;
    var models = {};
    var index = null;
    var undoStack = [];

    function getModel(id) {
      if (models[id]) { return Promise.resolve(models[id]); }
      return doc.getObject(id).then(function (m) { models[id] = m; return m; });
    }

    function getProps(id) {
      return getModel(id)
        .then(function (m) { return m.getProperties(); })
        .then(function (props) { return clone(props); });
    }

    function childIdsOf(id) {
      return getModel(id).then(function (m) {
        if (typeof m.getChildInfos !== 'function') { return []; }
        return m.getChildInfos();
      }).then(function (list) {
        return (list || []).map(function (c) { return c.qId; })
          .filter(function (v) { return !!v; });
      }).catch(function () { return []; });
    }

    function resolveSheetId(qlik, selfId) {
      try {
        var nav = qlik.navigation.getCurrentSheetId();
        if (nav && nav.sheetId) { return Promise.resolve(nav.sheetId); }
      } catch (e) { /* repli */ }
      return doc.createSessionObject({
        qInfo: { qType: 'qsp-sheets' },
        qAppObjectListDef: { qType: 'sheet', qData: { cells: '/cells' } }
      }).then(function (so) {
        return so.getLayout().then(function (lay) {
          doc.destroySessionObject(so.id);
          var its = (lay.qAppObjectList && lay.qAppObjectList.qItems) || [];
          var hit = its.filter(function (it) {
            return (it.qData.cells || []).some(function (c) { return c.name === selfId; });
          })[0];
          return hit ? hit.qInfo.qId : null;
        });
      });
    }

    function refresh(qlik, selfId) {
      return resolveSheetId(qlik, selfId).then(function (sheetId) {
        if (!sheetId) { throw new Error('Current sheet not found'); }
        var holders = {};
        var objects = [];
        var propsCache = {};
        var seen = {};
        seen[sheetId] = true;

        function scan(id, depth, knownProps) {
          var pp = knownProps ? Promise.resolve(knownProps) : getProps(id);
          return Promise.all([pp, childIdsOf(id)]).then(function (res) {
            var props = res[0];
            var engineChildren = res[1];
            propsCache[id] = props;
            var grid = {
              cols: num(props.columns) || 24,
              rows: num(props.rows) || 12
            };

            var known = {};
            engineChildren.forEach(function (cid) { known[cid] = true; });

            var entry = holders[id] || { id: id, nodes: {} };
            entry.props = props;
            entry.grid = grid;
            entry.erreur = null;
            try {
              collectNodes(props, grid, known).forEach(function (d) {
                if (d.id !== id) { entry.nodes[d.id] = d; }
              });
            } catch (err) {
              entry.erreur = err && err.message ? err.message : String(err);
            }
            try {
              var claimed = Object.keys(entry.nodes).map(function (k) { return entry.nodes[k].node; });
              entry.anon = groupAnonymous(collectAnonymous(props, grid, claimed));
            } catch (err2) {
              entry.anon = [];
            }
            holders[id] = entry;

            return Promise.resolve().then(function () {
              var all = {};
              Object.keys(entry.nodes).forEach(function (k) { all[k] = true; });
              engineChildren.forEach(function (k) { all[k] = true; });

              var kids = Object.keys(all).filter(function (cid) {
                return cid !== id && !seen[cid];
              });
              kids.forEach(function (cid) { seen[cid] = true; });

              return Promise.all(kids.map(function (cid) {
                return getProps(cid).then(function (cp) {
                  propsCache[cid] = cp;
                  objects.push({
                    id: cid,
                    type: (cp.qInfo && cp.qInfo.qType) || '?',
                    title: titleOf(cp),
                    ownerId: id,
                    depth: depth
                  });
                  if (!entry.nodes[cid]) {
                    var own = makeDescriptor(cid, cp, grid);
                    if (own) {
                      holders[cid] = { id: cid, props: cp, grid: grid, nodes: {} };
                      holders[cid].nodes[cid] = own;
                    }
                  }
                  return depth < 3 ? scan(cid, depth + 1, cp) : null;
                }).catch(function () { return null; });
              }));
            });
          });
        }

        return scan(sheetId, 0, null).then(function () {
          Object.keys(holders).forEach(function (hid) {
            var h = holders[hid];
            if (hid !== sheetId && !Object.keys(h.nodes).length && !(h.anon && h.anon.length)) {
              delete holders[hid];
            }
          });
          index = {
            sheetId: sheetId,
            holders: holders,
            objects: objects,
            props: propsCache
          };
          return index;
        });
      });
    }

    function ensureIndex() {
      if (!index) { throw new Error('Index not built, click Reload sheet'); }
      return index;
    }

    function holderOf(childId) {
      var idx = ensureIndex();
      var o = idx.objects.filter(function (x) { return x.id === childId; })[0];
      if (o && idx.holders[o.ownerId] && idx.holders[o.ownerId].nodes[childId]) {
        return idx.holders[o.ownerId];
      }
      if (idx.holders[childId] && idx.holders[childId].nodes[childId]) {
        return idx.holders[childId];
      }
      return null;
    }

    function descriptorOf(id) {
      var h = holderOf(id);
      return h ? h.nodes[id] : null;
    }

    function layoutNumbers(props) {
      var names = [];
      ['x', 'y', 'w', 'h'].forEach(function (a) { names = names.concat(AXES[a]); });
      var out = [];
      (function walk(v, path, depth) {
        if (out.length > 40 || !isObj(v) || depth > 6) { return; }
        Object.keys(v).forEach(function (k) {
          if (SKIP_KEYS.indexOf(k) !== -1) { return; }
          var child = v[k];
          var here = path ? path + '.' + k : k;
          if (isObj(child)) { walk(child, here, depth + 1); return; }
          if (names.indexOf(k) !== -1 && num(child) !== null) {
            out.push({ chemin: here, valeur: child });
          }
        });
      })(props, '', 0);
      return out;
    }

    function reasonFor(id) {
      var idx = ensureIndex();
      var o = idx.objects.filter(function (x) { return x.id === id; })[0];
      if (!o) { return { probleme: 'objet absent de l index' }; }
      var owner = idx.holders[o.ownerId];
      return {
        id: id,
        type: o.type,
        ownerId: o.ownerId,
        ownerType: (idx.props[o.ownerId] && idx.props[o.ownerId].qInfo &&
          idx.props[o.ownerId].qInfo.qType) || null,
        ownerConnu: !!owner,
        ownerErreur: owner ? owner.erreur : null,
        noeudsChezOwner: owner ? Object.keys(owner.nodes) : [],
        noeudPourCetObjet: !!(owner && owner.nodes[id]),
        geometriePropre: !!(idx.holders[id] && idx.holders[id].nodes[id]),
        clesOwner: idx.props[o.ownerId] ? Object.keys(idx.props[o.ownerId]) : [],
        clesObjet: idx.props[id] ? Object.keys(idx.props[id]) : [],
        nombresOwner: idx.props[o.ownerId] ? layoutNumbers(idx.props[o.ownerId]) : [],
        nombresObjet: idx.props[id] ? layoutNumbers(idx.props[id]) : []
      };
    }

    function pendingBindings() {
      var idx = ensureIndex();
      var out = [];
      Object.keys(idx.holders).forEach(function (hid) {
        var h = idx.holders[hid];
        if (!h.anon || !h.anon.length) { return; }
        var orphans = idx.objects.filter(function (o) {
          return o.ownerId === hid && !h.nodes[o.id];
        }).map(function (o) { return o.id; });
        if (!orphans.length) { return; }
        // Le groupe dont la taille colle au nombre d'orphelins, sinon le plus gros.
        var group = h.anon.filter(function (g) { return g.items.length === orphans.length; })[0] || h.anon[0];
        out.push({
          ownerId: hid,
          chemin: group.path,
          blocs: group.items.map(function (it, i) {
            var d = makeDescriptor('?', it.node, h.grid);
            return { index: i, chemin: it.path, bounds: d ? d.get() : null };
          }),
          orphelins: orphans
        });
      });
      return out;
    }

    function bindAnonymous(ownerId, pairs) {
      var idx = ensureIndex();
      var h = idx.holders[ownerId];
      if (!h || !h.anon || !h.anon.length) { return 0; }
      var orphans = idx.objects.filter(function (o) {
        return o.ownerId === ownerId && !h.nodes[o.id];
      }).length;
      var group = h.anon.filter(function (g) { return g.items.length === orphans; })[0] || h.anon[0];
      var done = 0;
      pairs.forEach(function (p) {
        var item = group.items[p.index];
        if (!item || !p.id) { return; }
        var d = makeDescriptor(p.id, item.node, h.grid);
        if (d) { h.nodes[p.id] = d; done++; }
      });
      return done;
    }

    function geometrySource(id) {
      var h = holderOf(id);
      if (!h) { return 'aucune'; }
      return h.id === id ? 'objet' : 'parent';
    }

    var currentGroup = null;

    function pushUndo(label, snapshots) {
      undoStack.push({ label: label, snapshots: snapshots, group: currentGroup });
      if (undoStack.length > 40) { undoStack.shift(); }
    }

    function writeHolders(label, touched, snapshots) {
      var idx = ensureIndex();
      var ids = Object.keys(touched);
      if (!ids.length) { return Promise.reject(new Error('No editable target')); }
      return Promise.all(ids.map(function (hid) {
        return getModel(hid).then(function (m) {
          return m.setProperties(idx.holders[hid].props);
        }).catch(function (err) {
          var msg = err && err.message ? err.message : String(err);
          throw new Error('Write refused on ' + hid + ': ' + msg);
        });
      })).then(function () {
        pushUndo(label, ids.map(function (hid) {
          return { id: hid, props: snapshots[hid] };
        }));
        return ids.length;
      });
    }

    function applyGeometry(sourceId, targetIds, opts) {
      var src = descriptorOf(sourceId);
      if (!src) {
        return Promise.reject(new Error(
          'Source size not found in the model, please send the diagnostic'));
      }
      var g = src.get();
      var touched = {}, snapshots = {};

      targetIds.forEach(function (tid) {
        var d = descriptorOf(tid);
        var h = holderOf(tid);
        if (!d || !h || tid === sourceId) { return; }
        if (!snapshots[h.id]) { snapshots[h.id] = clone(h.props); }
        var cur = d.get();
        d.set({
          x: opts.position ? g.x : cur.x,
          y: opts.position ? g.y : cur.y,
          w: opts.size ? g.w : cur.w,
          h: opts.size ? g.h : cur.h
        });
        touched[h.id] = true;
      });

      return writeHolders('Geometrie', touched, snapshots);
    }

    function pointsToObject(value) {
      var idx = index;
      if (!idx || !value) { return false; }
      var ids = {};
      idx.objects.forEach(function (o) { ids[o.id] = true; });
      ids[idx.sheetId] = true;
      var trouve = false;
      (function scan(v, depth) {
        if (trouve || depth > 4) { return; }
        if (typeof v === 'string') { trouve = !!ids[v]; return; }
        if (isObj(v)) { Object.keys(v).forEach(function (k) { scan(v[k], depth + 1); }); }
      })(value, 0);
      return trouve;
    }

    function applyStyle(sourceId, targetIds) {
      return getProps(sourceId).then(function (srcProps) {
        var srcType = srcProps.qInfo.qType;
        var snapshots = [];
        return Promise.all(targetIds.filter(function (t) { return t !== sourceId; })
          .map(function (tid) {
            return getModel(tid).then(function (m) {
              return getProps(tid).then(function (tp) {
                snapshots.push({ id: tid, props: clone(tp) });
                var sameType = tp.qInfo.qType === srcType;
                var keys = sameType
                  ? Object.keys(srcProps).filter(function (k) {
                    return NEVER_COPY.indexOf(k) === -1 && !isLinkKey(k) && !pointsToObject(srcProps[k]);
                  })
                  : STYLE_ONLY.filter(function (k) { return k in srcProps; });
                keys.forEach(function (k) { tp[k] = clone(srcProps[k]); });
                return m.setProperties(tp);
              });
            });
          })).then(function (r) {
            if (snapshots.length) { pushUndo('Style', snapshots); }
            return r.length;
          });
      });
    }

    function arrange(mode, ids, referenceId) {
      var tous = ids.map(function (id) {
        return { id: id, d: descriptorOf(id), h: holderOf(id) };
      }).filter(function (it) { return it.d && it.h; });
      if (!tous.length) { return Promise.reject(new Error('No object with a size in the selection')); }

      var ancre = tous.filter(function (it) { return it.id === referenceId; })[0];
      if (!ancre) {
        var comptes = {};
        tous.forEach(function (it) { comptes[it.h.id] = (comptes[it.h.id] || 0) + 1; });
        var majoritaire = Object.keys(comptes).sort(function (a, b) {
          return comptes[b] - comptes[a];
        })[0];
        ancre = tous.filter(function (it) { return it.h.id === majoritaire; })[0];
      }

      var live = tous.filter(function (it) { return it.h.id === ancre.h.id; });
      var ignores = tous.length - live.length;
      if (live.length < 2) {
        return Promise.reject(new Error(
          'Select at least two objects sitting in the same container, or on the sheet'));
      }

      var ref = live.filter(function (it) { return it.id === referenceId; })[0] || live[0];
      var rg = ref.d.get();
      var touched = {}, snapshots = {};

      function write(it, g) {
        if (!snapshots[it.h.id]) { snapshots[it.h.id] = clone(it.h.props); }
        it.d.set(g);
        touched[it.h.id] = true;
      }

      if (mode === 'dist-h' || mode === 'dist-v') {
        var horiz = mode === 'dist-h';
        var sorted = live.slice().sort(function (a, b) {
          return horiz ? a.d.get().x - b.d.get().x : a.d.get().y - b.d.get().y;
        });
        var first = sorted[0].d.get();
        var last = sorted[sorted.length - 1].d.get();
        var span = horiz ? (last.x + last.w) - first.x : (last.y + last.h) - first.y;
        var used = sorted.reduce(function (acc, it) {
          var g = it.d.get();
          return acc + (horiz ? g.w : g.h);
        }, 0);
        var gap = (span - used) / (sorted.length - 1);
        var cursor = horiz ? first.x : first.y;
        sorted.forEach(function (it) {
          var g = it.d.get();
          if (horiz) { g.x = cursor; cursor += g.w + gap; }
          else { g.y = cursor; cursor += g.h + gap; }
          write(it, g);
        });
      } else {
        live.forEach(function (it) {
          if (it.id === ref.id) { return; }
          var g = it.d.get();
          switch (mode) {
            case 'left': g.x = rg.x; break;
            case 'hcenter': g.x = rg.x + (rg.w - g.w) / 2; break;
            case 'right': g.x = rg.x + rg.w - g.w; break;
            case 'top': g.y = rg.y; break;
            case 'vcenter': g.y = rg.y + (rg.h - g.h) / 2; break;
            case 'bottom': g.y = rg.y + rg.h - g.h; break;
            case 'width': g.w = rg.w; break;
            case 'height': g.h = rg.h; break;
            case 'size': g.w = rg.w; g.h = rg.h; break;
            default: return;
          }
          write(it, g);
        });
      }

      return writeHolders(mode, touched, snapshots).then(function () {
        return { modifies: live.length, ignores: ignores, repere: ancre.h.id };
      });
    }

    function layout(mode, ids, opts) {
      opts = opts || {};
      var gap = typeof opts.gap === 'number' ? opts.gap : 0.012;

      var tous = ids.map(function (id) {
        return { id: id, d: descriptorOf(id), h: holderOf(id) };
      }).filter(function (it) { return it.d && it.h; });
      if (!tous.length) { return Promise.reject(new Error('No object with a size in the selection')); }

      var comptes = {};
      tous.forEach(function (it) { comptes[it.h.id] = (comptes[it.h.id] || 0) + 1; });
      var majoritaire = Object.keys(comptes).sort(function (a, b) { return comptes[b] - comptes[a]; })[0];
      var live = tous.filter(function (it) { return it.h.id === majoritaire; });
      var ignores = tous.length - live.length;

      var n = live.length;
      var cols, rows;
      var m = /^grid-(\d+)$/.exec(mode);
      if (mode === 'row') { cols = n; rows = 1; }
      else if (mode === 'column') { cols = 1; rows = n; }
      else if (m) { cols = Math.min(n, parseInt(m[1], 10)); rows = Math.ceil(n / cols); }
      else { cols = Math.ceil(Math.sqrt(n)); rows = Math.ceil(n / cols); }

      var ref = live[0].d.get();
      var origine, cw, chh;
      if (opts.zone === 'reference' || opts.zone === 'selection') {
        origine = { x: ref.x, y: ref.y };
        cw = ref.w;
        chh = ref.h;
      } else if (mode === 'row') {
        origine = { x: MARGE, y: ref.y };
        cw = (1 - 2 * MARGE - gap * (cols - 1)) / cols;
        chh = ref.h;
      } else if (mode === 'column') {
        origine = { x: ref.x, y: MARGE };
        cw = ref.w;
        chh = (1 - 2 * MARGE - gap * (rows - 1)) / rows;
      } else {
        origine = { x: MARGE, y: MARGE };
        cw = (1 - 2 * MARGE - gap * (cols - 1)) / cols;
        chh = (1 - 2 * MARGE - gap * (rows - 1)) / rows;
      }
      if (cw <= 0.005 || chh <= 0.005) {
        return Promise.reject(new Error('Too many objects for this template, or the gap is too wide'));
      }

      var deborde = origine.x + cols * (cw + gap) - gap > 1.001 ||
        origine.y + rows * (chh + gap) - gap > 1.001;

      var touched = {}, snapshots = {};
      live.forEach(function (it, i) {
        if (!snapshots[it.h.id]) { snapshots[it.h.id] = clone(it.h.props); }
        var c = i % cols, r = Math.floor(i / cols);
        it.d.set({
          x: origine.x + c * (cw + gap),
          y: origine.y + r * (chh + gap),
          w: cw,
          h: chh
        });
        touched[it.h.id] = true;
      });

      return writeHolders('layout ' + mode, touched, snapshots).then(function () {
        return { modifies: n, ignores: ignores, cols: cols, rows: rows, deborde: deborde };
      });
    }

    function undo() {
      var entry = undoStack.pop();
      if (!entry) { return Promise.reject(new Error('Nothing to undo')); }
      var lot = [entry];
      while (entry.group && undoStack.length &&
        undoStack[undoStack.length - 1].group === entry.group) {
        lot.push(undoStack.pop());
      }
      var snapshots = [];
      lot.forEach(function (e) { snapshots = snapshots.concat(e.snapshots); });
      return Promise.all(snapshots.map(function (s) {
        return getModel(s.id).then(function (m) { return m.setProperties(s.props); });
      })).then(function () {
        return lot.map(function (e) { return e.label; }).join(' + ');
      });
    }

    function dump() {
      var idx = ensureIndex();
      var report = {
        sheetId: idx.sheetId,
        holders: Object.keys(idx.holders),
        objects: idx.objects.map(function (o) {
          var d = descriptorOf(o.id);
          return {
            id: o.id,
            type: o.type,
            title: o.title,
            ownerId: o.ownerId,
            depth: o.depth,
            geometrie: geometrySource(o.id),
            ou: d ? d.where : null,
            bounds: d ? d.get() : null
          };
        }),
        proprietes: {}
      };

      Object.keys(idx.holders).forEach(function (hid) {
        if (hid !== idx.sheetId && idx.props[hid]) { report.proprietes[hid] = idx.props[hid]; }
      });

      report.pourquoi = idx.objects.filter(function (o) { return geometrySource(o.id) === 'aucune'; })
        .slice(0, 6)
        .map(function (o) { return reasonFor(o.id); });
      idx.objects.filter(function (o) { return geometrySource(o.id) === 'aucune'; })
        .slice(0, 4)
        .forEach(function (o) {
          if (idx.props[o.id]) { report.proprietes[o.id] = idx.props[o.id]; }
          if (idx.props[o.ownerId]) { report.proprietes[o.ownerId] = idx.props[o.ownerId]; }
        });
      if (idx.props[idx.sheetId]) {
        report.proprietes[idx.sheetId] = { cells: idx.props[idx.sheetId].cells };
      }
      return report;
    }

    return {
      refresh: refresh,
      objects: function () { return index ? index.objects.slice() : []; },
      sheetId: function () { return index ? index.sheetId : null; },
      hasGeometry: function (id) { return !!descriptorOf(id); },
      geometrySource: geometrySource,
      reasonFor: reasonFor,
      pendingBindings: pendingBindings,
      bindAnonymous: bindAnonymous,
      geometryOf: function (id) {
        var d = descriptorOf(id);
        return d ? d.get() : null;
      },
      propsOf: getProps,
      applyGeometry: applyGeometry,
      applyStyle: applyStyle,
      arrange: arrange,
      layout: layout,
      undo: undo,
      undoDepth: function () { return undoStack.length; },
      beginGroup: function () { currentGroup = 'g' + Date.now() + Math.random(); return currentGroup; },
      endGroup: function () { currentGroup = null; },
      dump: dump,
      save: function () { return app.doSave(); }
    };
  }

  return { create: create };
});
