(function () {
	var KEY = 'ain-layout';
	var LIMITS = { sb: [224, 520], ct: [560, 1280] };
	var root = document.documentElement;
	var state = {};
	try {
		state = JSON.parse(localStorage.getItem(KEY)) || {};
	} catch (e) {}

	function apply() {
		root.classList.toggle('sidebar-closed', !!state.closed);
		root.classList.toggle('toc-closed', !!state.toc);
		if (state.sb) root.style.setProperty('--sl-sidebar-width', state.sb + 'px');
		else root.style.removeProperty('--sl-sidebar-width');
		// the right-hand TOC column reuses --sl-sidebar-width, so only drop the content offset
		if (state.closed) root.style.setProperty('--sl-content-inline-start', '0px');
		else root.style.removeProperty('--sl-content-inline-start');
		if (state.ct) root.style.setProperty('--sl-content-width', state.ct + 'px');
		else root.style.removeProperty('--sl-content-width');
	}
	function save() {
		try {
			localStorage.setItem(KEY, JSON.stringify(state));
		} catch (e) {}
	}
	function clamp(key, v) {
		return Math.min(LIMITS[key][1], Math.max(LIMITS[key][0], Math.round(v)));
	}
	apply();

	document.addEventListener('DOMContentLoaded', function () {
		var side = document.querySelector('.sidebar-pane');
		var box = document.querySelector('.main-pane .sl-container');
		if (!side || !box) return;

		function makeHandle(label, key, anchor, factor) {
			var h = document.createElement('div');
			h.className = 'pane-handle';
			h.dataset.pane = key;
			h.setAttribute('role', 'separator');
			h.setAttribute('aria-orientation', 'vertical');
			h.setAttribute('aria-label', label);
			h.tabIndex = 0;
			h.title = 'Drag to resize, double-click to reset';
			document.body.appendChild(h);

			function current() {
				return key === 'sb' ? side.getBoundingClientRect().width : box.getBoundingClientRect().width;
			}
			function set(v) {
				state[key] = clamp(key, v);
				apply();
				place();
			}
			function place() {
				h.style.left = anchor().getBoundingClientRect().right - 3 + 'px';
			}

			h.addEventListener('pointerdown', function (e) {
				var startX = e.clientX;
				var startV = current();
				h.setPointerCapture(e.pointerId);
				h.classList.add('active');
				document.body.classList.add('pane-dragging');
				function move(ev) {
					set(startV + (ev.clientX - startX) * factor);
				}
				function up() {
					h.classList.remove('active');
					document.body.classList.remove('pane-dragging');
					h.removeEventListener('pointermove', move);
					h.removeEventListener('pointerup', up);
					save();
				}
				h.addEventListener('pointermove', move);
				h.addEventListener('pointerup', up);
			});
			h.addEventListener('dblclick', function () {
				delete state[key];
				apply();
				save();
				place();
			});
			h.addEventListener('keydown', function (e) {
				if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
				e.preventDefault();
				set(current() + (e.key === 'ArrowRight' ? 16 : -16) * factor);
				save();
			});
			window.addEventListener('resize', place);
			place();
			return place;
		}

		var placers = [];
		function makeToggle(flag, name, icon, position, shortcut, minWidth) {
			var b = document.createElement('button');
			b.type = 'button';
			b.className = 'pane-toggle pane-toggle-' + flag;
			b.innerHTML =
				'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="' + icon + '"/></svg>';
			document.body.appendChild(b);
			function place() {
				var closed = !!state[flag];
				var pos = position(closed);
				b.style.left = pos.left || 'auto';
				b.style.right = pos.right || 'auto';
				b.setAttribute('aria-expanded', String(!closed));
				var label = (closed ? 'Show ' : 'Hide ') + name;
				b.setAttribute('aria-label', label);
				b.title = label + ' (' + shortcut + ')';
			}
			function flip() {
				if (window.innerWidth < minWidth) return;
				if (state[flag]) delete state[flag];
				else state[flag] = true;
				apply();
				save();
				placers.forEach(function (p) { p(); });
			}
			b.addEventListener('click', flip);
			document.addEventListener('keydown', function (e) {
				var t = e.target;
				if (e.key !== shortcut || e.metaKey || e.ctrlKey || e.altKey) return;
				if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
				flip();
			});
			placers.push(place);
			place();
		}
		makeToggle('closed', 'sidebar', 'M9 4v16', function (closed) {
			return { left: closed ? '12px' : side.getBoundingClientRect().right - 40 + 'px' };
		}, '[', 800);
		makeToggle('toc', 'table of contents', 'M15 4v16', function () {
			return { right: '24px' };
		}, ']', 1152);

		placers.push(
			makeHandle('Resize sidebar', 'sb', function () { return side; }, 1),
			// content is centred, so moving its right edge by dx changes the width by 2dx
			makeHandle('Resize content', 'ct', function () { return box; }, 2)
		);
		new ResizeObserver(function () {
			placers.forEach(function (p) { p(); });
		}).observe(document.body);
	});
})();
