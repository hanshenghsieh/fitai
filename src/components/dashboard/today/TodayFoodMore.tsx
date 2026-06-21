'use client'

import { useRef, useState, useEffect } from 'react'
import Image from 'next/image'
import { Search, Camera, X, ArrowLeft } from 'lucide-react'
import type { FrequentFood } from '@/lib/food-memory'
import { primaryFoodLabel } from '@/lib/food-photography'
import type { FoodSlot } from '@/lib/food-slots'

const DS = {
  text: '#2F241D',
  textSecondary: '#8E8378',
  surface: '#F9F8F6',
  sheet: '#FDFCFA',
  mocha: '#8B7355',
  photoBg: '#F0ECE7',
  cardShadow: '0 12px 40px rgba(0, 0, 0, 0.05)',
  thumbShadow: '0 4px 12px rgba(47, 36, 29, 0.1)',
  cameraShadow: '0 6px 20px rgba(47, 36, 29, 0.16)',
} as const

const ICON_STROKE = 1.8
const font = 'var(--font-noto-tc), system-ui, sans-serif'
const SHEET_MAX = 'min(58vh, 520px)'

type SheetMode = 'browse' | 'photo'

interface Props {
  open: boolean
  onClose: () => void
  activeSlot: FoodSlot
  query: string
  onQueryChange: (q: string) => void
  searchResults: Array<{ id: string; name: string; store?: string; calories: number; protein_g: number }>
  onPickSearch: (item: { id: string; name: string; store?: string; calories: number; protein_g: number }) => void
  frequentList: FrequentFood[]
  selectedFrequentId: string
  onSelectFrequent: (id: string) => void
  onCommitFrequent: (frequentId?: string) => void
  onPhotoCapture: (file: File) => void
}

function FrequentRow({ food, onClick, compact }: { food: FrequentFood; onClick: () => void; compact?: boolean }) {
  const label = primaryFoodLabel(food.name)
  const store = food.store ?? (food.name.includes('·') ? food.name.split('·')[0]?.trim() : undefined)
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left active:opacity-90"
      style={{
        fontFamily: font,
        padding: compact ? '12px 0' : '14px 0',
      }}
    >
      <p className="text-[16px] leading-snug line-clamp-2" style={{ color: DS.text, fontWeight: 500 }}>
        {label}
        {store && !label.includes(store) ? ` · ${store}` : ''}
      </p>
      <p className="text-[14px] mt-1" style={{ color: DS.textSecondary, fontWeight: 400 }}>
        {food.calories} kcal · 蛋白質 {food.protein_g}g
      </p>
    </button>
  )
}

function PhotoCaptureView({
  onBack,
  onCapture,
}: {
  onBack: () => void
  onCapture: (file: File) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const pickPhoto = () => fileRef.current?.click()

  const handleFile = (file: File) => {
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleJoin = () => {
    if (pendingFile) onCapture(pendingFile)
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13px] mb-4"
          style={{ color: DS.textSecondary, fontWeight: 500 }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={ICON_STROKE} />
          返回
        </button>
      </div>

      <div className="flex-1 px-5 flex flex-col min-h-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
            e.target.value = ''
          }}
        />

        <div
          className="relative w-full overflow-hidden flex items-center justify-center"
          style={{
            height: 240,
            borderRadius: 32,
            backgroundColor: DS.photoBg,
          }}
        >
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="100vw"
            />
          ) : (
            <button
              type="button"
              onClick={pickPhoto}
              className="flex flex-col items-center gap-3 active:opacity-85"
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  backgroundColor: DS.mocha,
                  boxShadow: DS.cameraShadow,
                }}
              >
                <Camera className="h-8 w-8 text-white" strokeWidth={ICON_STROKE} />
              </span>
              <span className="text-center">
                <span className="block text-[16px]" style={{ color: DS.text, fontWeight: 600 }}>
                  拍張照片
                </span>
                <span className="block text-[13px] mt-1" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                  我們會幫你處理
                </span>
              </span>
            </button>
          )}

          {previewUrl && (
            <button
              type="button"
              onClick={pickPhoto}
              className="absolute bottom-4 right-4 flex items-center justify-center rounded-full"
              style={{
                width: 48,
                height: 48,
                backgroundColor: DS.mocha,
                boxShadow: DS.cameraShadow,
              }}
              aria-label="重拍"
            >
              <Camera className="h-5 w-5 text-white" strokeWidth={ICON_STROKE} />
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 px-5 pt-6 pb-5">
        <button
          type="button"
          disabled={!pendingFile}
          onClick={handleJoin}
          className="w-full h-16 rounded-[24px] text-[18px] disabled:opacity-40 active:opacity-90"
          style={{ backgroundColor: DS.mocha, color: '#FFFFFF', fontWeight: 500 }}
        >
          加入今天
        </button>
      </div>
    </div>
  )
}

