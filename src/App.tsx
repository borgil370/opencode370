import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { Search, Sparkles } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { HomeInput } from './pages/HomeInput'
import { CategoryView } from './pages/CategoryView'
import { ItemView } from './pages/ItemView'
import { SearchView } from './pages/SearchView'
import { VibeCodingHome } from './pages/VibeCodingHome'
import { SpaceView } from './pages/SpaceView'
import { loadSystem } from './store'
import type { VibeSystem } from './types'

function App() {
  const [system, setSystem] = useState<VibeSystem>(() => loadSystem())
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const loc = useLocation()

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'vibecoding-system-v1' && e.newValue) {
        try {
          setSystem(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const el = document.getElementById('topbar-search') as HTMLInputElement | null
        el?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function submitSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  const spaceCount = Object.values(system.spaces).length
  const inVibeCoding = loc.pathname === '/vibe' || loc.pathname.startsWith('/v/')

  return (
    <div className="flex flex-col h-screen bg-ink-50">
      {/* 顶部栏：横跨整个页面 */}
      <header className="h-14 border-b bg-white flex items-center px-6 gap-6 flex-shrink-0">
        {/* 左：Logo */}
        <div className="flex items-center gap-2 min-w-[260px]">
          <svg viewBox="0 0 32 32" className="w-8 h-8 drop-shadow-sm" aria-label="Vibe Tree">
            <defs>
              <linearGradient id="vtLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="15" fill="url(#vtLogoGrad)" />
            <g fill="#ffffff">
              <polygon points="16,6 21.5,14 19,14 23,20 18.5,20 23,26 9,26 13.5,20 9,20 13,14 10.5,14" />
              <rect x="14.6" y="26" width="2.8" height="2.4" rx="0.4" />
            </g>
          </svg>
          <div className="leading-tight">
            <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Vibe Tree
            </div>
            <div className="text-[10px] text-ink-500">系统操作树</div>
          </div>
        </div>

        {/* 中：长搜索框 */}
        <form onSubmit={submitSearch} className="flex-1 relative max-w-3xl">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            id="topbar-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索标题、内容、标签…"
            className="w-full pl-9 pr-16 py-1.5 text-sm bg-ink-50 border border-transparent rounded-md outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-400 bg-white border border-ink-200 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </form>

        {/* 右：快捷入口 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/vibe')}
            className={`text-xs px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
              inVibeCoding
                ? 'bg-indigo-500 text-white'
                : 'border border-ink-200 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            <Sparkles size={12} />
            VibeCoding
            {spaceCount > 0 && (
              <span className={`text-[10px] ${inVibeCoding ? 'opacity-80' : 'text-ink-400'}`}>
                {spaceCount}
              </span>
            )}
          </button>
          <div className="text-xs text-ink-400 px-2">
            {Object.keys(system.items).length} 条
          </div>
        </div>
      </header>

      {/* 下方：侧边栏 + 主内容 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar system={system} onChange={setSystem} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomeInput system={system} onChange={setSystem} />} />
            <Route path="/c/:id" element={<CategoryView system={system} onChange={setSystem} />} />
            <Route path="/i/:id" element={<ItemView system={system} onChange={setSystem} />} />
            <Route path="/search" element={<SearchView system={system} />} />
            <Route path="/vibe" element={<VibeCodingHome system={system} onChange={setSystem} />} />
            <Route path="/v/:id" element={<SpaceView system={system} onChange={setSystem} />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default App
