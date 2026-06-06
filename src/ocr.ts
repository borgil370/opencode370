import { createWorker, type Worker } from 'tesseract.js'
import type { OutlineNode } from './types'

let _worker: Worker | null = null
let _loading: Promise<Worker> | null = null

async function getWorker(): Promise<Worker> {
  if (_worker) return _worker
  if (_loading) return _loading
  _loading = (async () => {
    const w = await createWorker(['chi_sim', 'eng'], 1, {
      logger: () => {},
    })
    _worker = w
    return w
  })()
  return _loading
}

// 识别图片中的文字
export async function recognizeImage(src: string, onProgress?: (p: number) => void): Promise<string> {
  onProgress?.(0)
  const worker = await getWorker()
  onProgress?.(0.3)
  const { data } = await worker.recognize(src)
  onProgress?.(1)
  return data.text || ''
}

// 把 OCR 文本转成大纲
export function toOutline(rawText: string): OutlineNode {
  const text = rawText.trim()
  if (!text) {
    return { title: '空内容', level: 1, points: [], children: [] }
  }

  // 尝试识别章节标题
  // 模式 1: 数字编号 "一、" "二、" "1." "1.1" "第一章"
  // 模式 2: 短行（长度 < 30 且无句末标点） + 后面有内容

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  // 第一行作为主标题
  const root: OutlineNode = {
    title: lines[0]?.slice(0, 50) || '未命名',
    level: 1,
    points: [],
    children: [],
  }

  // 模式 A: 多级编号
  const levelPatterns: Array<{ re: RegExp, level: number }> = [
    { re: /^[一二三四五六七八九十]+、/, level: 1 },
    { re: /^\d+\.\s+/, level: 1 },
    { re: /^\d+\.\d+\s+/, level: 2 },
    { re: /^（\d+）/, level: 1 },
    { re: /^[①②③④⑤⑥⑦⑧⑨⑩]/, level: 1 },
  ]

  // 简单策略：把所有短行（< 35 字且无句末标点）当作标题
  // 其他行作为内容
  let currentSection: OutlineNode = root

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    // 是否是编号标题
    let detectedLevel = 0
    for (const { re, level } of levelPatterns) {
      if (re.test(line)) { detectedLevel = level; break }
    }

    if (detectedLevel > 0) {
      const node: OutlineNode = {
        title: line.replace(/^[\d.、（）()①②③④⑤⑥⑦⑧⑨⑩一二三四五六七八九十\s]+/, '').slice(0, 60) || line,
        level: detectedLevel + 1,  // 1 之后
        points: [],
        children: [],
      }
      // 找到合适的父节点
      let parent = root
      for (const c of root.children) {
        if (c.level <= node.level - 1) parent = c
      }
      parent.children.push(node)
      currentSection = node
    } else if (line.length < 35 && !/[。！？.!?]$/.test(line) && currentSection !== root) {
      // 短行，可能是子标题
      const node: OutlineNode = {
        title: line,
        level: Math.min(currentSection.level + 1, 3),
        points: [],
        children: [],
      }
      currentSection.children.push(node)
      currentSection = node
    } else {
      // 普通内容
      currentSection.points.push(line)
    }
  }

  // 如果没识别出任何章节结构，做兜底
  if (root.children.length === 0 && root.points.length === 0) {
    // 把所有行作为 root 的 points
    root.points = lines.slice(1, 10)  // 最多 10 行
  }

  return root
}

// 把大纲转成 markdown 文本
export function outlineToMarkdown(node: OutlineNode, depth = 0): string {
  const prefix = '#'.repeat(Math.min(depth + 1, 6))
  let md = `${prefix} ${node.title}\n\n`
  if (node.points.length) {
    md += node.points.map(p => `- ${p}`).join('\n') + '\n\n'
  }
  for (const child of node.children) {
    md += outlineToMarkdown(child, depth + 1)
  }
  return md
}

// 简单关键词提取（用于打标签）
export function extractKeywords(text: string, max = 5): string[] {
  // 简单的频率统计
  const stopWords = new Set(['的', '了', '是', '在', '和', '与', '或', '也', '就', '都', '而', '及', '以', '等', 'the', 'a', 'an', 'is', 'are', 'to', 'and', 'or'])
  const words = text
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()))

  // 中文：bigram 提取
  const cn = text.replace(/[^\u4e00-\u9fa5]/g, '')
  const bigrams: string[] = []
  for (let i = 0; i < cn.length - 1; i++) {
    bigrams.push(cn.slice(i, i + 2))
  }

  const freq: Record<string, number> = {}
  for (const w of [...words, ...bigrams]) {
    freq[w] = (freq[w] || 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w)
}
