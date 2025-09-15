import { getGenerativeModel } from './_gemini.mjs'

const SYSTEM_PROMPT = "You are a concise, helpful AI. Use Markdown formatting."

export default async function handler(req, res){
	if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
	try{
		const { dataUri, mimeType, prompt = 'Describe this image in detail.' , model = 'gemini-2.5-flash'} = req.body || {}
		if(!dataUri) return res.status(400).json({ error: 'missing image data' })
		const genModel = getGenerativeModel(model, SYSTEM_PROMPT)
		const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri
		const result = await genModel.generateContent([
			{ text: prompt },
			{ inlineData: { data: base64, mimeType: mimeType || 'image/png' } },
		])
		const text = result.response.text()
		return res.json({ text })
	}catch(err){
		console.error('Vercel vision error:', err)
		return res.status(500).json({ error: err?.message||'Internal Error' })
	}
}
