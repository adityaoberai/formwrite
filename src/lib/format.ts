const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string) {
	return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string) {
	return DATE_TIME.format(new Date(iso));
}

/** "just now", "5m ago", "15h ago", "3d ago", "2w ago", then a plain date. */
export function timeAgo(iso: string, now = Date.now()) {
	const diff = Math.max(0, now - new Date(iso).getTime());
	const s = Math.floor(diff / 1000);
	if (s < 45) return 'just now';
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	if (d < 7) return `${d}d ago`;
	if (d < 30) return `${Math.floor(d / 7)}w ago`;
	return formatDate(iso);
}

export function plural(count: number, singular: string, pluralWord = `${singular}s`) {
	return `${count} ${count === 1 ? singular : pluralWord}`;
}

export function formatBytes(bytes: number) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function truncate(s: string, max = 60) {
	if (s.length <= max) return s;
	return s.slice(0, max - 1).trimEnd() + '...';
}
