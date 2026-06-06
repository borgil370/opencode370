import { useEffect, useRef } from 'react'

interface Props {
  content: string
  className?: string
}

// 轻量级 markdown 渲染器（支持标题、列表、代码块、行内代码、粗体、斜体、链接、引用、分隔线、图片）
// 简化版，避免引入额外依赖
export function MarkdownView({ content, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = render(content)
  }, [content])

  return <div ref={ref} className={`prose-vc ${className}`} />
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function render(md: string): string {
  if (!md) return ''

  // 先抽出代码块
  const codeBlocks: string[] = []
  let text = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = codeBlocks.length
    codeBlocks.push(`<pre><code class="language-${lang || 'plaintext'}">${escapeHtml(code.trimEnd())}</code></pre>`)
    return `\u0000CODE${i}\u0000`
  })

  // 抽出图片
  const images: string[] = []
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const i = images.length
    images.push(`<img src="${src}" alt="${escapeHtml(alt)}" class="max-w-full rounded-lg my-3" />`)
    return `\u0000IMG${i}\u0000`
  })

  // 抽出链接（避免内部 [text] 处理破坏）
  const links: string[] = []
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const i = links.length
    links.push(`<a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
    return `\u0000LINK${i}\u0000`
  })

  // 行处理
  const lines = text.split('\n')
  const out: string[] = []
  let inList: 'ul' | 'ol' | null = null
  let inBlockquote = false
  let inTable = false
  let tableRows: string[][] = []

  const closeList = () => { if (inList) { out.push(`</${inList}>`); inList = null } }
  const closeQuote = () => { if (inBlockquote) { out.push('</blockquote>'); inBlockquote = false } }
  const closeTable = () => {
    if (inTable && tableRows.length) {
      out.push(renderTable(tableRows))
      tableRows = []
      inTable = false
    }
  }
  const closeAll = () => { closeList(); closeQuote(); closeTable() }

  for (const raw of lines) {
    const line = raw

    // 表格行
    if (/^\s*\|.+\|\s*$/.test(line)) {
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim())
      if (/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line)) {
        // 分隔行
        tableRows.push(cells.map(() => ''))  // 占位
        continue
      }
      if (!inTable) { inTable = true; tableRows = [] }
      tableRows.push(cells)
      continue
    } else {
      closeTable()
    }

    // 分隔线
    if (/^---+\s*$/.test(line)) { closeAll(); out.push('<hr />'); continue }

    // 标题
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      closeAll()
      const level = h[1].length
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      continue
    }

    // 引用
    if (/^>\s?/.test(line)) {
      closeList()
      if (!inBlockquote) { out.push('<blockquote>'); inBlockquote = true }
      out.push(`<p>${inline(line.replace(/^>\s?/, ''))}</p>`)
      continue
    } else {
      closeQuote()
    }

    // 无序列表
    const ul = line.match(/^[\s]*[-*]\s+(.+)$/)
    if (ul) {
      closeList()
      if (inList !== 'ul') { inList = 'ul'; out.push('<ul>') }
      out.push(`<li>${inline(ul[1])}</li>`)
      continue
    }

    // 有序列表
    const ol = line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (ol) {
      closeList()
      if (inList !== 'ol') { inList = 'ol'; out.push('<ol>') }
      out.push(`<li>${inline(ol[1])}</li>`)
      continue
    } else {
      closeList()
    }

    // 任务列表 - [ ] / - [x]
    const task = line.match(/^[\s]*[-*]\s+\[([ xX])\]\s+(.+)$/)
    if (task) {
      const checked = task[1].toLowerCase() === 'x'
      out.push(`<div class="flex items-start gap-2 my-1"><input type="checkbox" ${checked ? 'checked' : ''} disabled class="mt-1.5" /><span>${inline(task[2])}</span></div>`)
      continue
    }

    // 空行
    if (line.trim() === '') {
      closeAll()
      continue
    }

    // 普通段落
    out.push(`<p>${inline(line)}</p>`)
  }
  closeAll()

  let html = out.join('\n')

  // 把占位符替换回去
  html = html.replace(/\u0000CODE(\d+)\u0000/g, (_, i) => codeBlocks[+i])
  html = html.replace(/\u0000IMG(\d+)\u0000/g, (_, i) => images[+i])
  html = html.replace(/\u0000LINK(\d+)\u0000/g, (_, i) => links[+i])

  return html
}

function renderTable(rows: string[][]): string {
  if (rows.length < 2) return ''
  const header = rows[0]
  const body = rows.slice(2)  // 跳过分隔行
  return `<table><thead><tr>${header.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function inline(s: string): string {
  let t = escapeHtml(s)
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  t = t.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return t
}
