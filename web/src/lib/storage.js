const SESSIONS_KEY = 'gemini_chat_sessions_v1';

export function loadSessions() {
	try {
		const raw = localStorage.getItem(SESSIONS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function saveSessions(sessions) {
	try {
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
	} catch {}
}

export function generateId() {
	return Math.random().toString(36).slice(2, 10);
}
