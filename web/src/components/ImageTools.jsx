import { useRef, useState } from 'react'

export default function ImageTools({ model }) {
	const [tab, setTab] = useState('vision')
	return (
		<div className="mx-auto max-w-3xl">
			<div className="flex gap-2 mb-3">
				<button className={`px-3 py-1 rounded-md border text-sm ${tab==='vision'?'bg-muted':''}`} onClick={()=>setTab('vision')}>Image → Text</button>
				<button className={`px-3 py-1 rounded-md border text-sm ${tab==='svg'?'bg-muted':''}`} onClick={()=>setTab('svg')}>Text → Image</button>
			</div>
			{tab === 'vision' ? <VisionForm model={model} /> : <SvgForm model={model} />}
		</div>
	)
}

function VisionForm({ model }) {
	const fileRef = useRef(null)
	const [preview, setPreview] = useState(null)
	const [text, setText] = useState('')
	const [loading, setLoading] = useState(false)

	async function onSubmit(e){
		e?.preventDefault?.()
		const file = fileRef.current?.files?.[0]
		if(!file) return
		const dataUri = await toDataUri(file)
		setLoading(true)
		setText('')
		try{
			const res = await fetch('/api/vision/describe',{
				method:'POST',
				headers:{'Content-Type':'application/json'},
				body: JSON.stringify({ dataUri, mimeType: file.type, model })
			})
			const data = await res.json()
			if(!res.ok) throw new Error(data?.error||'Failed')
			setText(data.text)
		}catch(err){
			setText('Error: '+(err?.message||err))
		}finally{
			setLoading(false)
		}
	}

	return (
		<div className="space-y-3">
			<input type="file" accept="image/*" ref={fileRef} onChange={(e)=>{
				const f=e.target.files?.[0]; if(f) toDataUri(f).then(setPreview)
			}} />
			{preview && <img src={preview} alt="preview" className="max-h-64 w-auto rounded-md border" />}
			<button onClick={onSubmit} disabled={loading} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
				{loading?'Analyzing…':'Describe image'}
			</button>
			{text && <div className="whitespace-pre-wrap text-sm border rounded-md p-3">{text}</div>}
		</div>
	)
}

function SvgForm({ model }){
	const [prompt,setPrompt]=useState('a simple blue circle with white text Hamid')
	const [svg,setSvg]=useState('')
	const [loading,setLoading]=useState(false)
	async function onGenerate(e){
		e?.preventDefault?.()
		if(!prompt.trim()) return
		setLoading(true)
		setSvg('')
		try{
			const res = await fetch('/api/images/svg',{
				method:'POST',
				headers:{'Content-Type':'application/json'},
				body: JSON.stringify({ prompt, model })
			})
			const text = await res.text()
			if(!res.ok) throw new Error(text)
			setSvg(text)
		}catch(err){
			setSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80"><text x="10" y="40">Error: '+(err?.message||err)+'</text></svg>')
		}finally{setLoading(false)}
	}

	async function downloadPng(){
		if(!svg) return
		const blob = new Blob([svg], { type: 'image/svg+xml' })
		const url = URL.createObjectURL(blob)
		const img = new Image()
		img.crossOrigin = 'anonymous'
		img.onload = () => {
			const canvas = document.createElement('canvas')
			const scale = 2
			canvas.width = img.width * scale
			canvas.height = img.height * scale
			const ctx = canvas.getContext('2d')
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
			canvas.toBlob((pngBlob)=>{
				const a = document.createElement('a')
				a.href = URL.createObjectURL(pngBlob)
				a.download = 'image.png'
				a.click()
				URL.revokeObjectURL(a.href)
			}, 'image/png')
			URL.revokeObjectURL(url)
		}
		img.src = url
	}

	return (
		<div className="space-y-3">
			<textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} className="w-full min-h-24 rounded-md border bg-background p-2 text-sm" />
			<div className="flex gap-2">
				<button onClick={onGenerate} disabled={loading} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
					{loading?'Generating…':'Generate SVG'}
				</button>
				<button onClick={downloadPng} disabled={!svg} className="rounded-md border px-3 py-2 text-sm">Download PNG</button>
			</div>
			{svg && <div className="border rounded-md p-2"><div dangerouslySetInnerHTML={{__html: svg}} /></div>}
		</div>
	)
}

async function toDataUri(file){
	return new Promise((resolve,reject)=>{
		const reader=new FileReader()
		reader.onload=()=>resolve(reader.result)
		reader.onerror=reject
		reader.readAsDataURL(file)
	})
}
