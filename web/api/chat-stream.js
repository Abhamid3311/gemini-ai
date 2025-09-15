export const config = { runtime: 'edge' }

import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM_PROMPT = "You are a concise, helpful AI. Use Markdown formatting with headings, lists, and bold where useful. Understand and respond in the user's language automatically (Bangla, Banglish, English). Keep answers clear; use bullet points for steps/lists; include short code blocks when appropriate."

function toGeminiRole(role){ return role === 'assistant' ? 'model' : role }
function extractInlineData(attachment){
	if(!attachment) return null
	const { dataUri, mimeType } = attachment
	if(!dataUri) return null
	const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
	return { inlineData: { data: base64, mimeType: mimeType || 'image/png' } }
}

function sanitizeAndBuild(messages){
	const sanitized=[...messages]
	while(sanitized.length && toGeminiRole(sanitized[0].role) !== 'user') sanitized.shift()
	if(!sanitized.length) throw new Error('no user messages provided')
	const last = sanitized[sanitized.length-1]
	if(toGeminiRole(last.role) !== 'user') throw new Error('last message must be from user')
	const history = sanitized.slice(0,-1).map((m)=>{
		const parts=[]; if(m.content) parts.push({text:m.content}); const img=extractInlineData(m.attachment); if(img) parts.push(img); return { role: toGeminiRole(m.role), parts }
	})
	const userParts=[]; if(last.content) userParts.push({text:last.content}); const lastImg=extractInlineData(last.attachment); if(lastImg) userParts.push(lastImg)
	return { history, userParts }
}

export default async function handler(req) {
	try {
		const body = await req.json()
		const { messages, model = 'gemini-2.5-flash' } = body || {}
		if(!Array.isArray(messages)) return new Response('messages must be an array', { status: 400 })
		const apiKey = process.env.GOOGLE_GEMINI_API_KEY
		if(!apiKey) return new Response('Missing GOOGLE_GEMINI_API_KEY', { status: 500 })
		const genai = new GoogleGenerativeAI(apiKey)
		const { history, userParts } = sanitizeAndBuild(messages)
		const genModel = genai.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT })
		const chat = genModel.startChat({ history })
		const result = await chat.sendMessageStream(userParts)

		const stream = new ReadableStream({
			async start(controller){
				try{
					for await (const chunk of result.stream) {
						const text = chunk.text()
						if (text) controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(text)}\n\n`))
					}
					controller.enqueue(new TextEncoder().encode(`event: done\n`))
					controller.close()
				}catch(err){
					controller.enqueue(new TextEncoder().encode(`event: error\n`))
					controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(err?.message||'error')}\n\n`))
					controller.close()
				}
			}
		})

		return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
	}catch(err){
		return new Response('Internal Error', { status: 500 })
	}
}
