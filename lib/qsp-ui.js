define([], function () {
  'use strict';

  var STORE = 'qsp.ui.v2';
  var VERSION = '1.17.4';

  var I = {
    dropper: '<path d="M11.4 1.3a2.5 2.5 0 0 1 3.3 3.3l-1.6 1.6-3.3-3.3z"/>' +
      '<path d="M9.2 4.4l2.4 2.4-1.2 1.2-2.4-2.4z"/>' +
      '<path d="M8.7 6.6l.7.7-4.9 4.9-2.3.9.9-2.3z"/>',
    paste: '<path d="M6.1 1.2h3.8v1.5H6.1z"/>' +
      '<path fill-rule="evenodd" d="M3.2 2.7h9.6v12.1H3.2zm1.5 1.5v9.1h6.6V4.2z"/>' +
      '<path d="M7.5 4.9h1v1.6h-1z"/><path d="M6.3 6.5h3.4v1.3H6.3z"/>' +
      '<path d="M6.5 8h3l-.7 2.6H7.2z"/>',
    left: '<rect x="1" y="2" width="1.4" height="12"/><rect x="4" y="3.2" width="9" height="3.6"/><rect x="4" y="9.2" width="6" height="3.6"/>',
    hcenter: '<rect x="7.3" y="2" width="1.4" height="12"/><rect x="3" y="3.2" width="10" height="3.6"/><rect x="5" y="9.2" width="6" height="3.6"/>',
    right: '<rect x="13.6" y="2" width="1.4" height="12"/><rect x="3" y="3.2" width="9" height="3.6"/><rect x="6" y="9.2" width="6" height="3.6"/>',
    top: '<rect x="2" y="1" width="12" height="1.4"/><rect x="3.2" y="4" width="3.6" height="9"/><rect x="9.2" y="4" width="3.6" height="6"/>',
    vcenter: '<rect x="2" y="7.3" width="12" height="1.4"/><rect x="3.2" y="3" width="3.6" height="10"/><rect x="9.2" y="5" width="3.6" height="6"/>',
    bottom: '<rect x="2" y="13.6" width="12" height="1.4"/><rect x="3.2" y="3" width="3.6" height="9"/><rect x="9.2" y="6" width="3.6" height="6"/>',
    width: '<rect x="2" y="3" width="12" height="3.4"/><rect x="2" y="9.6" width="12" height="3.4"/><rect x="1" y="1" width="1" height="14"/><rect x="14" y="1" width="1" height="14"/>',
    height: '<rect x="3" y="2" width="3.4" height="12"/><rect x="9.6" y="2" width="3.4" height="12"/><rect x="1" y="1" width="14" height="1"/><rect x="1" y="14" width="14" height="1"/>',
    size: '<rect x="1.5" y="1.5" width="6" height="6"/><rect x="8.5" y="8.5" width="6" height="6"/>',
    disth: '<rect x="1" y="1" width="1" height="14"/><rect x="14" y="1" width="1" height="14"/><rect x="3.5" y="4" width="3" height="8"/><rect x="9.5" y="4" width="3" height="8"/>',
    distv: '<rect x="1" y="1" width="14" height="1"/><rect x="1" y="14" width="14" height="1"/><rect x="4" y="3.5" width="8" height="3"/><rect x="4" y="9.5" width="8" height="3"/>',
    undo: '<path d="M8 3.5A6.5 6.5 0 1 1 2.6 9.4l1.7-.5A4.7 4.7 0 1 0 8 5.3H10L7 8.6 4 5.3h2z"/>',
    save: '<path d="M2.5 2h9L14 4.5V14H2.5zM5 3v3.5h6V3zM4.5 9.5h7V14h-7z"/>',
    list: '<rect x="2" y="3" width="12" height="1.6"/><rect x="2" y="7.2" width="12" height="1.6"/><rect x="2" y="11.4" width="12" height="1.6"/>',
    refresh: '<path d="M8 2.6a5.4 5.4 0 0 1 5.2 4h-1.8A3.7 3.7 0 0 0 8 4.3V6.4L5 4.5 8 2.6zm0 10.8a5.4 5.4 0 0 1-5.2-4h1.8A3.7 3.7 0 0 0 8 11.7V9.6l3 1.9z"/>',
    close: '<path d="M4 3 3 4l3.9 4L3 12l1 1 4-3.9 4 3.9 1-1-3.9-4L13 4l-1-1-4 3.9z"/>',
    info: '<path d="M8 1.4A6.6 6.6 0 1 0 8 14.6 6.6 6.6 0 0 0 8 1.4zm-.9 3h1.8v1.8H7.1zm0 3.1h1.8v4.6H7.1z"/>',
    grid: '<path d="M1.6 1.6h5.6v5.6H1.6zm7.2 0h5.6v5.6H8.8zM1.6 8.8h5.6v5.6H1.6zm7.2 0h5.6v5.6H8.8z"/>',
    moon: '<path d="M13.6 10.3A5.7 5.7 0 0 1 6.2 2.9a6.4 6.4 0 1 0 7.4 7.4z"/>',
    sun: '<path d="M8 4.9A3.1 3.1 0 1 0 8 11.1 3.1 3.1 0 0 0 8 4.9zM7.2 1h1.6v2.2H7.2zm0 11.8h1.6V15H7.2zM1 7.2h2.2v1.6H1zm11.8 0H15v1.6h-2.2zM2.9 4l1.1-1.1 1.6 1.6L4.5 5.6zm8.5 8.5 1.1-1.1 1.6 1.6-1.1 1.1zM2.9 12.4l1.6-1.6 1.1 1.1L4 13.5zm8.5-8.5L13 2.3l1.1 1.1-1.6 1.6z"/>',
    bug: '<path d="M8 2.2a2.6 2.6 0 0 1 2.5 1.9H5.5A2.6 2.6 0 0 1 8 2.2zM4.4 5.4h7.2v3.2a3.6 3.6 0 0 1-7.2 0zm0 4.6a3.6 3.6 0 0 0 7.2 0v-.2h2v1.4h-2.2a3.6 3.6 0 0 1-6.8 0H2.4V9.8h2zM1.9 6.2h2v1.4h-2zm10.2 0h2v1.4h-2z"/>'
  };

  function svg(name) {
    return '<svg viewBox="0 0 16 16" aria-hidden="true">' + I[name] + '</svg>';
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (html != null) { n.innerHTML = html; }
    return n;
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function writeStore(patch) {
    var s = readStore();
    Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
    try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* quota */ }
  }

  function create(handlers) {
    var saved = readStore();
    var modes = saved.modes || { size: true, position: false, style: true };
    var root = el('div', 'qsp-root');
    var pill = el('button', 'qsp-pill', svg('dropper') + '<span>Format</span>');
    var bar = el('div', 'qsp-bar');
    var listPanel = null;
    var aboutPanel = null;
    var layoutPanel = null;
    var buttons = {};

    root.appendChild(pill);
    root.appendChild(bar);

    var head = el('div', 'qsp-head');
    head.appendChild(el('span', 'qsp-grip', '<svg viewBox="0 0 16 16"><rect x="3" y="4" width="10" height="1.4"/><rect x="3" y="7.3" width="10" height="1.4"/><rect x="3" y="10.6" width="10" height="1.4"/></svg>'));
    head.appendChild(el('span', 'qsp-name', 'QS Format Painter'));

    var source = el('span', 'qsp-source is-empty',
      '<span class="qsp-source__text">No format picked</span>');
    var clearBtn = el('button', 'qsp-source__clear', svg('close'));
    clearBtn.title = 'Clear the picked format';
    source.appendChild(clearBtn);
    head.appendChild(source);

    var themeBtn = el('button', 'qsp-icon qsp-icon--ghost', '');
    head.appendChild(themeBtn);

    var closeBtn = el('button', 'qsp-icon qsp-icon--ghost', svg('close'));
    closeBtn.title = 'Collapse';
    head.appendChild(closeBtn);
    bar.appendChild(head);

    var rowMain = el('div', 'qsp-row qsp-row--main');
    bar.appendChild(rowMain);
    var rowAlign = el('div', 'qsp-row qsp-row--align');
    bar.appendChild(rowAlign);
    var status = el('div', 'qsp-status', 'Pick a format with the selector');
    bar.appendChild(status);

    function addButton(row, key, icon, label, action, variant) {
      var b = el('button', 'qsp-icon' + (variant ? ' qsp-icon--' + variant : ''), svg(icon));
      b.title = label;
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function (e) { action(e, b); });
      row.appendChild(b);
      buttons[key] = b;
      return b;
    }
    function sep(row) { row.appendChild(el('span', 'qsp-sep')); }

    addButton(rowMain, 'pick', 'dropper', 'Pick format from an object  (Alt+C)', function () {
      handlers.onPick();
    }, 'primary');
    var brush = addButton(rowMain, 'apply', 'paste',
      'Paste format, double-click to keep it on  (Alt+V)', function () {
        if (!brush.disabled) { handlers.onApply(false); }
      }, 'primary');
    brush.addEventListener('dblclick', function () {
      if (!brush.disabled) { handlers.onApply(true); }
    });
    sep(rowMain);

    [['size', 'Size'], ['position', 'Position'], ['style', 'Style']].forEach(function (m) {
      var chip = el('button', 'qsp-chip' + (modes[m[0]] ? ' is-on' : ''), m[1]);
      chip.title = m[1] + ' is carried by the selector';
      chip.addEventListener('click', function () {
        modes[m[0]] = !modes[m[0]];
        chip.classList.toggle('is-on', modes[m[0]]);
        writeStore({ modes: modes });
        handlers.onModes(modes);
      });
      rowMain.appendChild(chip);
    });

    rowMain.appendChild(el('span', 'qsp-spacer'));
    addButton(rowMain, 'undo', 'undo', 'Undo last action', handlers.onUndo, 'ghost');
    addButton(rowMain, 'save', 'save', 'Save app', handlers.onSave, 'ghost');
    addButton(rowMain, 'refresh', 'refresh', 'Reload sheet', handlers.onRefresh, 'ghost');
    addButton(rowMain, 'list', 'list', 'Sheet objects', function () { toggleList(); }, 'ghost');
    addButton(rowMain, 'diag', 'bug', 'Copy diagnostic to clipboard', handlers.onDiag, 'ghost');
    addButton(rowMain, 'about', 'info', 'About, links and shortcuts',
      function () { toggleAbout(); }, 'accent');
	  
    if (!saved.aboutSeen) { buttons.about.classList.add('is-new'); }

    rowAlign.appendChild(el('span', 'qsp-row__tag', 'Align'));
    [['left', 'left', 'Align left'], ['hcenter', 'hcenter', 'Center horizontally'],
     ['right', 'right', 'Align right'], ['top', 'top', 'Align top'],
     ['vcenter', 'vcenter', 'Center vertically'], ['bottom', 'bottom', 'Align bottom']]
      .forEach(function (a) {
        addButton(rowAlign, a[0], a[1], a[2], function () { handlers.onArrange(a[0]); });
      });
    sep(rowAlign);
    rowAlign.appendChild(el('span', 'qsp-row__tag', 'Match'));
    [['width', 'width', 'Same width'], ['height', 'height', 'Same height'],
     ['size', 'size', 'Same size']]
      .forEach(function (a) {
        addButton(rowAlign, a[0], a[1], a[2], function () { handlers.onArrange(a[0]); });
      });
    sep(rowAlign);
    rowAlign.appendChild(el('span', 'qsp-row__tag', 'Space'));
    [['dist-h', 'disth', 'Distribute horizontally'], ['dist-v', 'distv', 'Distribute vertically']]
      .forEach(function (a) {
        addButton(rowAlign, a[0], a[1], a[2], function () { handlers.onArrange(a[0]); });
      });
    sep(rowAlign);
    rowAlign.appendChild(el('span', 'qsp-row__tag', 'Layout'));
    addButton(rowAlign, 'layout', 'grid', 'Lay objects out with a template',
      function () { toggleLayout(); }, 'accent');

    function closePanels() {
      if (listPanel) { listPanel.remove(); listPanel = null; }
      if (aboutPanel) { aboutPanel.remove(); aboutPanel = null; }
      if (layoutPanel) { layoutPanel.remove(); layoutPanel = null; }
    }

    function toggleLayout() {
      var wasOpen = !!layoutPanel;
      closePanels();
      if (wasOpen) { return; }
      layoutPanel = el('div', 'qsp-layout');
      bar.appendChild(layoutPanel);
      handlers.onLayout(layoutPanel);
    }

    function toggleList() {
      var wasOpen = !!listPanel;
      closePanels();
      if (wasOpen) { return; }
      listPanel = el('div', 'qsp-list');
      bar.appendChild(listPanel);
      handlers.onList(listPanel);
    }

    function toggleAbout() {
      var wasOpen = !!aboutPanel;
      closePanels();
      buttons.about.classList.remove('is-new');
      writeStore({ aboutSeen: true });
      if (wasOpen) { return; }
      aboutPanel = el('div', 'qsp-about',
        '<div class="qsp-about__title">QS Format Painter <span>v' + VERSION + '</span></div>' +
        '<div class="qsp-about__text">Copy size, position and style between Qlik Sense ' +
        'objects, inside layout containers too. Align and distribute in one click.</div>' +
        '<div class="qsp-about__keys">Shortcuts: <b>Alt</b>+<b>C</b> pick format, ' +
        '<b>Alt</b>+<b>V</b> paste format</div>' +
        '<div class="qsp-about__by">Built by Idriss Benbassou</div>' +
        '<a class="qsp-about__link" href="https://www.linkedin.com/in/idriss-benbassou/" ' +
        'target="_blank" rel="noopener noreferrer">Idriss Benbassou (LinkedIn)</a>' +
        '<a class="qsp-about__link" href="https://www.idriss-benbassou.com/' +
        'qs-metadata-explorer-export-all-metadata-in-1-click/" ' +
        'target="_blank" rel="noopener noreferrer">QS Metadata Explorer, export all metadata in 1 click</a>');
      bar.appendChild(aboutPanel);
    }

    function setStatus(text, tone) {
      status.textContent = text;
      status.className = 'qsp-status' + (tone ? ' qsp-status--' + tone : '');
    }

    function setExpanded(on) {
      root.classList.toggle('is-open', on);
      writeStore({ open: on });
      if (!on) { closePanels(); }
    }

    function applyTheme(sombre) {
      document.documentElement.classList.toggle('qsp-dark', !!sombre);
      themeBtn.innerHTML = svg(sombre ? 'sun' : 'moon');
      themeBtn.title = sombre ? 'Switch to light theme' : 'Switch to dark theme';
    }
    var dark = !!saved.dark;
    applyTheme(dark);
    themeBtn.addEventListener('click', function () {
      dark = !dark;
      applyTheme(dark);
      writeStore({ dark: dark });
    });

    clearBtn.addEventListener('click', function () { handlers.onClearSource(); });
    pill.addEventListener('click', function () { setExpanded(true); });
    closeBtn.addEventListener('click', function () { setExpanded(false); });

    var drag = null;
    head.addEventListener('mousedown', function (e) {
      if (e.target.closest('button')) { return; }
      var r = root.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag) { return; }
      var x = Math.max(4, Math.min(window.innerWidth - 60, e.clientX - drag.dx));
      var y = Math.max(4, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
      root.style.left = x + 'px';
      root.style.top = y + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', function () {
      if (!drag) { return; }
      drag = null;
      writeStore({ pos: { left: root.style.left, top: root.style.top } });
    });

    if (saved.pos && saved.pos.left) {
      root.style.left = saved.pos.left;
      root.style.top = saved.pos.top;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
    }
    setExpanded(saved.open !== false);

    return {
      node: root,
      mount: function () { document.body.appendChild(root); },
      destroy: function () {
        root.remove();
        document.documentElement.classList.remove('qsp-dark');
      },
      modes: function () { return modes; },
      setStatus: setStatus,
      setSource: function (info) {
        var actif = !!info;
        source.classList.toggle('is-empty', !actif);
        source.querySelector('.qsp-source__text').textContent = actif
          ? info.label + (info.size ? '  ' + info.size : '')
          : 'No format picked';
        source.title = actif ? 'Format picked from ' + info.label : '';
        buttons.pick.classList.toggle('is-on', actif);
        brush.disabled = !actif;
        brush.title = actif
          ? 'Paste format, double-click to keep it on  (Alt+V)'
          : 'Pick a format first with the selector  (Alt+C)';
      },
      setSticky: function (on) { buttons.apply.classList.toggle('is-sticky', on); },
      setBusy: function (on) { root.classList.toggle('is-busy', on); },
      closeList: closePanels,
      element: el,
      expand: function () { setExpanded(true); }
    };
  }

  return { create: create };
});
