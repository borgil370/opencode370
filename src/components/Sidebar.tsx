import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Inbox, FileText, Link as LinkIcon, Code, Image as ImageIcon,
  CheckSquare, Lightbulb, Quote, BookMarked, Trash2, Home,
  FolderTree, ChevronRight, ChevronDown, Plus, Folder, MoreHorizontal, Pencil, Trash
} from 'lucide-react'
import { CATEGORIES } from '../types'
import type { VibeSystem, Space } from '../types'
import { countsByCategory, listTopSpaces, listChildSpaces, addSpace, updateSpace, deleteSpace } from '../store'

const ICONS: Record<string, any> = {
  Inbox, FileText, Link: LinkIcon, Code, Image: ImageIcon,
  CheckSquare, Lightbulb, Quote, BookMarked, Trash2, Folder
}

interface Props {
  system: VibeSystem
  onChange: (sys: VibeSystem) => void
}

export function Sidebar({ system, onChange }: Props) {
  const counts = countsByCategory(system)
  const topSpaces = listTopSpaces(system)

  return (
    <aside className="w-64 border-r bg-white flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto p-2 pt-3 scrollbar-thin">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1 transition ${
              isActive
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm'
                : 'hover:bg-ink-100 text-ink-700'
            }`
          }
        >
          <Home size={16} />
          <span>首页 / 收件</span>
        </NavLink>

        <div className="mt-4 px-2 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-400 uppercase tracking-wider">目录</span>
        </div>

        {CATEGORIES.filter(c => c.id !== 'inbox').map(cat => {
          const Icon = ICONS[cat.icon] || FileText
          const count = counts[cat.id] || 0
          return (
            <NavLink
              key={cat.id}
              to={`/c/${cat.id}`}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm mb-0.5 transition group ${
                  isActive
                    ? 'bg-ink-100 text-ink-900 font-medium'
                    : 'hover:bg-ink-50 text-ink-700'
                }`
              }
            >
              <Icon size={15} className="text-ink-500 group-hover:text-ink-700" />
              <span className="flex-1 truncate">{cat.name}</span>
              {count > 0 && (
                <span className="text-xs text-ink-400 bg-ink-100 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </NavLink>
          )
        })}

        <div className="mt-5 px-2 flex items-center justify-between">
          <span className="text-xs font-medium text-ink-400 uppercase tracking-wider flex items-center gap-1">
            <FolderTree size={11} />
            VibeCoding
          </span>
          <NewSpaceButton system={system} onChange={onChange} parentId={null} kind="dir" />
        </div>

        {topSpaces.length === 0 ? (
          <div className="px-3 py-3 text-xs text-ink-400 leading-relaxed">
            点击 + 创建第一个目录
          </div>
        ) : (
          <div className="mt-1">
            {topSpaces.map(s => (
              <SpaceNode key={s.id} space={s} system={system} onChange={onChange} depth={0} />
            ))}
          </div>
        )}

        <div className="mt-4 px-2 text-xs text-ink-400">
          <div className="text-[10px] uppercase tracking-wider mb-1">信息架构</div>
          <p className="text-[11px] leading-relaxed text-ink-500">
            首页存日常内容（自动归类）。VibeCoding 工作区专门放图片识别后的大纲笔记。
          </p>
        </div>
      </nav>

      <div className="p-3 border-t text-[11px] text-ink-400">
        v0.2 · 数据保存在本地
      </div>
    </aside>
  )
}

