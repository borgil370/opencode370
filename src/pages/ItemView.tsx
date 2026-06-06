import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  Pin, Trash2, Edit3, Save, X, ExternalLink, Copy, RotateCcw,
  Folder, ChevronRight, ScanLine, ListTree
} from 'lucide-react'
import type { VibeSystem, CategoryId, Item, OutlineNode, Space } from '../types'
import { CATEGORY_MAP, CATEGORIES } from '../types'
import { MarkdownView } from '../components/MarkdownView'
import { formatFull } from '../utils/date'
import { getSpacePath, listTopSpaces, listChildSpaces } from '../store'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function ItemView({ system, onChange }: Props) {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const item = system.items[id]

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Item | null>(item || null)

  useEffect(() => {
    setDraft(item || null)
    setEditing(false)
  }, [id])

  if (!item) {
    return (
      <div className="p-8">
        <p className="text-ink-500">条目不存在</p>
        <Link to="/" className="text-indigo-600 text-sm">返回首页</Link>
      </div>
    )
  }

  function save() {
    if (!draft) return
    system.items[draft.id] = { ...draft, updatedAt: Date.now() }
    onChange({ ...system })
    setEditing(false)
  }

  function copy() {
    const text = `${item.title}\n\n${item.content}${item.url ? '\n' + item.url : ''}`
    navigator.clipboard.writeText(text)
  }

  function move(cat: CategoryId) {
    item.category = cat
    item.updatedAt = Date.now()
    onChange({ ...system })
  }

  function moveToSpace(spaceId: string | undefined) {
    item.spaceId = spaceId
    item.updatedAt = Date.now()
    onChange({ ...system })
  }

  function togglePin() {
    item.pinned = !item.pinned
    onChange({ ...system })
  }

  function trash() {
    item.category = 'trash'
    item.deletedAt = Date.now()
    item.spaceId = undefined
    onChange({ ...system })
    navigate('/')
  }

  function restore() {
    item.category = 'inbox'
    item.deletedAt = undefined
    onChange({ ...system })
  }

  function purge() {
    delete system.items[item.id]
    onChange({ ...system })
    navigate('/')
  }

  const cat = CATEGORY_MAP[item.category]
  const isTrash = item.category === 'trash'
  const isOutline = item.kind === 'outline' || !!item.outline
  const spacePath = item.spaceId ? getSpacePath(system, item.spaceId) : []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Sticky 顶部：操作 + 面包屑 + 标题 */}
        <div className="sticky top-0 z-10 -mx-8 px-8 pt-2 pb-4 bg-ink-50/85 backdrop-blur border-b border-ink-200/60 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div>
              {spacePath.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-ink-500 flex-wrap">
                  <Link to="/vibe" className="hover:text-indigo-600">VibeCoding</Link>
                  {spacePath.map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <ChevronRight size={10} />
                      {i === spacePath.length - 1 ? (
                        <span className="text-ink-700 font-medium">{p.name}</span>
                      ) : (
                        <Link to={`/v/${p.id}`} className="hover:text-indigo-600">{p.name}</Link>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isTrash && !editing && (
                <>
                  <IconBtn onClick={togglePin} title={item.pinned ? '取消置顶' : '置顶'}>
                    <Pin size={14} className={item.pinned ? 'text-amber-500 fill-amber-500' : ''} />
                  </IconBtn>
                  <IconBtn onClick={copy} title="复制全文">
                    <Copy size={14} />
                  </IconBtn>
                  <IconBtn onClick={() => setEditing(true)} title="编辑">
                    <Edit3 size={14} />
                  </IconBtn>
                  <IconBtn onClick={trash} title="移到回收站" danger>
                    <Trash2 size={14} />
                  </IconBtn>
                </>
              )}
              {isTrash && (
                <>
                  <IconBtn onClick={restore} title="恢复">
                    <RotateCcw size={14} />
                  </IconBtn>
                  <IconBtn onClick={purge} title="彻底删除" danger>
                    <Trash2 size={14} />
                  </IconBtn>
                </>
              )}
              {editing && (
                <>
                  <IconBtn onClick={() => { setEditing(false); setDraft(item) }} title="取消">
                    <X size={14} />
                  </IconBtn>
                  <IconBtn onClick={save} title="保存">
                    <Save size={14} />
                  </IconBtn>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Link
              to={`/c/${item.category}`}
              className="text-xs px-2 py-0.5 rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
            >
              {cat.name}
            </Link>
            {item.source === 'ocr' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ScanLine size={10} /> OCR
              </span>
            )}
            {isOutline && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                <ListTree size={10} /> 大纲
              </span>
            )}
            {item.language && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {item.language}
              </span>
            )}
            {item.tags.map(t => (
              <span key={t} className="text-xs text-ink-500">#{t}</span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-ink-900 leading-tight">{item.title}</h1>
          <div className="text-[11px] text-ink-400 mt-1">
            创建于 {formatFull(item.createdAt)} · 更新于 {formatFull(item.updatedAt)}
          </div>
        </div>

        {editing && draft ? (
          <Editor draft={draft} setDraft={setDraft} system={system} />
        ) : (
          <article className="prose-vc">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="not-prose flex items-center gap-2 p-3 mb-6 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 hover:bg-cyan-100 text-sm break-all"
              >
                <ExternalLink size={14} className="flex-shrink-0" />
                {item.url}
              </a>
            )}

            {/* 大纲视图：真目录样式 */}
            {item.outline && (
              <section className="not-prose mb-8 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-purple-50/30 overflow-hidden">
                <div className="px-5 py-3 border-b border-indigo-100 bg-white/60 flex items-center gap-2">
                  <ListTree size={13} className="text-indigo-600" />
                  <span className="text-xs font-semibold text-indigo-900 tracking-wide uppercase">大纲</span>
                </div>
                <div className="p-5">
                  <OutlineView node={item.outline} depth={1} indexStr="" />
                </div>
              </section>
            )}

            {item.images.length > 0 && (
              <section className="not-prose mb-8 space-y-3">
                {item.images.map((src, i) => (
                  <img key={i} src={src} alt="" className="rounded-lg border border-ink-200 max-w-full block" />
                ))}
              </section>
            )}

            {item.content && (
              <MarkdownView content={item.content} />
            )}

            {!isTrash && (
              <div className="not-prose mt-10 pt-6 border-t space-y-5">
                <div>
                  <div className="text-xs text-ink-500 mb-2 font-medium">移动到其他分类：</div>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIES.filter(c => c.id !== item.category && c.id !== 'trash').map(c => (
                      <button
                        key={c.id}
                        onClick={() => move(c.id)}
                        className="text-xs px-2.5 py-1 rounded-md border border-ink-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-ink-500 mb-2 font-medium flex items-center gap-1">
                    <Folder size={11} /> 归档到 VibeCoding 目录：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.spaceId && (
                      <button
                        onClick={() => moveToSpace(undefined)}
                        className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition"
                      >
                        移出目录
                      </button>
                    )}
                    {flattenSpaces(system, null).map(s => (
                      <button
                        key={s.id}
                        onClick={() => moveToSpace(s.id)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition ${
                          item.spaceId === s.id
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                            : 'border-ink-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {'　'.repeat(s.depth)}{s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  )
}

function IconBtn({ children, onClick, title, danger }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-md transition ${
        danger
          ? 'hover:bg-red-50 text-ink-500 hover:text-red-600'
          : 'hover:bg-ink-100 text-ink-500 hover:text-ink-700'
      }`}
    >
      {children}
    </button>
  )
}

function OutlineView({ node, depth, indexStr }: { node: OutlineNode, depth: number, indexStr: string }) {
  const [open, setOpen] = useState(true)
  const hasChildren = node.children.length > 0

  const sizeClass =
    depth === 1 ? 'text-base font-bold text-ink-900' :
    depth === 2 ? 'text-[15px] font-semibold text-ink-800' :
    depth === 3 ? 'text-sm font-medium text-ink-700' :
    'text-sm text-ink-600'

  return (
    <div className={depth > 1 ? 'ml-3 pl-4 border-l border-indigo-100/80' : ''}>
      <div
        className={`group flex items-start gap-2 py-1.5 ${hasChildren ? 'cursor-pointer' : ''} hover:bg-indigo-50/40 rounded -mx-1 px-1 transition`}
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          <ChevronRight size={12} className={`mt-2 text-ink-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
        ) : (
          <span className="w-3 h-3 mt-2 rounded-full bg-indigo-200 flex-shrink-0" />
        )}
        {indexStr && (
          <span className="font-mono text-[11px] text-indigo-500 mt-1.5 flex-shrink-0 tabular-nums">
            {indexStr}
          </span>
        )}
        <span className={`flex-1 leading-snug ${sizeClass}`}>
          {node.title}
        </span>
      </div>
      {open && node.points.length > 0 && (
        <ul className="ml-6 mt-1 mb-2 space-y-1 text-sm text-ink-600">
          {node.points.map((p, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <span className="text-indigo-300 flex-shrink-0">·</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      )}
      {open && hasChildren && (
        <div>
          {node.children.map((c, i) => (
            <OutlineView
              key={i}
              node={c}
              depth={depth + 1}
              indexStr={indexStr ? `${indexStr}.${i + 1}` : `${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function flattenSpaces(sys: VibeSystem, parentId: string | null, depth = 0): Array<Space & { depth: number }> {
  const result: Array<Space & { depth: number }> = []
  const children = parentId
    ? listChildSpaces(sys, parentId)
    : listTopSpaces(sys)
  for (const s of children) {
    result.push({ ...s, depth })
    result.push(...flattenSpaces(sys, s.id, depth + 1))
  }
  return result
}

function Editor({ draft, setDraft, system }: { draft: Item, setDraft: (i: Item) => void, system: VibeSystem }) {
  return (
    <div className="space-y-4">
      <input
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        className="w-full text-2xl font-bold border-b border-ink-200 py-2 outline-none focus:border-indigo-400"
        placeholder="标题"
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-500">目录</label>
        <label className="text-xs text-ink-500">标签（逗号分隔）</label>
        <select
          value={draft.category}
          onChange={(e) => setDraft({ ...draft, category: e.target.value as CategoryId })}
          className="border rounded-md px-2 py-1.5 text-sm"
        >
          {CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          value={draft.tags.join(', ')}
          onChange={(e) => setDraft({ ...draft, tags: e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean) })}
          className="border rounded-md px-2 py-1.5 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-ink-500">VibeCoding 目录</label>
        <label className="text-xs text-ink-500">源</label>
        <select
          value={draft.spaceId || ''}
          onChange={(e) => setDraft({ ...draft, spaceId: e.target.value || undefined })}
          className="border rounded-md px-2 py-1.5 text-sm"
        >
          <option value="">不归档</option>
          {flattenSpaces(system, null).map(s => (
            <option key={s.id} value={s.id}>{'　'.repeat(s.depth)}{s.name}</option>
          ))}
        </select>
        <select
          value={draft.source || 'manual'}
          onChange={(e) => setDraft({ ...draft, source: e.target.value as any })}
          className="border rounded-md px-2 py-1.5 text-sm"
        >
          <option value="manual">手动</option>
          <option value="ocr">OCR</option>
        </select>
      </div>

      <textarea
        value={draft.content}
        onChange={(e) => setDraft({ ...draft, content: e.target.value })}
        rows={20}
        className="w-full font-mono text-sm border rounded-lg p-3 outline-none focus:border-indigo-400 leading-relaxed"
        placeholder="正文（支持 Markdown）"
      />

      {draft.images.length > 0 && (
        <div>
          <div className="text-xs text-ink-500 mb-1.5">图片</div>
          <div className="grid grid-cols-3 gap-2">
            {draft.images.map((src, i) => (
              <div key={i} className="relative group">
                <img src={src} alt="" className="w-full h-32 object-cover rounded border border-ink-200" />
                <button
                  onClick={() => setDraft({ ...draft, images: draft.images.filter((_, idx) => idx !== i) })}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
