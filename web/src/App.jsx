import { useEffect, useRef, useState } from 'react'
import Message from './components/Message'
import Sidebar from './components/Sidebar'
import ImageTools from './components/ImageTools'
import ChatInput from './components/ChatInput'
import { generateId, loadSessions, saveSessions } from './lib/storage'
import './index.css'

export default function App() {
	const [sessions, setSessions] = useState(() => {
		const existing = loadSessions()
		if (existing.length) return existing
		return [{ id: generateId(), title: 'New chat', messages: [{ role: 'assistant', content: 'Hi! Ask me anything.' }] }]
	})
	const [activeId, setActiveId] = useState(() => sessions[0]?.id)
	const active = sessions.find((s) => s.id === activeId) || sessions[0]
	const [loading, setLoading] = useState(false)
	const [model, setModel] = useState('gemini-2.5-flash')
	const [mode, setMode] = useState('chat') // 'chat' | 'images'
	const [sidebarOpen, setSidebarOpen] = useState(false)
	const endRef = useRef(null)

	useEffect(() => {
		saveSessions(sessions)
	}, [sessions])

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [active?.messages])

	function updateActiveMessages(nextMessages) {
		setSessions((all) => all.map((s) => (s.id === active.id ? { ...s, messages: nextMessages } : s)))
	}

	async function handleSend({ content, attachment }) {
		if (mode !== 'chat') return
		const next = [...(active?.messages || []), { role: 'user', content, attachment }]
		updateActiveMessages(next)
		setLoading(true)
		try {
			const res = await fetch('/api/chat-stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
				body: JSON.stringify({ messages: next, model }),
			})
			const ct = res.headers.get('content-type') || ''
			if (res.ok && ct.includes('text/event-stream')) {
				const reader = res.body.getReader()
				const decoder = new TextDecoder()
				let assistant = ''
				updateActiveMessages([...next, { role: 'assistant', content: '' }])
				while (true) {
					const { value, done } = await reader.read()
					if (done) break
					const chunk = decoder.decode(value, { stream: true })
					const events = chunk.split('\n\n').filter(Boolean)
					for (const ev of events) {
						if (ev.startsWith('data: ')) {
							try {
								const text = JSON.parse(ev.slice(6))
								assistant += text
								updateActiveMessages([...next, { role: 'assistant', content: assistant }])
							} catch {}
						}
					}
				}
				setLoading(false)
				return
			}

			// Fallback to non-streaming JSON if streaming not available or failed
			const res2 = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: next, model }),
			})
			const ct2 = res2.headers.get('content-type') || ''
			if (!ct2.includes('application/json')) {
				const text = await res2.text()
				throw new Error(text || `HTTP ${res2.status}`)
			}
			const data = await res2.json()
			if (!res2.ok) throw new Error(data?.error || 'Request failed')
			updateActiveMessages([...next, { role: 'assistant', content: data.reply }])
		} catch (err) {
			updateActiveMessages([...next, { role: 'assistant', content: 'Error: ' + (err?.message || err) }])
		} finally {
			setLoading(false)
		}
	}

	function handleNew() {
		const id = generateId()
		const newSession = { id, title: 'New chat', messages: [{ role: 'assistant', content: 'Hi! Ask me anything.' }] }
		setSessions((s) => [newSession, ...s])
		setActiveId(id)
	}

	function handleSelect(id) {
		setActiveId(id); setSidebarOpen(false)
	}

	function handleDelete(id) {
		setSessions((s) => s.filter((x) => x.id !== id))
		if (id === activeId) {
			const next = sessions.find((x) => x.id !== id)
			setActiveId(next?.id)
		}
	}

	useEffect(() => {
		const firstUser = active?.messages?.find((m) => m.role === 'user')
		if (firstUser && active?.title === 'New chat') {
			setSessions((all) => all.map((s) => (s.id === active.id ? { ...s, title: firstUser.content.slice(0, 40) } : s)))
		}
	}, [active?.messages])

	return (
		<div className="w-full h-screen bg-background text-foreground grid md:grid-cols-[16rem_1fr] grid-cols-1">
			{/* Sidebar */}
			<div className={`fixed md:static z-50 md:z-auto top-0 left-0 h-full w-64 bg-background border-r transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
				<Sidebar sessions={sessions} activeId={active?.id} onNew={handleNew} onSelect={handleSelect} onDelete={handleDelete} />
			</div>

			{/* Main */}
			<div className="grid grid-rows-[1fr_auto] h-screen">
				<header className="fixed md:left-64 left-0 right-0 top-0 z-40 border-b px-4 py-3 bg-background/80 backdrop-blur flex items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<button className="md:hidden rounded-md border px-2 py-1 text-sm" onClick={()=>setSidebarOpen((v)=>!v)}>☰</button>
						<h1 className="text-base font-semibold">Numid Chat</h1>
					</div>
					<div className="flex items-center gap-2">
						<div className="hidden sm:flex items-center gap-2 rounded-md border p-1 text-xs">
							<button className={`px-2 py-1 rounded ${mode==='chat'?'bg-muted':''}`} onClick={()=>setMode('chat')}>Chat</button>
							<button className={`px-2 py-1 rounded ${mode==='images'?'bg-muted':''}`} onClick={()=>setMode('images')}>Images</button>
						</div>
						<label className="text-xs text-muted-foreground">Model</label>
						<select
							value={model}
							onChange={(e) => setModel(e.target.value)}
							className="rounded-md border bg-background px-2 py-1 text-xs"
						>
							<option value="gemini-2.5-flash">gemini-2.5-flash</option>
							<option value="gemini-1.5-flash">gemini-1.5-flash</option>
							<option value="gemini-1.5-flash-8b">gemini-1.5-flash-8b</option>
							<option value="gemini-1.5-pro">gemini-1.5-pro</option>
						</select>
					</div>
				</header>
				<main className="overflow-y-auto px-4 pt-16">
					<div className="mx-auto max-w-3xl py-6">
						{mode === 'chat' ? (
							<>
								{active?.messages?.map((m, i) => (
									<Message key={i} role={m.role} content={m.content} attachment={m.attachment} />
								))}
								<div ref={endRef} />
							</>
						) : (
							<ImageTools model={model} />
						)}
					</div>
				</main>
				{mode === 'chat' ? (
					<ChatInput disabled={loading} onSend={handleSend} />
				) : null}
			</div>
		</div>
	)
}
