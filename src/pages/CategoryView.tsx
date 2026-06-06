import { useParams, useNavigate, Link } from 'react-router-dom'
import { CATEGORIES, CATEGORY_MAP } from '../types'
import type { VibeSystem, CategoryId } from '../types'
import { listByCategory } from '../store'
import { useState } from 'react'
import { ArrowLeft, Pin, Trash2, Search } from 'lucide-react'
import { MarkdownView } from '../components/MarkdownView'
import { format } from '../utils/date'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function CategoryView({ system, onChange }: Props) {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const cat = CATEGORY_MAP[id as CategoryId]
  const items = listByCategory(system, id as CategoryId)
  const [query, setQuery] = useState('')

  if (!cat) {
    return (
      <div className="p-8">
        <p className="text-ink-500">目录不存在</p>
        <Link to="/" className="text-indigo-600 text-sm">返回首页</Link>
      </div>
    )
  }

  const filtered = query
    ? items.filter(it => it.title.includes(query) || it.content.includes(query))
    : items

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700 mb-4"
        >
          <ArrowLeft size={14} /> 返回
        </button>

        <div className="flex items-end justify-between mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {cat.name}
              <span className="text-sm font-normal text-ink-400">
                {items.length} 项
              </span>
            </h1>
            <p className="text-sm text-ink-500 mt-1">{cat.description}</p>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="在当前目录搜索…"
              className="pl-8 pr-3 py-2 text-sm border rounded-md w-56 outline-none focus:border-indigo-400"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-400">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-sm">这个目录里还没有内容</p>
            <Link to="/" className="text-indigo-600 text-xs mt-2 inline-block">
              去首页添加 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => navigate(`/i/${item.id}`)}
                onPin={() => {
                  item.pinned = !item.pinned
                  onChange({ ...system })
                }}
                onDelete={() => {
                  item.category = 'trash'
                  item.deletedAt = Date.now()
                  onChange({ ...system })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ItemCard({ item, onClick, onPin, onDelete }: {
  item: any
  onClick: () => void
  onPin: () => void
  onDelete: () => void
}) {
  const snippet = item.content.replace(/```[\s\S]*?```/g, '[代码]').replace(/!\[.*?\]\(.*?\)/g, '[图片]').slice(0, 200)
  return (
    <div
      onClick={onClick}
      className="group p-4 rounded-xl border border-ink-200 bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer transition"
    >
      <div className="flex items-start gap-3">
        {item.images[0] && (
          <img src={item.images[0]} alt="" className="w-16 h-16 object-cover rounded-md border border-ink-200 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {item.pinned && <Pin size={12} className="text-amber-500 fill-amber-500" />}
            <h3 className="font-medium text-ink-800 truncate flex-1">{item.title}</h3>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition">
              <button
                onClick={(e) => { e.stopPropagation(); onPin() }}
                className="p-1 hover:bg-ink-100 rounded text-ink-500"
                title="置顶"
              >
                <Pin size={13} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-1 hover:bg-red-50 rounded text-ink-500 hover:text-red-600"
                title="移到回收站"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
          {snippet && <p className="text-sm text-ink-500 line-clamp-2 leading-relaxed">{snippet}</p>}
          <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-400">
            <span>{format(item.updatedAt)}</span>
            {item.tags.slice(0, 3).map((t: string) => (
              <span key={t} className="bg-ink-100 px-1.5 py-0.5 rounded">#{t}</span>
            ))}
            {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-cyan-600 hover:underline truncate max-w-[200px]">🔗 {item.url}</a>}
          </div>
        </div>
      </div>
    </div>
  )
}
