'use client'

import { useState } from 'react'
import { LoaderCircle, ScanBarcode, X } from 'lucide-react'
import AppOverlay from '@/components/ui/AppOverlay'
import FoodTypePortionSheet from '@/components/dashboard/today/FoodTypePortionSheet'
import { BB_V2 } from '@/lib/betterbit-v2'
import { getNutritionDayKey } from '@/lib/timezone'
import { validateGtin } from '@/lib/barcode-food'
import {
  lookupBarcode,
  nativeBarcodeScannerAvailable,
  scanNativeBarcode,
  NativeBarcodeScanError,
} from '@/lib/barcode-client'
import type {
  CommonFoodItem,
  FoodRecordDraft,
} from '@/lib/nutrition/p0-common-foods/types'

interface Props {
  open: boolean
  targetDate: string
  onClose: () => void
  onCommit: (item: CommonFoodItem, draft: FoodRecordDraft) => void
}

const font = 'var(--font-noto-tc), system-ui, sans-serif'

export default function BarcodeLogSheet({ open, targetDate, onClose, onCommit }: Props) {
  const [barcode, setBarcode] = useState('')
  const [product, setProduct] = useState<CommonFoodItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [portionOpen, setPortionOpen] = useState(false)
  const nativeScanner = nativeBarcodeScannerAvailable()

  async function runLookup(rawValue: string) {
    const validation = validateGtin(rawValue)
    if (!validation.valid) {
      setProduct(null)
      setError('請輸入有效的 GTIN-8、UPC-A、EAN-13 或 GTIN-14 條碼。')
      return
    }
    setBarcode(validation.gtin)
    setProduct(null)
    setError(null)
    setLoading(true)
    const result = await lookupBarcode(validation.gtin)
    setLoading(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setProduct(result.item)
  }

  async function handleScan() {
    setError(null)
    setScanning(true)
    try {
      const result = await scanNativeBarcode()
      await runLookup(result)
    } catch (scanError) {
      if (
        scanError instanceof NativeBarcodeScanError &&
        scanError.code === 'CANCELLED'
      ) {
        return
      }
      setError(
        scanError instanceof Error
          ? scanError.message
          : '無法開啟掃描器，請改用手動輸入。'
      )
    } finally {
      setScanning(false)
    }
  }

  const basis =
    product?.barcodeMetadata?.nutritionBasis === 'per_100ml' ? '每 100ml' : '每 100g'
  const destination = targetDate === getNutritionDayKey() ? '今日' : '所選日期'

  return (
    <>
      <AppOverlay open={open && !portionOpen} onClose={onClose} variant="sheet">
        <div
          data-target-date={targetDate}
          className="ios-bottom-sheet max-w-lg mx-auto w-full"
          style={{
            fontFamily: font,
            backgroundColor: BB_V2.bg.card,
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.08)',
          }}
          onClick={event => event.stopPropagation()}
        >
          <div className="shrink-0 px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[20px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                掃描食品條碼
              </h2>
              <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
                從 Open Food Facts 查詢真實商品資料
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 -mr-1" aria-label="關閉">
              <X className="h-5 w-5" style={{ color: BB_V2.text.secondary }} />
            </button>
          </div>

          <div className="ios-bottom-sheet__scroll px-5 pb-4 space-y-4">
            <button
              type="button"
              disabled={!nativeScanner || scanning || loading}
              onClick={() => void handleScan()}
              className="w-full h-14 rounded-[22px] flex items-center justify-center gap-2 disabled:opacity-45"
              style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
            >
              {scanning ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <ScanBarcode className="h-5 w-5" />
              )}
              {nativeScanner ? (scanning ? '掃描中…' : '開啟相機掃描') : '此平台請手動輸入'}
            </button>

            <div>
              <label
                htmlFor="manual-barcode"
                className="text-[13px] mb-2 block"
                style={{ color: BB_V2.text.secondary, fontWeight: 500 }}
              >
                手動輸入條碼
              </label>
              <div className="flex gap-2">
                <input
                  id="manual-barcode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={barcode}
                  onChange={event => {
                    setBarcode(event.target.value.replace(/[^\d\s-]/g, ''))
                    setProduct(null)
                    setError(null)
                  }}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !loading) void runLookup(barcode)
                  }}
                  placeholder="輸入 8、12、13 或 14 位數"
                  className="min-w-0 flex-1 px-4 h-12 rounded-2xl outline-none text-base"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary }}
                />
                <button
                  type="button"
                  disabled={!barcode.trim() || loading}
                  onClick={() => void runLookup(barcode)}
                  className="px-4 h-12 rounded-2xl disabled:opacity-40"
                  style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.accent.orange, fontWeight: 600 }}
                >
                  查詢
                </button>
              </div>
            </div>

            {loading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-[14px]" style={{ color: BB_V2.text.secondary }}>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                查詢商品資料…
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="rounded-2xl px-4 py-3 text-[13px] leading-relaxed"
                style={{ backgroundColor: 'rgba(190, 75, 75, 0.08)', color: BB_V2.text.primary }}
              >
                {error}
              </div>
            ) : null}

            {product ? (
              <section
                className="rounded-2xl p-4 space-y-2"
                style={{ backgroundColor: BB_V2.bg.canvas, border: `1px solid ${BB_V2.divider}` }}
              >
                <div>
                  <p className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
                    {product.name}
                  </p>
                  {product.brand ? (
                    <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
                      {product.brand}
                    </p>
                  ) : null}
                </div>
                <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
                  {basis} · {product.kcalBase} kcal · 蛋白質 {product.proteinBase_g}g
                </p>
                <p className="text-[12px]" style={{ color: BB_V2.text.secondary }}>
                  資料庫估算 · 條碼 {product.barcodeMetadata?.gtin}
                </p>
                <button
                  type="button"
                  onClick={() => setPortionOpen(true)}
                  className="w-full h-12 rounded-[18px] mt-2"
                  style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
                >
                  選擇份量並加入{destination}紀錄
                </button>
              </section>
            ) : null}
          </div>
        </div>
      </AppOverlay>

      {product ? (
        <FoodTypePortionSheet
          open={open && portionOpen}
          item={product}
          title={`加入${destination}紀錄`}
          subtitle={`${product.name} · 資料庫估算`}
          saveLabel={`加入${destination}紀錄`}
          onClose={() => setPortionOpen(false)}
          onSave={draft => onCommit(product, draft)}
        />
      ) : null}
    </>
  )
}