export default function TodayFoodMore({
  open,
  onClose,
  activeSlot: _activeSlot,
  query,
  onQueryChange,
  searchResults,
  onPickSearch,
  frequentList,
  selectedFrequentId,
  onSelectFrequent: _onSelectFrequent,
  onCommitFrequent,
  onPhotoCapture,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showAllFrequent, setShowAllFrequent] = useState(false)
  const [mode, setMode] = useState<SheetMode>('browse')

  useEffect(() => {
    if (!open) {
      setShowAllFrequent(false)
      setMode('browse')
      return
    }
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [open])

  if (!open) return null

  const topFrequent = frequentList.find(f => f.id === selectedFrequentId) ?? frequentList[0] ?? null
  const hasSearch = query.trim().length > 0
  const noSearchHits = hasSearch && searchResults.length === 0

  const openPhotoMode = () => setMode('photo')

  if (mode === 'photo') {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col justify-end"
        style={{
          backgroundColor: 'rgba(47, 36, 29, 0.22)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      >
        <div
          className="max-w-lg mx-auto w-full flex flex-col overflow-hidden"
          style={{
            fontFamily: font,
            backgroundColor: DS.sheet,
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
            maxHeight: SHEET_MAX,
          }}
          onClick={e => e.stopPropagation()}
        >
          <PhotoCaptureView
            onBack={() => setMode('browse')}
            onCapture={file => {
              onPhotoCapture(file)
              setMode('browse')
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{
        backgroundColor: 'rgba(47, 36, 29, 0.22)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="max-w-lg mx-auto w-full flex flex-col overflow-hidden"
        style={{
          fontFamily: font,
          backgroundColor: DS.sheet,
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
          maxHeight: SHEET_MAX,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              <h2 className="text-[20px] leading-tight" style={{ color: DS.text, fontWeight: 700 }}>
                更多紀錄
              </h2>
              <p className="text-[13px] leading-relaxed mt-1" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                記下每一次的選擇，累積改變的力量
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 -mr-1 shrink-0" aria-label="關閉">
              <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: DS.textSecondary }} />
            </button>
          </div>

          <div
            className="flex items-center gap-2.5 px-4 py-3 rounded-full"
            style={{ backgroundColor: '#FFFFFF', boxShadow: DS.cardShadow }}
          >
            <Search className="h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} style={{ color: DS.textSecondary }} />
            <input
              type="search"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              placeholder="想找什麼吃的？搜尋店名或菜名…"
              className="flex-1 bg-transparent text-[14px] outline-none min-w-0"
              style={{ color: DS.text, fontWeight: 400 }}
            />
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {hasSearch && searchResults.length > 0 && (
            <div className="mb-6 space-y-5">
              {searchResults.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPickSearch(item)}
                  className="w-full text-left py-1 active:opacity-90"
                >
                  <p className="text-[16px] font-medium" style={{ color: DS.text, fontWeight: 500 }}>
                    {item.name}
                  </p>
                  <p className="text-[14px] mt-1" style={{ color: DS.textSecondary }}>
                    {item.store ? `${item.store} · ` : ''}{item.calories} kcal · 蛋白質 {item.protein_g}g
                  </p>
                </button>
              ))}
            </div>
          )}

          {noSearchHits && (
            <div
              className="mb-5 py-8 px-4 text-center"
              style={{
                borderTop: '1px solid rgba(142, 131, 120, 0.12)',
                borderBottom: '1px solid rgba(142, 131, 120, 0.12)',
              }}
            >
              <p className="text-[15px] leading-relaxed" style={{ color: DS.text, fontWeight: 500 }}>
                沒找到想吃的？
              </p>
              <p className="text-[13px] mt-2 leading-relaxed" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                拍張照片，剩下交給 BetterBit。
              </p>
              <button
                type="button"
                onClick={openPhotoMode}
                className="mt-5 inline-flex items-center justify-center gap-2 h-12 px-8 rounded-full text-[14px]"
                style={{ backgroundColor: DS.mocha, color: '#FFFFFF', fontWeight: 500 }}
              >
                <Camera className="h-4 w-4" strokeWidth={ICON_STROKE} />
                拍照
              </button>
            </div>
          )}

          {frequentList.length > 0 && (
            <section className="mb-6">
              <p className="text-[13px] mb-3 px-0.5" style={{ color: DS.textSecondary, fontWeight: 500 }}>
                常吃
              </p>

              {!showAllFrequent && topFrequent && (
                <FrequentRow food={topFrequent} onClick={() => onCommitFrequent(topFrequent.id)} />
              )}

              {showAllFrequent && (
                <ul className="space-y-1 max-h-[168px] overflow-y-auto overscroll-contain">
                  {frequentList.map(f => (
                    <li key={f.id}>
                      <FrequentRow
                        compact
                        food={f}
                        onClick={() => {
                          onCommitFrequent(f.id)
                          setShowAllFrequent(false)
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}

              <button
                type="button"
                onClick={() => setShowAllFrequent(v => !v)}
                className="w-full text-center text-[12px] mt-2 py-0.5"
                style={{ color: DS.textSecondary, fontWeight: 400 }}
              >
                {showAllFrequent ? '收起常吃紀錄' : '查看我的常吃紀錄 >'}
              </button>
            </section>
          )}

          <section className="mb-3">
            <button
              type="button"
              onClick={openPhotoMode}
              className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-[24px] active:opacity-90"
              style={{ backgroundColor: DS.photoBg, boxShadow: DS.cardShadow }}
            >
              <span
                className="flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: DS.mocha,
                  boxShadow: DS.cameraShadow,
                }}
              >
                <Camera className="h-5 w-5 text-white" strokeWidth={ICON_STROKE} />
              </span>
              <span>
                <span className="block text-[14px]" style={{ color: DS.text, fontWeight: 600 }}>
                  拍張照片
                </span>
                <span className="block text-[12px] mt-0.5" style={{ color: DS.textSecondary, fontWeight: 400 }}>
                  我們會幫你處理
                </span>
              </span>
            </button>
          </section>
        </div>

        <p
          className="shrink-0 text-center text-[11px] py-3 px-5 border-t"
          style={{ color: DS.textSecondary, fontWeight: 400, borderColor: 'rgba(142, 131, 120, 0.12)' }}
        >
          每一餐，都是照顧自己的練習
        </p>
      </div>
    </div>
  )
}
