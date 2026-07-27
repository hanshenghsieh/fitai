const APP_STORE_URL = '#'

export default function FinalCTA() {
  return (
    <section className="bg-[#2D4A3E] py-24 lg:py-36">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div className="text-center lg:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            外食減脂，從 BetterBit 開始
          </h2>
          <p className="mt-5 text-lg text-white/70">現在就下載，讓 AI 幫你輕鬆達成目標！</p>

          <div className="mt-10 flex flex-col items-center gap-4 lg:items-start">
            <a
              href={APP_STORE_URL}
              className="rounded-full bg-[#76b69a] px-10 py-[1.15rem] text-base font-semibold text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.4)]"
            >
              App Store 下載
            </a>
            <p className="text-sm text-white/50">14 天免費試用．隨時可取消</p>
          </div>
        </div>

        <div className="mx-auto aspect-[16/10] w-full max-w-md rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
          <div className="flex h-full items-center justify-center p-6 text-center text-xs text-white/40">
            圖片佔位：美食情境照
          </div>
        </div>
      </div>
    </section>
  )
}
