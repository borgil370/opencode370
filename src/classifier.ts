import type { CategoryId, Item } from './types'
import { uid, now } from './store'

export interface RawInput {
  text: string
  images: string[]  // base64
}

export interface ClassifyResult {
  category: CategoryId
  confidence: number
  reason: string
  title: string
  tags: string[]
  url?: string
  language?: string
}

// 主分类函数：给定原始输入，判定应该放到哪个目录
export function classify(input: RawInput): ClassifyResult {
  const text = input.text.trim()
  const hasImages = input.images.length > 0

  // 1. 纯图片 → 图片
  if (hasImages && !text) {
    return {
      category: 'image',
      confidence: 0.99,
      reason: '只包含图片',
      title: '图片 ' + new Date().toLocaleString('zh-CN'),
      tags: ['图片'],
    }
  }

  // 2. 纯 URL → 链接
  const urlMatch = text.match(/^https?:\/\/\S+$/)
  if (urlMatch && !hasImages) {
    return {
      category: 'link',
      confidence: 0.99,
      reason: '是 URL',
      title: extractLinkTitle(text),
      tags: ['链接'],
      url: text,
    }
  }

  // 3. 包含代码块（```...``` 或单行 `$ command`）
  const hasCodeBlock = /```[\s\S]*?```/.test(text)
  if (hasCodeBlock && !hasImages) {
    return {
      category: 'code',
      confidence: 0.92,
      reason: '包含代码块',
      title: extractCodeTitle(text) || '代码片段',
      tags: ['代码'],
      language: detectLanguage(text),
    }
  }

  // 4. 包含 shell 命令或代码片段
  const isShellCmd = /^(?:\$ |npm |pnpm |yarn |git |docker |curl |cd |ls |cat |echo |python |node |tsc |vite )/m.test(text)
  if (isShellCmd && !hasImages && text.length < 500) {
    return {
      category: 'code',
      confidence: 0.85,
      reason: '看起来是 shell 命令',
      title: extractCodeTitle(text) || text.split('\n')[0].slice(0, 50),
      tags: ['代码', '命令'],
      language: 'shell',
    }
  }

  // 5. 任务 / 待办
  const hasTaskMark = /(?:^|\n)\s*[-*]\s*\[[ xX]\]/.test(text) ||
                      /(?:^|\n)\s*(?:TODO|FIXME|待办|任务)[:：]/.test(text) ||
                      /(?:^|\n)\s*☑|☐|✅|❌/.test(text)
  if (hasTaskMark && !hasImages) {
    return {
      category: 'task',
      confidence: 0.9,
      reason: '包含待办标记',
      title: extractFirstLine(text) || '任务',
      tags: ['任务'],
    }
  }

  // 6. 引用 / 摘录
  const isQuote = /^>/.test(text) && !hasImages ||
                  /「.+?」[——]/.test(text) ||
                  /^".+"[——]/.test(text)
  if (isQuote) {
    return {
      category: 'quote',
      confidence: 0.85,
      reason: '看起来是引用 / 摘录',
      title: extractFirstLine(text, 30) || '摘录',
      tags: ['引用'],
    }
  }

  // 7. 技术参考：含 import / function / class / const / interface 等
  const looksLikeRef = /\b(import|export|function|class|interface|type\s+\w+|const\s+\w+\s*=|def\s+\w+)\b/.test(text) &&
                       text.length < 800
  if (looksLikeRef && !hasImages) {
    return {
      category: 'reference',
      confidence: 0.78,
      reason: '含代码关键字，可能是技术参考',
      title: extractFirstLine(text, 50) || '技术参考',
      tags: ['参考'],
    }
  }

  // 8. 长文本（>200 字）或含 markdown 结构 → 笔记
  const wordCount = text.length
  const hasMarkdown = /(^|\n)#{1,6}\s/.test(text) || /(\n|^)\s*[-*]\s/.test(text)
  if ((wordCount > 200 || hasMarkdown) && !hasImages) {
    return {
      category: 'note',
      confidence: hasMarkdown ? 0.88 : 0.75,
      reason: hasMarkdown ? '含 Markdown 结构' : '长文本',
      title: extractFirstLine(text, 60) || '笔记',
      tags: ['笔记'],
    }
  }

  // 9. 短文本 + 有图片 → 笔记（图文）
  if (hasImages) {
    if (text.length < 80) {
      return {
        category: 'idea',
        confidence: 0.7,
        reason: '图文短描述',
        title: text.slice(0, 40) || '想法',
        tags: ['想法', '图片'],
      }
    }
    return {
      category: 'note',
      confidence: 0.8,
      reason: '图文混排',
      title: extractFirstLine(text, 50),
      tags: ['笔记', '图片'],
    }
  }

  // 10. 短文本（<= 50 字）→ 想法
  if (wordCount <= 50) {
    return {
      category: 'idea',
      confidence: 0.7,
      reason: '短文本（一闪而过的灵感）',
      title: text,
      tags: ['想法'],
    }
  }

  // 11. 中等长度 → 笔记
  return {
    category: 'note',
    confidence: 0.65,
    reason: '默认归为笔记',
    title: extractFirstLine(text, 50) || '笔记',
    tags: ['笔记'],
  }
}

// 从原始输入 + 分类结果构造 Item
export function buildItem(input: RawInput, result: ClassifyResult): Item {
  return {
    id: uid(),
    kind: input.images.length > 0
      ? (input.text ? 'mixed' : 'image')
      : 'text',
    category: result.category,
    title: result.title,
    content: input.text,
    images: input.images,
    tags: result.tags,
    url: result.url,
    language: result.language,
    createdAt: now(),
    updatedAt: now(),
  }
}

// 工具：从 markdown 链接推断标题
function extractLinkTitle(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname.slice(0, 30) : '')
  } catch {
    return url.slice(0, 50)
  }
}

function extractCodeTitle(text: string): string {
  // 优先看 markdown 标题
  const m = text.match(/^#{1,3}\s+(.+)$/m)
  if (m) return m[1].trim().slice(0, 60)
  // 第一行非空
  return extractFirstLine(text, 50)
}

function extractFirstLine(text: string, max = 60): string {
  const line = text.split('\n').map(l => l.trim()).find(l => l.length > 0) || ''
  // 去掉 markdown 标记
  return line
    .replace(/^#+\s*/, '')
    .replace(/^[-*]\s+/, '')
    .replace(/^>\s*/, '')
    .replace(/^```\w*\s*/, '')
    .replace(/```$/, '')
    .slice(0, max)
}

function detectLanguage(text: string): string {
  if (/```(ts|typescript)/.test(text)) return 'typescript'
  if (/```(js|javascript)/.test(text)) return 'javascript'
  if (/```(py|python)/.test(text)) return 'python'
  if (/```(sh|bash|shell)/.test(text)) return 'shell'
  if (/```(json)/.test(text)) return 'json'
  if (/```(css)/.test(text)) return 'css'
  if (/```(html)/.test(text)) return 'html'
  if (/```(sql)/.test(text)) return 'sql'
  return 'plaintext'
}
