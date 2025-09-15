import { getGenerativeModel } from './utils/gemini.js';

async function main() {
	try {
		const model = getGenerativeModel('gemini-1.5-flash');
		const chat = model.startChat({
			history: [
				{ role: 'user', parts: [{ text: 'You are a concise assistant.' }] },
			],
		});

		const r1 = await chat.sendMessage('Give me 3 bullet points on Node.js ESM.');
		console.log(r1.response.text());

		const r2 = await chat.sendMessage('Now summarize that in one sentence.');
		console.log('\nSummary:', r2.response.text());
	} catch (error) {
		console.error('Error in chat example:', error?.message || error);
		process.exitCode = 1;
	}
}

main();
