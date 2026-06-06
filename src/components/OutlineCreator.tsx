import { useState, useRef, useEffect } from 'react'
import { ImagePlus, X, Sparkles, Wand2, Loader2, Folder, ChevronRight, AlertCircle, Send } from 'lucide-react'
import type { VibeSystem, Space, OutlineNode } from '../types'
import { recognizeImage, toOutline, outlineToMarkdown, extractKeywords } from '../ocr'
import { classify } from '../classifier'
import { addItem, listTopSpaces, listChildSpaces, listItemsBySpace, uid, now } from '../store'
import { CATEGORY_MAP } from '../types'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
  onClose: () => void
  // 当前子层 ID（如果在某个子层页面创建）
  // 留空 = 在 VibeCoding 顶级创建，用户从所有顶层子层中选
  parentSpaceId?: string
  onCreated?: (itemId: string, spaceId: string) => void
}

export function OutlineCreator({ system, onChange, onClose, parentSpaceId = '', onCreated }: Props) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [targetSpaceId, setTargetSpaceId] = useState(parentSpaceId)
  const [autoRecommended, setAutoRecommended] = useState(false)
  const [tags, setTags] = useState('')
  const [title, setTitle] = useState('')
  const [processing, setProcessing] = useState<null | { stage: 'ocr' | 'saving', progress: number, message: string }>(null)

  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parent = parentSpaceId ? system.spaces[parentSpaceId] : null

  // 可归档的选项：
  // - 有 parentSpaceId：默认该子层，可切换到其他顶层子层
  // - 无 parentSpaceId：所有顶层子层
  const allSubOptions: Array<Space & { depth: number }> = listTopSpaces(system).map(s => ({ ...s, depth: 0 }))

  // 实时调整 textarea
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 280) + 'px'
    }
  }, [text])

  // 实时归类
  const classifyResult = (text.trim() || images.length > 0)
    ? classify({ text, images })
    : null

  // 实时推荐子层
  useEffect(() => {
    if (!classifyResult) {
      if (!parentSpaceId) {
        setTargetSpaceId('')
        setAutoRecommended(false)
      }
      setTitle('')
      setTags('')
      return
    }
    if (!title) setTitle(classifyResult.title)
    if (!tags) setTags(classifyResult.tags.join(', '))
    // 已有默认（parentSpaceId）时，不自动推荐
    if (parentSpaceId) return
    if (!targetSpaceId) {
      const recommended = recommendTargetSpace(system, text, classifyResult.title, null)
      if (recommended) {
        setTargetSpaceId(recommended.id)
        setAutoRecommended(true)
      }
    }
  }, [text, images])

  // 粘贴图片
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
    return () => window.removeEventListener('paste', handler)
  }, [])

  // 快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!processing) save()
      }
      if (e.key === 'Escape' && !processing) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [targetSpaceId, title, text, images, tags, processing])

  function readImageFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') setImages(prev => [...prev, reader.result as string])
    }
    reader.readAsDataURL(file)
  }

  function handleFiles(files: FileList | null) {
    if (!files) return
    Array.from(files).forEach(readImageFile)
  }

  function removeImage(i: number) {
    setImages(prev => prev.filter((_, idx) => idx !== i))
  }

  async function save() {
    if (!text.trim() && images.length === 0) return
    if (!targetSpaceId) {
      alert('请先选择归档的子层（笔记必须归属于某个子层）')
      return
    }

    const result = classify({ text, images })
    const finalTitle = title.trim() || result.title
    const finalTags = tags.split(/[,，]/).map(s => s.trim()).filter(Boolean)

    let finalText = text
    let finalImages = images
    let outline: OutlineNode | undefined = undefined
    let kind: 'text' | 'image' | 'mixed' | 'outline' = result.category === 'image' ? 'image' : 'text'
    let source: 'manual' | 'ocr' = 'manual'

    // 如果有图片，跑 OCR
    if (images.length > 0) {
      setProcessing({ stage: 'ocr', progress: 0, message: '正在识别图片…' })
      let ocrText = ''
      for (let i = 0; i < images.length; i++) {
        setProcessing({ stage: 'ocr', progress: (i + 0.1) / images.length, message: `识别第 ${i + 1}/${images.length} 张…` })
        try {
          const t = await recognizeImage(images[i], (p) => {
            setProcessing({ stage: 'ocr', progress: (i + p) / images.length, message: `识别第 ${i + 1}/${images.length} 张…` })
          })
          ocrText += (ocrText ? '\n\n' : '') + t
        } catch (e: any) {
          console.error('OCR failed', e)
        }
      }
      if (ocrText) {
        // 合并用户文本和 OCR 文本
        finalText = text.trim() ? text + '\n\n' + ocrText : ocrText
        outline = toOutline(ocrText)
        kind = 'outline'
        source = 'ocr'
      }
    }

    setProcessing({ stage: 'saving', progress: 1, message: '保存中…' })

    const item = {
      id: uid(),
      kind,
      category: result.category,
      title: finalTitle,
      content: finalText,
      images: finalImages,
      tags: finalTags,
      url: result.url,
      language: result.language,
      spaceId: targetSpaceId,
      outline,
      source,
      order: listItemsBySpace(system, targetSpaceId).length,
      createdAt: now(),
      updatedAt: now(),
    }
    addItem(system, item)
    onChange({ ...system })
    onCreated?.(item.id, targetSpaceId)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => !processing && onClose()}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
            <Sparkles size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-800 flex items-center gap-1.5">
              新建笔记
              {parent && (
                <span className="text-xs text-ink-500 font-normal flex items-center gap-1">
                  <Folder size={11} /> {parent.name}
                </span>
              )}
            </div>
            <div className="text-[11px] text-ink-500">
              {parent
                ? `默认归档到「${parent.name}」，可改选其他子层`
                : '必须归档到某个顶层子层'}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={!!processing}
            className="p-1.5 hover:bg-white/60 rounded text-ink-500 disabled:opacity-30"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* 输入区 */}
          <div
            className={`m-5 mb-3 rounded-xl border-2 transition-all ${
              dragOver
                ? 'border-indigo-400 ring-4 ring-indigo-100 bg-indigo-50/30'
                : 'border-ink-200'
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
              placeholder="任何形式都可以：文本、链接、代码、待办、想法…&#10;&#10;粘贴 / 拖拽 / 上传图片自动 OCR"
              disabled={!!processing}
              className="w-full px-4 pt-4 pb-2 bg-transparent outline-none resize-none text-sm leading-relaxed min-h-[100px]"
              rows={3}
            />

            {images.length > 0 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={src} alt="" className="h-16 w-16 object-cover rounded-md border border-ink-200" />
                    <button
                      onClick={() => removeImage(i)}
                      disabled={!!processing}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-ink-900 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center disabled:hidden"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 border-t border-ink-100">
              <label className={`cursor-pointer p-1.5 rounded-md hover:bg-ink-100 text-ink-500 hover:text-ink-700 transition ${processing ? 'pointer-events-none opacity-40' : ''}`} title="添加图片">
                <ImagePlus size={16} />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
              <span className="text-[10px] text-ink-400">⌘/Ctrl + Enter 提交</span>
            </div>
          </div>

          {/* 归类 + 推荐预览 */}
          {classifyResult && (
            <div className="mx-5 mb-3 p-3 rounded-lg bg-gradient-to-r from-ink-50 to-white border border-ink-200">
              <div className="flex items-center gap-2 text-[11px] text-ink-500 mb-1.5">
                <Wand2 size={11} />
                <span>系统识别</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!!processing}
                  className="font-medium text-sm bg-white border border-ink-200 rounded px-2 py-0.5 outline-none focus:border-indigo-400 flex-1 min-w-[120px]"
                  placeholder="标题"
                />
                <CategoryBadge categoryId={classifyResult.category} />
                <span className="text-[10px] text-ink-500">· {classifyResult.reason}</span>
              </div>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={!!processing}
                placeholder="标签（逗号分隔）"
                className="mt-1.5 w-full text-[11px] text-ink-600 bg-white border border-ink-200 rounded px-2 py-0.5 outline-none focus:border-indigo-400"
              />
            </div>
          )}

          {/* 必选：子层 */}
          <div className="mx-5 mb-3">
            <label className="text-[11px] text-ink-700 font-medium mb-1.5 flex items-center gap-1">
              <Folder size={11} />
              归档到子层 <span className="text-red-500">*</span>
              {autoRecommended && targetSpaceId && (
                <span className="text-emerald-600 font-normal">（已自动推荐）</span>
              )}
            </label>

            {allSubOptions.length === 0 ? (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  还没有顶层子层。请先在侧边栏 VibeCoding 下创建子层。
                </div>
              </div>
            ) : (
              <div className="space-y-1 max-h-44 overflow-y-auto border border-ink-200 rounded-lg p-1.5">
                {allSubOptions.map(s => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition ${
                      targetSpaceId === s.id
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-ink-50 border border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="target-space"
                      checked={targetSpaceId === s.id}
                      onChange={() => { setTargetSpaceId(s.id); setAutoRecommended(false) }}
                      disabled={!!processing}
                      className="text-indigo-500"
                    />
                    <Folder size={12} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">
                      {s.name}
                      {parent && s.id === parent.id && (
                        <span className="ml-1.5 text-[10px] text-emerald-600">（当前子层）</span>
                      )}
                    </span>
                    <span className="text-[10px] text-ink-400">{listItemsBySpace(system, s.id).length} 篇</span>
                  </label>
                ))}
              </div>
            )}

            {targetSpaceId && (
              <div className="mt-1.5 text-[11px] text-emerald-600 flex items-center gap-1">
                <ChevronRight size={10} />
                将归档到：{getSpacePathString(system, targetSpaceId)}
              </div>
            )}
          </div>

          {processing && (
            <div className="mx-5 mb-3">
              <div className="text-[11px] text-ink-500 mb-1">{processing.message}</div>
              <div className="h-1 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                  style={{ width: `${Math.round(processing.progress * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-ink-50/50 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={!!processing}
            className="text-xs px-3 py-1.5 text-ink-600 hover:bg-ink-100 rounded disabled:opacity-30"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={(!text.trim() && images.length === 0) || !targetSpaceId || !!processing || allSubOptions.length === 0}
            className="text-xs flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:shadow"
          >
            {processing ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                {processing.message}
              </>
            ) : (
              <>
                <Send size={12} />
                保存到子层
              </>
            )}
          </button>
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
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${palette[c.color] || palette.gray}`}>
      {c.name}
    </span>
  )
}

// 智能推荐：扫描 parent 下所有后代子层（或顶级所有顶层子层）
function recommendTargetSpace(system: VibeSystem, text: string, title: string, parentId: string | null): Space | null {
  const all: Array<Space & { depth: number }> = parentId
    ? flattenDescendantSpaces(system, parentId)
    : listTopSpaces(system).map(s => ({ ...s, depth: 0 }))
  if (all.length === 0) return null
  const t = (title + ' ' + text).toLowerCase()
  let best: { space: Space; score: number } | null = null
  for (const s of all) {
    const name = s.name.toLowerCase()
    let score = 0
    if (name && t.includes(name)) score += 8
    for (const word of name.split(/\s+/)) {
      if (word.length >= 2 && t.includes(word)) score += 2
    }
    // 路径名匹配（"教程/初步上手" 形式）
    const pathName = getSpacePathString(system, s.id).toLowerCase()
    if (pathName && t.includes(pathName)) score += 4
    if (!best || score > best.score) best = { space: s, score }
  }
  return best && best.score > 0 ? best.space : (all[0] || null)
}

function flattenDescendantSpaces(sys: VibeSystem, parentId: string, depth = 0): Array<Space & { depth: number }> {
  const result: Array<Space & { depth: number }> = []
  const children = listChildSpaces(sys, parentId)
  for (const s of children) {
    result.push({ ...s, depth })
    if (depth < 2) {
      result.push(...flattenDescendantSpaces(sys, s.id, depth + 1))
    }
  }
  return result
}

function getSpacePathString(sys: VibeSystem, id: string): string {
  const path: string[] = []
  let cur = sys.spaces[id]
  while (cur) {
    path.unshift(cur.name)
    cur = cur.parentId ? sys.spaces[cur.parentId] : undefined as any
  }
  return path.join(' / ')
}
