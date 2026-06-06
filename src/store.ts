import type { Item, VibeSystem, CategoryId, Space } from './types'

const STORAGE_KEY = 'vibecoding-system-v1'

// 加载整个系统
export function loadSystem(): VibeSystem {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptySystem()
    const data = JSON.parse(raw) as VibeSystem
    if (data.version !== 1) return emptySystem()
    // 兼容老数据：补全缺失字段
    if (!data.spaces) data.spaces = {}
    if (!data.spaceOrder) data.spaceOrder = []
    return data
  } catch (e) {
    console.error('Failed to load system', e)
    return emptySystem()
  }
}

function emptySystem(): VibeSystem {
  return { version: 1, items: {}, spaces: {}, spaceOrder: [] }
}

export function saveSystem(sys: VibeSystem) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sys))
}

// 工具
export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function now(): number {
  return Date.now()
}

// CRUD
export function addItem(sys: VibeSystem, item: Item) {
  sys.items[item.id] = item
  saveSystem(sys)
}

export function updateItem(sys: VibeSystem, id: string, patch: Partial<Item>) {
  const it = sys.items[id]
  if (!it) return
  Object.assign(it, patch, { updatedAt: now() })
  saveSystem(sys)
}

export function moveItem(sys: VibeSystem, id: string, category: CategoryId) {
  updateItem(sys, id, { category })
}

export function deleteItem(sys: VibeSystem, id: string) {
  updateItem(sys, id, { category: 'trash', deletedAt: now() })
}

export function restoreItem(sys: VibeSystem, id: string) {
  updateItem(sys, id, { category: 'inbox', deletedAt: undefined })
}

export function purgeItem(sys: VibeSystem, id: string) {
  delete sys.items[id]
  saveSystem(sys)
}

// 列表查询
export function listByCategory(sys: VibeSystem, category: CategoryId, opts?: { includeTrash?: boolean }) {
  return Object.values(sys.items)
    .filter(it => {
      if (opts?.includeTrash) return it.category === category
      if (it.category === 'trash') return false
      return it.category === category
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return b.updatedAt - a.updatedAt
    })
}

export function searchItems(sys: VibeSystem, query: string): Item[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return Object.values(sys.items)
    .filter(it => it.category !== 'trash')
    .filter(it => {
      if (it.title.toLowerCase().includes(q)) return true
      if (it.content.toLowerCase().includes(q)) return true
      if (it.tags.some(t => t.toLowerCase().includes(q))) return true
      return false
    })
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function countsByCategory(sys: VibeSystem): Record<CategoryId, number> {
  const counts: Record<string, number> = {}
  Object.values(sys.items).forEach(it => {
    counts[it.category] = (counts[it.category] || 0) + 1
  })
  return counts as Record<CategoryId, number>
}

// ============ Space (VibeCoding 工作区目录) ============

export function addSpace(sys: VibeSystem, space: Space) {
  sys.spaces[space.id] = space
  if (space.parentId === null) {
    if (!sys.spaceOrder) sys.spaceOrder = []
    if (!sys.spaceOrder.includes(space.id)) sys.spaceOrder.push(space.id)
  }
  saveSystem(sys)
}

export function updateSpace(sys: VibeSystem, id: string, patch: Partial<Space>) {
  const s = sys.spaces[id]
  if (!s) return
  Object.assign(s, patch)
  saveSystem(sys)
}

export function deleteSpace(sys: VibeSystem, id: string) {
  // 递归删除子层 + 子层下的所有 items
  const queue = [id]
  while (queue.length) {
    const cur = queue.shift()!
    // 删 items
    Object.values(sys.items).forEach(it => {
      if (it.spaceId === cur) it.spaceId = undefined
    })
    // 找子层
    Object.values(sys.spaces).forEach(s => {
      if (s.parentId === cur) queue.push(s.id)
    })
    delete sys.spaces[cur]
    if (sys.spaceOrder) {
      sys.spaceOrder = sys.spaceOrder.filter(x => x !== cur)
    }
  }
  saveSystem(sys)
}

export function listTopSpaces(sys: VibeSystem): Space[] {
  if (!sys.spaceOrder) sys.spaceOrder = []
  const top = sys.spaceOrder
    .map(id => sys.spaces[id])
    .filter(s => s && s.parentId === null)
  return top.sort((a, b) => a.order - b.order)
}

export function listChildSpaces(sys: VibeSystem, parentId: string): Space[] {
  return Object.values(sys.spaces)
    .filter(s => s.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

export function buildSpaceTree(sys: VibeSystem, parentId: string | null = null, depth = 0): Array<Space & { depth: number; childCount: number }> {
  const result: Array<Space & { depth: number; childCount: number }> = []
  const children = parentId === null
    ? listTopSpaces(sys)
    : listChildSpaces(sys, parentId)
  for (const s of children) {
    const childCount = Object.values(sys.spaces).filter(x => x.parentId === s.id).length
    const itemCount = Object.values(sys.items).filter(it => it.spaceId === s.id).length
    result.push({ ...s, depth, childCount: itemCount })
    if (depth < 3) {
      result.push(...buildSpaceTree(sys, s.id, depth + 1))
    }
  }
  return result
}

export function getSpacePath(sys: VibeSystem, spaceId: string): Space[] {
  const path: Space[] = []
  let cur = sys.spaces[spaceId]
  while (cur) {
    path.unshift(cur)
    cur = cur.parentId ? sys.spaces[cur.parentId] : undefined as any
  }
  return path
}

export function listItemsBySpace(sys: VibeSystem, spaceId: string): Item[] {
  return Object.values(sys.items)
    .filter(it => it.spaceId === spaceId)
    .sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER
      const ob = b.order ?? Number.MAX_SAFE_INTEGER
      if (oa !== ob) return oa - ob
      return a.createdAt - b.createdAt
    })
}

// 调整 items 顺序：把 id 移动到 newIndex 位置
export function reorderSpaceItems(sys: VibeSystem, spaceId: string, id: string, direction: 'up' | 'down') {
  const items = listItemsBySpace(sys, spaceId)
  const idx = items.findIndex(it => it.id === id)
  if (idx < 0) return
  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= items.length) return

  // 重新分配 order
  items.forEach((it, i) => { it.order = i })

  // 交换
  ;[items[idx], items[target]] = [items[target], items[idx]]
  items.forEach((it, i) => { it.order = i; it.updatedAt = Date.now() })
  saveSystem(sys)
}

// 调整顶层子层顺序
export function reorderTopSpaces(sys: VibeSystem, fromId: string, toId: string) {
  if (!sys.spaceOrder) sys.spaceOrder = []
  const fromIdx = sys.spaceOrder.indexOf(fromId)
  const toIdx = sys.spaceOrder.indexOf(toId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  // 重新计算 order
  const reordered = sys.spaceOrder.filter(id => id !== fromId)
  reordered.splice(toIdx, 0, fromId)
  sys.spaceOrder = reordered
  reordered.forEach((id, i) => {
    const s = sys.spaces[id]
    if (s) s.order = i
  })
  saveSystem(sys)
}

// 调整某个目录下的分类顺序
export function reorderChildSpaces(sys: VibeSystem, parentId: string, fromId: string, toId: string) {
  const children = listChildSpaces(sys, parentId)
  const fromIdx = children.findIndex(s => s.id === fromId)
  const toIdx = children.findIndex(s => s.id === toId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return
  const reordered = children.filter(s => s.id !== fromId)
  reordered.splice(toIdx, 0, children[fromIdx])
  reordered.forEach((s, i) => { s.order = i })
  saveSystem(sys)
}
