import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { getGenerativeModel, getGeminiClient } from '../utils/gemini.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => res.json({ ok: true }));

function toGeminiRole(role) {
	if (role === 'assistant') return 'model';
	return role; // user, model, function, system
}

const SYSTEM_PROMPT =
	"You are a concise, helpful AI. Use Markdown formatting with headings, lists, and bold where useful. Understand and respond in the user's language automatically (Bangla, Banglish, English). Keep answers clear; use bullet points for steps/lists; include short code blocks when appropriate.";

function extractInlineData(attachment) {
	if (!attachment) return null;
	const { dataUri, mimeType } = attachment;
	if (!dataUri) return null;
	const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
	return { inlineData: { data: base64, mimeType: mimeType || 'image/png' } };
}

function sanitizeAndBuild(messages) {
	const sanitized = [...messages];
	while (sanitized.length && toGeminiRole(sanitized[0].role) !== 'user') sanitized.shift();
	if (!sanitized.length) throw new Error('no user messages provided');
	const last = sanitized[sanitized.length - 1];
	if (toGeminiRole(last.role) !== 'user') throw new Error('last message must be from user');

	const history = sanitized.slice(0, -1).map((m) => {
		const parts = [];
		if (m.content) parts.push({ text: m.content });
		const img = extractInlineData(m.attachment);
		if (img) parts.push(img);
		return { role: toGeminiRole(m.role), parts };
	});

	const userParts = [];
	if (last.content) userParts.push({ text: last.content });
	const lastImg = extractInlineData(last.attachment);
	if (lastImg) userParts.push(lastImg);

	return { history, userParts };
}

app.post('/api/chat', async (req, res) => {
	try {
		const { messages, model = 'gemini-1.5-flash' } = req.body || {};
		if (!Array.isArray(messages)) {
			return res.status(400).json({ error: 'messages must be an array' });
		}
		const { history, userParts } = sanitizeAndBuild(messages);
		const client = getGeminiClient();
		const genModel = client.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
		const chat = genModel.startChat({ history });
		const reply = await chat.sendMessage(userParts);
		const text = reply.response.text();
		return res.json({ reply: text });
	} catch (error) {
		console.error('Chat error:', error);
		const message = error?.message || 'Internal Server Error';
		return res.status(500).json({ error: message });
	}
});

app.post('/api/chat/stream', async (req, res) => {
	try {
		const { messages, model = 'gemini-1.5-flash' } = req.body || {};
		if (!Array.isArray(messages)) {
			res.writeHead(400, { 'Content-Type': 'text/event-stream' });
			res.write(`event: error\n`);
			res.write(`data: messages must be an array\n\n`);
			return res.end();
		}
		const { history, userParts } = sanitizeAndBuild(messages);

		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders?.();

		const client = getGeminiClient();
		const genModel = client.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
		const chat = genModel.startChat({ history });
		const result = await chat.sendMessageStream(userParts);

		for await (const chunk of result.stream) {
			const text = chunk.text();
			if (text) {
				res.write(`data: ${JSON.stringify(text)}\n\n`);
			}
		}
		const final = await result.response;
		res.write(`event: done\n`);
		res.write(`data: ${JSON.stringify(final.text())}\n\n`);
		res.end();
	} catch (error) {
		console.error('Stream error:', error);
		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'text/event-stream' });
		}
		res.write(`event: error\n`);
		res.write(`data: ${JSON.stringify(error?.message || 'Internal Server Error')}\n\n`);
		res.end();
	}
});

// Image to text (describe image)
app.post('/api/vision/describe', async (req, res) => {
	try {
		const { dataUri, mimeType, prompt = 'Describe this image in detail.' , model = 'gemini-1.5-flash'} = req.body || {};
		if (!dataUri && !mimeType) return res.status(400).json({ error: 'missing image data' });
		const client = getGeminiClient();
		const genModel = client.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
		const imageBase64 = dataUri?.split(',')[1] || dataUri; // allow raw base64
		const result = await genModel.generateContent([
			{ text: prompt },
			{ inlineData: { data: imageBase64, mimeType: mimeType || 'image/png' } },
		]);
		const text = result.response.text();
		return res.json({ text });
	} catch (error) {
		console.error('Vision describe error:', error);
		return res.status(500).json({ error: error?.message || 'Internal Server Error' });
	}
});

// Text to image (SVG via model output)
app.post('/api/images/svg', async (req, res) => {
	try {
		const { prompt, model = 'gemini-1.5-flash' } = req.body || {};
		if (!prompt) return res.status(400).json({ error: 'prompt is required' });
		const client = getGeminiClient();
		const genModel = client.getGenerativeModel({ model, systemInstruction: SYSTEM_PROMPT });
		const svgPrompt = `Create a valid, standalone SVG image that matches this request. Return ONLY raw SVG markup, no backticks, no explanations. Keep size responsive using width=\"100%\" and viewBox. Prompt: ${prompt}`;
		const result = await genModel.generateContent(svgPrompt);
		let svg = (await result.response).text() || '';
		// Remove markdown fences if present
		svg = svg.replace(/^```(?:xml|svg)?/i, '').replace(/```$/i, '').trim();
		if (!svg.startsWith('<svg')) {
			return res.status(422).json({ error: 'model did not return SVG' });
		}
		res.setHeader('Content-Type', 'image/svg+xml');
		return res.send(svg);
	} catch (error) {
		console.error('SVG error:', error);
		return res.status(500).json({ error: error?.message || 'Internal Server Error' });
	}
});

app.listen(port, () => {
	console.log(`API listening on http://localhost:${port}`);
});
