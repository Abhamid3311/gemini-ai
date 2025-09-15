import { getGenerativeModel } from './_gemini.mjs'

const SYSTEM_PROMPT = "You are a concise, helpful AI. Use Markdown formatting with headings, lists, and bold where useful. Understand and respond in the user's language automatically (Bangla, Banglish, English). Keep answers clear; use bullet points for steps/lists; include short code blocks when appropriate."

function extractInlineData(attachment) {
	if (!attachment) return null
	const { dataUri, mimeType } = attachment
	if (!dataUri) return null
	const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
	return { inlineData: { data: base64, mimeType: mimeType || 'image/png' } }
}

function toGeminiRole(role) {
	if (role === 'assistant') return 'model'
	return role
}

function sanitizeAndBuild(messages) {
	const sanitized = [...messages]
	while (sanitized.length && toGeminiRole(sanitized[0].role) !== 'user') sanitized.shift()
	if (!sanitized.length) throw new Error('no user messages provided')
	const last = sanitized[sanitized.length - 1]
	if (toGeminiRole(last.role) !== 'user') throw new Error('last message must be from user')

	const history = sanitized.slice(0, -1).map((m) => {
		const parts = []
		if (m.content) parts.push({ text: m.content })
		const img = extractInlineData(m.attachment)
		if (img) parts.push(img)
		return { role: toGeminiRole(m.role), parts }
	})

	const userParts = []
	if (last.content) userParts.push({ text: last.content })
	const lastImg = extractInlineData(last.attachment)
	if (lastImg) userParts.push(lastImg)
	return { history, userParts }
}

export default async function handler(req, res) {
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
	try {
		const { messages, model = 'gemini-2.5-flash' } = req.body || {}
		if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' })
		const { history, userParts } = sanitizeAndBuild(messages)
		const genModel = getGenerativeModel(model, SYSTEM_PROMPT)
		const chat = genModel.startChat({ history })
		const reply = await chat.sendMessage(userParts)
		const text = reply.response.text()
		return res.json({ reply: text })
	} catch (error) {
		console.error('Vercel chat error:', error)
		return res.status(500).json({ error: error?.message || 'Internal Server Error' })
	}
}
