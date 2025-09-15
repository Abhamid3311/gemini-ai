export default function Sidebar({ sessions, activeId, onNew, onSelect, onDelete }) {
	return (
		<aside className="w-64 border-r h-full flex flex-col">
			<div className="p-3 border-b flex items-center gap-2">
				<button onClick={onNew} className="w-full rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
					New chat
				</button>
			</div>
			<nav className="flex-1 overflow-y-auto">
				{sessions.length === 0 ? (
					<div className="p-3 text-sm text-muted-foreground">No chats yet</div>
				) : (
					<ul className="p-2 space-y-1">
						{sessions.map((s) => (
							<li key={s.id} className={`group flex items-center justify-between rounded-md px-2 py-2 text-sm ${s.id === activeId ? 'bg-muted' : 'hover:bg-muted/60'}`}>
								<button onClick={() => onSelect(s.id)} className="text-left truncate flex-1">
									{s.title || 'Untitled'}
								</button>
								<button onClick={() => onDelete(s.id)} className="opacity-60 hover:opacity-100 px-1">×</button>
							</li>
						))}
					</ul>
				)}
			</nav>
		</aside>
	);
}
