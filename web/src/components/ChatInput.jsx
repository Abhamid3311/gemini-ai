import { useRef, useState } from 'react'

export default function ChatInput({ disabled, onSend }) {
	const [value, setValue] = useState('')
	const [attachment, setAttachment] = useState(null)
	const fileRef = useRef(null)

	async function handleSend(e){
		e?.preventDefault?.()
		const text = value.trim()
		if(!text && !attachment) return
		onSend({ content: text, attachment })
		setValue('')
		setAttachment(null)
		if(fileRef.current) fileRef.current.value = ''
	}

	return (
		<form onSubmit={handleSend} className="border-t p-3 bg-background">
			<div className="mx-auto max-w-3xl flex gap-2 items-center">
				<input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={async (e)=>{
					const f=e.target.files?.[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>setAttachment({ dataUri: reader.result, mimeType: f.type }); reader.readAsDataURL(f)
				}} />
				<button type="button" onClick={()=>fileRef.current?.click()} className="rounded-md border px-3 py-2 text-sm">Attach</button>
				<input
					type="text"
					value={value}
					onChange={(e)=>setValue(e.target.value)}
					placeholder="Send a message..."
					className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
				/>
				<button disabled={disabled} type="submit" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm disabled:opacity-50">Send</button>
			</div>
			{attachment ? (
				<div className="mx-auto max-w-3xl mt-2 flex items-center gap-2 text-xs text-muted-foreground">
					<img src={attachment.dataUri} alt="attachment" className="h-16 w-auto rounded-md border" />
					<button type="button" onClick={()=>setAttachment(null)} className="rounded-md border px-2 py-1">Remove</button>
				</div>
			): null}
		</form>
	)
}
