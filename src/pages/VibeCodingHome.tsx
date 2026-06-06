import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, ChevronRight, ScanLine, Sparkles, Inbox, GripVertical } from 'lucide-react'
import type { VibeSystem, Space } from '../types'
import { listTopSpaces, listChildSpaces, listItemsBySpace, reorderTopSpaces } from '../store'
import { OutlineCreator } from '../components/OutlineCreator'
import { format } from '../utils/date'

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function VibeCodingHome({ system, onChange }: Props) {
  const [showCreator, setShowCreator] = useState(false)
  const navigate = useNavigate()

  const topSpaces = listTopSpaces(system)
  const totalItems = Object.values(system.items).filter(it => it.spaceId).length

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Hero */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-50 to-cyan-50 text-emerald-700 text-xs font-medium mb-3">
            <ScanLine size={12} />
            图片 → 文字 → 大纲 → 目录
          </div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">VibeCoding 工作区</span>
          </h1>
          <p className="text-ink-500 text-sm">
            粘贴 / 拖拽 / 上传图片，自动 OCR 识别并整理成大纲笔记，<b>自动归档</b>到对应目录。
          </p>
        </div>

        {/* 主操作 */}
        <div className="rounded-2xl border-2 border-dashed border-ink-200 bg-white p-8 text-center hover:border-indigo-300 transition">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 mx-auto mb-3 flex items-center justify-center text-white shadow-md">
            <Sparkles size={26} />
          </div>
          <h2 className="text-lg font-semibold mb-1">新增图片笔记</h2>
          <p className="text-sm text-ink-500 mb-4">
            上传图片 → OCR 识别 → 自动判断归档到合适的目录
          </p>
          <button
            onClick={() => setShowCreator(true)}
            disabled={topSpaces.length === 0}
            className="px-5 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-medium shadow-sm hover:shadow disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {topSpaces.length === 0 ? '请先在侧边栏创建目录' : '开始 →'}
          </button>
        </div>

        {topSpaces.length === 0 && (
          <div className="mt-4 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-start gap-2">
            <Inbox size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              还没有任何目录。请到左侧 <b>VibeCoding</b> 区域点击 <b>+</b> 创建目录（如：教程、灵感、笔记…），才能保存笔记。
            </div>
          </div>
        )}

        {/* 统计 */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-ink-200 bg-white text-center">
            <div className="text-2xl font-bold text-indigo-600">{topSpaces.length}</div>
            <div className="text-xs text-ink-500 mt-0.5">目录</div>
          </div>
          <div className="p-3 rounded-xl border border-ink-200 bg-white text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.values(system.spaces).filter(s => s.parentId).length}
            </div>
            <div className="text-xs text-ink-500 mt-0.5">分类</div>
          </div>
          <div className="p-3 rounded-xl border border-ink-200 bg-white text-center">
            <div className="text-2xl font-bold text-emerald-600">{totalItems}</div>
            <div className="text-xs text-ink-500 mt-0.5">已归档笔记</div>
          </div>
        </div>

        {/* 目录（可拖拽） */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-ink-700">目录</h2>
            <span className="text-[10px] text-ink-400">拖拽卡片调整顺序</span>
          </div>

          {topSpaces.length === 0 ? (
            <div className="text-center py-10 text-ink-400 text-sm border border-dashed rounded-xl">
              还没有目录。先在左侧创建几个吧～
            </div>
          ) : (
            <DraggableSpaceGrid
              spaces={topSpaces}
              system={system}
              onReorder={(from, to) => {
                reorderTopSpaces(system, from, to)
                onChange({ ...system })
              }}
              onClick={(id) => navigate(`/v/${id}`)}
            />
          )}
        </div>
      </div>

      {showCreator && (
        <OutlineCreator
          system={system}
          onChange={onChange}
          onClose={() => setShowCreator(false)}
          parentSpaceId={''}
          onCreated={(itemId, spaceId) => {
            navigate(`/i/${itemId}`)
          }}
        />
      )}
    </div>
  )
}

function DraggableSpaceGrid({ spaces, system, onReorder, onClick }: {
  spaces: Space[]
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
      {spaces.map(s => {
        const cnt = listItemsBySpace(system, s.id).length
        const sub = listChildSpaces(system, s.id).length
        const recent = listItemsBySpace(system, s.id)[0]
        const isDragging = draggingId === s.id
        const isOver = overId === s.id && draggingId !== s.id

        return (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => handleDragStart(e, s.id)}
            onDragOver={(e) => handleDragOver(e, s.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, s.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onClick(s.id)}
            className={`group relative p-4 rounded-xl border bg-gradient-to-br from-white to-ink-50/50 cursor-pointer transition overflow-hidden ${
              isDragging
                ? 'opacity-40 border-indigo-400'
                : isOver
                ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-lg scale-[1.02]'
                : 'border-ink-200 hover:border-indigo-300 hover:shadow-md'
            }`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-100/40 to-purple-100/40 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform" />

            {/* 拖拽手柄 */}
            <div className="absolute top-2 right-2 text-ink-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing">
              <GripVertical size={14} />
            </div>

            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-105 transition">
                <Folder size={18} />
              </div>
              <h3 className="font-semibold text-ink-800 truncate mb-0.5">{s.name}</h3>
              <div className="text-[11px] text-ink-500">
                {cnt} 篇{sub > 0 ? ` · ${sub} 分类` : ''}
              </div>
              {recent && (
                <div className="mt-1.5 pt-1.5 border-t border-ink-100/80 text-[10px] text-ink-400 flex items-center gap-1">
                  <span className="truncate flex-1">最近：{recent.title}</span>
                  <span className="flex-shrink-0">{format(recent.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
