// 系统信息架构：每个分类有自己的元数据
export type CategoryId =
  | 'inbox'        // 收件箱 - 未分类
  | 'note'         // 笔记 - 长文本
  | 'link'         // 链接 - URL
  | 'code'         // 代码 - 代码块
  | 'image'        // 图片
  | 'task'         // 任务 - TODO/待办
  | 'idea'         // 想法 - 灵感
  | 'quote'        // 引用 - 引文
  | 'reference'    // 参考 - 技术参考
  | 'trash'        // 回收站

export interface Category {
  id: CategoryId
  name: string
  icon: string
  color: string
  description: string
}

export const CATEGORIES: Category[] = [
  { id: 'inbox',     name: '收件箱',  icon: 'Inbox',          color: 'slate',  description: '刚存入，还未细看' },
  { id: 'note',      name: '笔记',    icon: 'FileText',       color: 'blue',   description: '完整的学习笔记、随笔' },
  { id: 'link',      name: '链接',    icon: 'Link',           color: 'cyan',   description: '网页、文档、参考链接' },
  { id: 'code',      name: '代码片段', icon: 'Code',          color: 'emerald', description: '可复用的代码、命令、配置' },
  { id: 'image',     name: '图片',    icon: 'Image',          color: 'purple', description: '截图、灵感图、参考图' },
  { id: 'task',      name: '任务',    icon: 'CheckSquare',    color: 'amber',  description: '待办、行动项' },
  { id: 'idea',      name: '想法',    icon: 'Lightbulb',      color: 'yellow', description: '一闪而过的灵感' },
  { id: 'quote',     name: '引用',    icon: 'Quote',          color: 'pink',   description: '他人说的话、摘录' },
  { id: 'reference', name: '参考',    icon: 'BookMarked',     color: 'indigo', description: '技术参考、API 文档摘录' },
  { id: 'trash',     name: '回收站',  icon: 'Trash2',         color: 'gray',   description: '已删除的条目' },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map(c => [c.id, c])
) as Record<CategoryId, Category>

// 系统条目类型
export type ItemKind = 'text' | 'image' | 'mixed' | 'outline'

export interface Item {
  id: string
  kind: ItemKind
  category: CategoryId
  title: string
  content: string
  images: string[]
  tags: string[]
  url?: string
  language?: string
  spaceId?: string            // 归属到 VibeCoding 工作区目录（如果有）
  outline?: OutlineNode       // 大纲笔记（OCR 来源）
  source?: 'manual' | 'ocr'   // 来源
  createdAt: number
  updatedAt: number
  order?: number              // 在所属子层中的顺序（升序）
  pinned?: boolean
  archived?: boolean
  deletedAt?: number
}

// 大纲节点
export interface OutlineNode {
  title: string
  level: number       // 1, 2, 3
  points: string[]
  children: OutlineNode[]
}

// 系统根数据
export interface VibeSystem {
  version: 1
  items: Record<string, Item>
  customCategories?: Category[]
  spaces: Record<string, Space>     // VibeCoding 工作区目录树
  spaceOrder?: string[]              // 顶级目录显示顺序
}

// 工作区目录（多层级）
export interface Space {
  id: string
  name: string
  parentId: string | null            // null = 顶级
  icon?: string
  description?: string
  createdAt: number
  order: number
}
