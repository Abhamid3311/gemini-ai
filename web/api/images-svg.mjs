import { getGenerativeModel } from './_gemini.mjs'

const SYSTEM_PROMPT = "You are a concise, helpful AI."

export default async function handler(req, res){
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
	try{
		const { prompt, model = 'gemini-2.5-flash' } = req.body || {}
		if(!prompt) return res.status(400).json({ error: 'prompt is required' })
		const genModel = getGenerativeModel(model, SYSTEM_PROMPT)
		const svgPrompt = `Create a valid, standalone SVG image that matches this request. Return ONLY raw SVG markup, no backticks, no explanations. Keep size responsive using width=\"100%\" and viewBox. Prompt: ${prompt}`
		const result = await genModel.generateContent(svgPrompt)
		let svg = (await result.response).text() || ''
		svg = svg.replace(/^```(?:xml|svg)?/i, '').replace(/```$/i, '').trim()
		if(!svg.startsWith('<svg')) return res.status(422).json({ error: 'model did not return SVG' })
		res.setHeader('Content-Type','image/svg+xml')
		return res.send(svg)
	}catch(err){
		console.error('Vercel svg error:', err)
		return res.status(500).json({ error: err?.message||'Internal Error' })
	}
}
