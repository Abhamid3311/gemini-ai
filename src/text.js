import { getGenerativeModel } from './utils/gemini.js';

async function main() {
	try {
		const model = getGenerativeModel('gemini-1.5-flash');
		const prompt = 'Write a short, cheerful haiku about coding with JavaScript.';
		const result = await model.generateContent(prompt);
		const response = await result.response;
		const text = response.text();
		console.log(text);
	} catch (error) {
		console.error('Error generating text:', error?.message || error);
		process.exitCode = 1;
	}
}

main();