function SpaceNode({ space, system, onChange, depth }: {
  space: Space
  system: VibeSystem
  onChange: (s: VibeSystem) => void
  depth: number
}) {
  const children = listChildSpaces(system, space.id)
  const itemCount = Object.values(system.items).filter(it => it.spaceId === space.id).length
  const loc = useLocation()
  const isActive = loc.pathname === `/v/${space.id}`
  const isExpanded = loc.pathname.startsWith(`/v/${space.id}`) || children.length > 0 && (children.some(c => loc.pathname.includes(c.id)) || loc.pathname.startsWith(`/v/${space.id}`))
  const [showMenu, setShowMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draftName, setDraftName] = useState(space.name)
  const navigate = useNavigate()

  function toggleExpand() {
    if (children.length === 0) {
      navigate(`/v/${space.id}`)
    } else {
      // 简单的展开/收起：用 URL 状态
      if (isExpanded) navigate(`/v/${space.id}`)
      else navigate(`/v/${space.id}?expand=${space.id}`)
    }
  }

  function commitRename() {
    updateSpace(system, space.id, { name: draftName.trim() || space.name })
    onChange({ ...system })
    setRenaming(false)
  }

  function remove() {
    if (!confirm(`确定删除「${space.name}」${space.parentId === null ? '及其所有分类' : ''}？笔记会移到「首页」。`)) return
    deleteSpace(system, space.id)
    onChange({ ...system })
    setShowMenu(false)
  }

  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded-md text-sm transition ${
          isActive ? 'bg-ink-100 text-ink-900 font-medium' : 'hover:bg-ink-50 text-ink-700'
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        {children.length > 0 ? (
          <button
            onClick={toggleExpand}
            className="p-0.5 text-ink-400 hover:text-ink-700"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-4" />
        )}

        <Folder size={13} className="text-indigo-500 flex-shrink-0" />

        {renaming ? (
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
            autoFocus
            className="flex-1 bg-white border border-indigo-300 rounded px-1 py-0.5 text-xs outline-none"
          />
        ) : (
          <NavLink
            to={`/v/${space.id}`}
            className="flex-1 truncate"
          >
            {space.name}
          </NavLink>
        )}

        {itemCount > 0 && (
          <span className="text-[10px] text-ink-400 bg-ink-100 px-1.5 rounded-full">
            {itemCount}
          </span>
        )}

        {space.parentId === null && (
          <div className="opacity-0 group-hover:opacity-100">
            <NewSpaceButton system={system} onChange={onChange} parentId={space.id} kind="cat" />
          </div>
        )}

        <div className="opacity-0 group-hover:opacity-100 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-0.5 text-ink-400 hover:text-ink-700 rounded"
          >
            <MoreHorizontal size={12} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-5 z-20 bg-white border rounded-md shadow-lg py-1 w-32 text-xs">
                <button
                  onClick={() => { setRenaming(true); setShowMenu(false) }}
                  className="w-full text-left px-2 py-1.5 hover:bg-ink-50 flex items-center gap-1.5"
                >
                  <Pencil size={11} /> 重命名
                </button>
                <button
                  onClick={remove}
                  className="w-full text-left px-2 py-1.5 hover:bg-red-50 text-red-600 flex items-center gap-1.5"
                >
                  <Trash size={11} /> 删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isExpanded && children.map(c => (
        <SpaceNode key={c.id} space={c} system={system} onChange={onChange} depth={depth + 1} />
      ))}
    </div>
  )
}

function NewSpaceButton({ system, onChange, parentId, kind = 'dir' }: {
  system: VibeSystem
  onChange: (s: VibeSystem) => void
  parentId: string | null
  kind?: 'dir' | 'cat'
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const label = kind === 'cat' ? '分类' : '目录'
  const title = kind === 'cat' ? '新建分类' : '新建目录'
  const placeholder = kind === 'cat' ? '分类名称…' : '目录名称…'

  function create() {
    const n = name.trim()
    if (!n) return
    const id = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
    const siblings = parentId
      ? listChildSpaces(system, parentId)
      : listTopSpaces(system)
    addSpace(system, {
      id,
      name: n,
      parentId,
      icon: 'Folder',
      createdAt: Date.now(),
      order: siblings.length,
    })
    onChange({ ...system })
    setName('')
    setOpen(false)
  }

  if (parentId !== null) {
    // 内联模式：用于在某个目录节点旁内嵌「+」直接创建子层
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
          className="p-0.5 text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
          title={title}
        >
          <Plus size={11} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-full top-0 ml-1 z-20 bg-white border rounded-md shadow-lg p-2 w-44">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') create()
                  if (e.key === 'Escape') setOpen(false)
                }}
                autoFocus
                placeholder={placeholder}
                className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-indigo-400"
              />
              <div className="text-[10px] text-ink-400 mt-1.5 px-1">
                Enter 创建，Esc 关闭
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-0.5 text-ink-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
        title={title}
      >
        <Plus size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-white border rounded-md shadow-lg p-2 w-48">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
                if (e.key === 'Escape') setOpen(false)
              }}
              autoFocus
              placeholder={placeholder}
              className="w-full px-2 py-1 text-xs border rounded outline-none focus:border-indigo-400"
            />
            <div className="text-[10px] text-ink-400 mt-1.5 px-1">
              Enter 创建，Esc 关闭
            </div>
          </div>
        </>
      )}
    </div>
  )
}
