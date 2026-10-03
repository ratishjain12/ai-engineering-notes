(function () {
	var p = new URLSearchParams(location.search);
	var source = p.get('utm_source');
	if (!source) return;
	var key = 'tracked:' + location.pathname + ':' + source;
	if (sessionStorage.getItem(key)) return;
	sessionStorage.setItem(key, '1');
	fetch('/api/track', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			source: source,
			medium: p.get('utm_medium'),
			campaign: p.get('utm_campaign'),
			path: location.pathname,
		}),
		keepalive: true,
	}).catch(function () {});
})();
