import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { VibeSystem } from '../types'
import { searchItems } from '../store'
import { CATEGORY_MAP } from '../types'

interface Props {
  system: VibeSystem
}

export function SearchView({ system }: Props) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const initial = params.get('q') || ''
  const [query, setQuery] = useState(initial)
  const [results, setResults] = useState(searchItems(system, initial))

  useEffect(() => {
    setResults(searchItems(system, query))
  }, [query, system])

  useEffect(() => {
    const q = query.trim()
    if (q) setParams({ q }, { replace: true })
    else setParams({}, { replace: true })
  }, [query])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-bold mb-1">搜索结果</h1>
        <p className="text-sm text-ink-500 mb-6">
          {query ? `关键词：「${query}」` : '在所有目录中搜索标题、内容、标签'}
        </p>

        {!query.trim() ? (
          <div className="text-center text-ink-400 py-12 text-sm">
            使用顶部搜索框开始搜索
          </div>
        ) : results.length === 0 ? (
          <div className="text-center text-ink-400 py-12 text-sm">
            没有找到匹配项
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs text-ink-500 mb-2">{results.length} 条结果</div>
            {results.map(item => {
              const cat = CATEGORY_MAP[item.category]
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/i/${item.id}`)}
                  className="p-3 rounded-lg border border-ink-200 bg-white hover:border-indigo-300 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-ink-500 bg-ink-100 px-1.5 py-0.5 rounded">
                      {cat?.name}
                    </span>
                    <h3 className="font-medium text-ink-800 truncate flex-1">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-ink-500 line-clamp-2">
                    {item.content.replace(/```[\s\S]*?```/g, '[代码]').slice(0, 200)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
