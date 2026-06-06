import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, ImagePlus, X, Sparkles, Wand2 } from 'lucide-react'
import type { VibeSystem } from '../types'
import { classify, buildItem } from '../classifier'
import { addItem } from '../store'
import { CATEGORY_MAP } from '../types'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function HomeInput({ system, onChange }: Props) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<null | {
    title: string
    category: string
    reason: string
    tags: string[]
  }>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  // 自动调整 textarea 高度
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 400) + 'px'
    }
  }, [text])

  // 实时预览分类
  useEffect(() => {
    if (!text.trim() && images.length === 0) {
      setPreview(null)
      return
    }
    const result = classify({ text, images })
    setPreview({
      title: result.title,
      category: result.category,
      reason: result.reason,
      tags: result.tags,
    })
  }, [text, images])

  // 处理图片粘贴
  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            readImageFile(file)
          }
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [])

  function readImageFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImages(prev => [...prev, reader.result as string])
      }
    }
    reader.readAsDataURL(file)
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(f => {
      if (f.type.startsWith('image/')) readImageFile(f)
    })
  }

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  function clear() {
    setText('')
    setImages([])
    setPreview(null)
  }

  function submit() {
    if (!text.trim() && images.length === 0) return
    const result = classify({ text, images })
    const item = buildItem({ text, images }, result)
    addItem(system, item)
    onChange({ ...system })
    clear()
    // 跳到该条目
    navigate(`/i/${item.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    // Cmd/Ctrl + Enter 提交
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 text-xs font-medium mb-4">
            <Sparkles size={12} />
            系统会替你整理
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="gradient-text">把任何东西丢进来</span>
          </h1>
          <p className="text-ink-500 text-sm">
            文本、链接、代码、截图、灵感、待办…系统会自动归类到对应的目录。
          </p>
        </div>

        <div
          className={`relative rounded-2xl border-2 transition-all bg-white shadow-sm ${
            dragOver
              ? 'border-indigo-400 shadow-lg ring-4 ring-indigo-100'
              : 'border-ink-200 hover:border-ink-300'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
        >
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="粘贴文本、丢一张截图、写下想法…

⌘/Ctrl + Enter 提交"
            className="w-full px-5 pt-5 pb-2 bg-transparent outline-none resize-none text-[15px] leading-relaxed min-h-[120px]"
            rows={4}
          />

          {images.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative group">
                  <img
                    src={src}
                    alt=""
                    className="h-20 w-20 object-cover rounded-lg border border-ink-200"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink-900 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-4 py-3 border-t border-ink-100">
            <div className="flex items-center gap-1">
              <label className="cursor-pointer p-2 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-700 transition" title="添加图片">
                <ImagePlus size={18} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              {(text || images.length > 0) && (
                <button
                  onClick={clear}
                  className="text-xs text-ink-400 hover:text-ink-600 px-2 py-1"
                >
                  清空
                </button>
              )}
              <button
                onClick={submit}
                disabled={!text.trim() && images.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Send size={14} />
                提交
              </button>
            </div>
          </div>
        </div>

        {preview && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-ink-50 to-white border border-ink-200 animate-slide-up">
            <div className="flex items-center gap-2 text-xs text-ink-500 mb-1.5">
              <Wand2 size={12} />
              <span>系统识别：</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-ink-800">将归档到</span>
              <CategoryBadge categoryId={preview.category} />
              <span className="text-xs text-ink-500">· {preview.reason}</span>
            </div>
            {preview.tags.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {preview.tags.map(t => (
                  <span key={t} className="text-[11px] text-ink-500 bg-ink-100 px-2 py-0.5 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 grid grid-cols-3 gap-3 text-xs">
          {[
            { icon: '📝', label: '写笔记', desc: '长文本/Markdown' },
            { icon: '🔗', label: '存链接', desc: '粘贴 URL' },
            { icon: '💻', label: '记代码', desc: '```包裹的代码' },
            { icon: '🖼️', label: '存截图', desc: '直接粘贴/拖拽' },
            { icon: '✅', label: '建任务', desc: '- [ ] 待办' },
            { icon: '💡', label: '闪灵感', desc: '一句话' },
          ].map(t => (
            <div key={t.label} className="p-3 rounded-lg border border-ink-200 bg-white hover:border-ink-300 transition">
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="font-medium text-ink-700">{t.label}</div>
              <div className="text-ink-400 mt-0.5">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryBadge({ categoryId }: { categoryId: string }) {
  const c = CATEGORY_MAP[categoryId as keyof typeof CATEGORY_MAP]
  if (!c) return null
  const palette: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    pink: 'bg-pink-50 text-pink-700 border-pink-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border ${palette[c.color] || palette.gray}`}>
      {c.name}
    </span>
  )
}
