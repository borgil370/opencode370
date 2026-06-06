import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronRight, Folder, FileText, Plus,
  Pencil, Trash, Image as ImageIcon, Sparkles,
  ArrowUp, ArrowDown, Pin, GripVertical
} from 'lucide-react'
import type { VibeSystem, Item, Space } from '../types'
import {
  listChildSpaces, listItemsBySpace, getSpacePath,
  updateSpace, deleteSpace, reorderSpaceItems, reorderChildSpaces
} from '../store'
import { format } from '../utils/date'
import { OutlineCreator } from '../components/OutlineCreator'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function SpaceView({ system, onChange }: Props) {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showCreator, setShowCreator] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const space = system.spaces[id]

  useEffect(() => {
    if (space) setDraftName(space.name)
  }, [id, space?.name])

  if (!space) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-500">
        <div className="text-center">
          <div className="text-5xl mb-3">📁</div>
          <p>目录不存在</p>
          <Link to="/vibe" className="mt-3 text-sm text-indigo-600 hover:underline">
            返回 VibeCoding
          </Link>
        </div>
      </div>
    )
  }

  const items = listItemsBySpace(system, space.id)
  const children = listChildSpaces(system, space.id)  // 直接下一级子层
  const path = getSpacePath(system, space.id)

  function commitRename() {
    updateSpace(system, space.id, { name: draftName.trim() || space.name })
    onChange({ ...system })
    setRenaming(false)
  }

  function remove() {
    if (!confirm(`删除「${space.name}」${space.parentId === null ? '及其所有分类' : ''}和所有笔记？`)) return
    deleteSpace(system, space.id)
    onChange({ ...system })
    if (path.length > 1) navigate(`/v/${path[path.length - 2].id}`)
    else navigate('/vibe')
  }

  function createCategory() {
    const name = newCategoryName.trim()
    if (!name) return
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    const siblings = listChildSpaces(system, space.id)
    system.spaces[id] = {
      id,
      name,
      parentId: space.id,
      icon: 'Folder',
      createdAt: Date.now(),
      order: siblings.length,
    }
    onChange({ ...system })
    setNewCategoryName('')
    setShowNewCategory(false)
    navigate(`/v/${id}`)
  }

  function move(it: Item, dir: 'up' | 'down') {
    reorderSpaceItems(system, space.id, it.id, dir)
    onChange({ ...system })
  }

  function trashItem(it: Item) {
    it.category = 'trash'
    it.deletedAt = Date.now()
    it.spaceId = undefined
    onChange({ ...system })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-8 py-8">
        {/* 面包屑 */}
        <div className="flex items-center gap-1 text-sm text-ink-500 mb-3 flex-wrap">
          <Link to="/vibe" className="hover:text-indigo-600">VibeCoding</Link>
          {path.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <ChevronRight size={12} />
              {i === path.length - 1 ? (
                <span className="text-ink-700 font-medium">{p.name}</span>
              ) : (
                <Link to={`/v/${p.id}`} className="hover:text-indigo-600">{p.name}</Link>
              )}
            </span>
          ))}
        </div>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
            <Folder size={20} className="text-indigo-600" />
          </div>
          {renaming ? (
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
              autoFocus
              className="text-2xl font-bold bg-white border-b-2 border-indigo-400 outline-none flex-1"
            />
          ) : (
            <h1 className="text-2xl font-bold flex-1">{space.name}</h1>
          )}
          <span className="text-sm text-ink-400">{items.length} 篇</span>
          {space.parentId === null && (
            <div className="relative">
              <button
                onClick={() => { setShowNewCategory(!showNewCategory); setNewCategoryName('') }}
                className="p-1.5 text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="新建分类"
              >
                <Plus size={14} />
              </button>
              {showNewCategory && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNewCategory(false)} />
                  <div className="absolute right-0 top-9 z-20 bg-white border rounded-md shadow-lg p-2 w-48">
                    <input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') createCategory()
                        if (e.key === 'Escape') setShowNewCategory(false)
                      }}
                      autoFocus
                      placeholder="分类名称…"
                      className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-indigo-400"
                    />
                    <div className="text-[10px] text-ink-400 mt-1.5 px-1">
                      Enter 创建，Esc 关闭
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => setRenaming(true)}
            className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded"
            title="重命名"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={remove}
            className="p-1.5 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <Trash size={14} />
          </button>
        </div>

        {/* 分类（卡片）—— 仅目录页有，分类页跳过 */}
        {space.parentId === null && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
                <Folder size={11} /> 分类（{children.length}）
              </div>
              {children.length > 1 && (
                <span className="text-[10px] text-ink-400">拖拽卡片调整顺序</span>
              )}
            </div>
            {children.length === 0 ? (
              <div className="text-center py-10 text-ink-400 border border-dashed rounded-xl text-sm">
                还没有分类。点击标题右侧的 <Plus size={12} className="inline -mt-0.5" /> 新建一个。
              </div>
            ) : (
              <DraggableCategoryGrid
                children_={children}
                system={system}
                onReorder={(from, to) => {
                  reorderChildSpaces(system, space.id, from, to)
                  onChange({ ...system })
                }}
                onClick={(id) => navigate(`/v/${id}`)}
              />
            )}
          </div>
        )}

        {/* 笔记（列表） */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-ink-500 font-medium flex items-center gap-1.5">
              <FileText size={11} /> 笔记（{items.length}）
            </div>
            <button
              onClick={() => setShowCreator(true)}
              className="text-xs flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-md hover:shadow transition"
            >
              <Sparkles size={12} /> 新增笔记
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center py-16 text-ink-400 border border-dashed rounded-xl">
              <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">这个{space.parentId === null ? '目录' : '分类'}还没有笔记</p>
              <p className="text-xs mt-1">点击右上「新增笔记」开始</p>
            </div>
          ) : (
            <div className="rounded-xl border border-ink-200 bg-white divide-y divide-ink-100 overflow-hidden">
              {items.map((it, idx) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  index={idx}
                  total={items.length}
                  onClick={() => navigate(`/i/${it.id}`)}
                  onMoveUp={() => move(it, 'up')}
                  onMoveDown={() => move(it, 'down')}
                  onDelete={() => trashItem(it)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreator && (
        <OutlineCreator
          system={system}
          onChange={onChange}
          onClose={() => setShowCreator(false)}
          parentSpaceId={space.id}
          onCreated={(itemId) => {
            navigate(`/i/${itemId}`)
          }}
        />
      )}
    </div>
  )
}

function ItemRow({ item, index, total, onClick, onMoveUp, onMoveDown, onDelete }: {
  item: Item
  index: number
  total: number
  onClick: () => void
  onMoveUp: () => void
  onDelete: () => void
  onMoveDown: () => void
}) {
  const snippet = item.content
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
    .replace(/^#+\s*/gm, '')
    .replace(/\n+/g, ' ')
    .slice(0, 200)
  const sections = item.outline?.children || []

  return (
    <div
      onClick={onClick}
      className="group flex items-start gap-3 p-3 hover:bg-ink-50 cursor-pointer transition"
    >
      {item.images[0] ? (
        <img src={item.images[0]} alt="" className="w-12 h-12 object-cover rounded-md border border-ink-200 flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-ink-100 to-ink-50 flex items-center justify-center text-ink-400 flex-shrink-0">
          <FileText size={18} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.pinned && <Pin size={11} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
          {item.source === 'ocr' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">OCR</span>
          )}
          {sections.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex-shrink-0">
              {sections.length} 节
            </span>
          )}
          <h3 className="font-medium text-ink-800 truncate flex-1 text-sm">{item.title}</h3>
          <span className="text-[11px] text-ink-400 flex-shrink-0">{format(item.updatedAt)}</span>
        </div>
        {snippet && <p className="text-xs text-ink-500 line-clamp-1 leading-relaxed">{snippet}</p>}
        {item.tags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.tags.slice(0, 4).map(t => (
              <span key={t} className="text-[10px] bg-ink-100 text-ink-600 px-1.5 py-0.5 rounded">#{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 flex-shrink-0 transition">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
          disabled={index === 0}
          className="p-1 text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="上移"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
          disabled={index === total - 1}
          className="p-1 text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="下移"
        >
          <ArrowDown size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="p-1 text-ink-400 hover:text-red-600 hover:bg-red-50 rounded"
          title="移到回收站"
        >
          <Trash size={12} />
        </button>
      </div>
    </div>
  )
}

function DraggableCategoryGrid({ children_, system, onReorder, onClick }: {
  children_: Space[]
  system: VibeSystem
  onReorder: (fromId: string, toId: string) => void
  onClick: (id: string) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== overId) setOverId(id)
  }

  function handleDragLeave() {
    setOverId(null)
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const fromId = e.dataTransfer.getData('text/plain')
    if (fromId && fromId !== targetId) {
      onReorder(fromId, targetId)
    }
    setDraggingId(null)
    setOverId(null)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setOverId(null)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {children_.map(c => {
        const cnt = listItemsBySpace(system, c.id).length
        const isDragging = draggingId === c.id
        const isOver = overId === c.id && draggingId !== c.id

        return (
          <div
            key={c.id}
            draggable
            onDragStart={(e) => handleDragStart(e, c.id)}
            onDragOver={(e) => handleDragOver(e, c.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, c.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onClick(c.id)}
            className={`group p-4 rounded-xl border bg-gradient-to-br from-white to-ink-50/50 cursor-pointer transition relative overflow-hidden ${
              isDragging
                ? 'opacity-40 border-indigo-400'
                : isOver
                ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg scale-[1.02]'
                : 'border-ink-200 hover:border-indigo-300 hover:shadow-md'
            }`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />
            <div className="absolute top-2 right-2 text-ink-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} />
            </div>
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition">
                <Folder size={18} />
              </div>
              <h3 className="font-semibold text-ink-800 truncate mb-0.5">{c.name}</h3>
              <div className="text-[11px] text-ink-500">
                {cnt} 篇
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
