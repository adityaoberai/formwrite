const DATE = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const DATE_TIME = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function formatDate(iso: string) {
	return DATE.format(new Date(iso));
}

export function formatDateTime(iso: string) {
	return DATE_TIME.format(new Date(iso));
}

/** "just now", "5 min ago", "3 hours ago", "yesterday", "4 days ago", then a plain date. */
export function timeAgo(iso: string, now = Date.now()) {
	const diff = Math.max(0, now - new Date(iso).getTime());
	const min = Math.round(diff / 60_000);
	if (min < 1) return 'just now';
	if (min < 60) return `${min} min ago`;
	const hours = Math.round(min / 60);
	if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
	const days = Math.round(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 14) return `${days} days ago`;
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
