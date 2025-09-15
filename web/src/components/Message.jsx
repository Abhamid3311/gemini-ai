import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function Message({ role, content, attachment }) {
	const isUser = role === 'user';
	return (
		<div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'} my-2`}>
			<div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm leading-6 shadow ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
				{attachment?.dataUri ? (
					<div className="mb-2">
						<img src={attachment.dataUri} alt="attachment" className="max-h-64 w-auto rounded-md border" />
					</div>
				) : null}
				{isUser ? (
					<span>{content}</span>
				) : (
					<ReactMarkdown remarkPlugins={[remarkGfm]} components={{
						code(props) {
							const { children } = props
							return <code className="rounded bg-background/60 px-1 py-0.5">{children}</code>
						}
					}}>
						{content || ''}
					</ReactMarkdown>
				)}
			</div>
		</div>
	);
}
