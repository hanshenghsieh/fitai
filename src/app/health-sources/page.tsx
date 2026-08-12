import type { Metadata } from 'next'
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout'
import HealthSourceLink from '@/components/legal/HealthSourceLink'
import { createPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = createPageMetadata({
  title: '健康資訊與資料來源',
  description: 'Betterbit 使用的健康計算方式與資料來源說明。',
  path: '/health-sources',
})

export default function HealthSourcesPage() {
  return (
    <LegalPageLayout title="健康資訊與資料來源" updated="2026 年 7 月 29 日">
      <LegalSection title="重要聲明">
        <ul className="list-disc pl-5 space-y-2">
          <li>Betterbit 提供的是一般健康管理與教育用途的估算。</li>
          <li>不構成醫療診斷、治療或個人化醫療建議。</li>
          <li>AI 食物辨識、份量與營養估算可能有誤差。</li>
          <li>
            未滿 18 歲、孕期、哺乳期、體重過輕、慢性疾病、飲食失調或接受醫療治療者，應先諮詢醫師或合格營養專業人員。
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="基礎代謝率（BMR）計算方式">
        <p>
          Betterbit 預設使用 <strong>Mifflin-St Jeor 公式</strong>（依性別、體重、身高、年齡計算）估算基礎代謝率。若你有提供體脂率，會改用
          <strong>依除脂體重估算基礎代謝</strong>，這在已知體脂率時通常更準確。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <HealthSourceLink href="https://pubmed.ncbi.nlm.nih.gov/2305711/">
              Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-7.
            </HealthSourceLink>
          </li>
          <li>
            <HealthSourceLink href="https://pubmed.ncbi.nlm.nih.gov/1957828/">
              Cunningham JJ. Body composition as a determinant of energy expenditure: a synthetic review and a proposed general prediction equation. Am J Clin Nutr. 1991;54(6):963-9.
            </HealthSourceLink>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="每日總熱量消耗（TDEE）與活動量">
        <p>
          TDEE 由基礎代謝率乘上活動量係數估算（久坐 1.2、輕度活動 1.375、中度活動 1.55、高度活動 1.725、非常高度活動
          1.9）。這是業界常見的活動量估算慣例，用來反映日常活動與運動對熱量消耗的影響；同樣的「依活動量調整每日熱量需求」概念，也可參考衛生福利部國民健康署的說明。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <HealthSourceLink href="https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=542&pid=9730">
              衛生福利部國民健康署－個人一天所需熱量知多少？安全有效減重的第一步
            </HealthSourceLink>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="健康減重速度與熱量赤字">
        <p>
          Betterbit 提供保守、標準、積極三種減脂節奏，每週減重幅度約為體重的 0.25%–1%，每日熱量赤字約為 TDEE 的
          10%–25%，並設有每日熱量下限（避免熱量過低）。這個範圍與國內外衛生機關建議的「緩慢、可持續」減重速度一致。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <HealthSourceLink href="https://www.cdc.gov/healthy-weight-growth/losing-weight/index.html">
              CDC — Steps for Losing Weight（建議每週減重約 0.45–0.9 公斤，速度較慢者更容易維持成果）
            </HealthSourceLink>
          </li>
          <li>
            <HealthSourceLink href="https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=542&pid=9730">
              衛生福利部國民健康署－每日減少 300–500 大卡熱量，約可每週減重 0.5 公斤
            </HealthSourceLink>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="蛋白質攝取建議">
        <p>
          Betterbit 依除脂體重估算蛋白質目標（每公斤除脂體重約 1.8–2.4 公克，隨減脂節奏調整），用意是在熱量赤字期間協助保留肌肉量。這個範圍參考國際運動營養學會的立場聲明，該聲明指出處於熱量赤字、以保留除脂體重為目標的族群，可能需要較高的蛋白質攝取。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <HealthSourceLink href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5477153/">
              International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017.
            </HealthSourceLink>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="巨量營養素（脂肪／碳水）分配">
        <p>
          在算出每日熱量與蛋白質目標後，Betterbit 以脂肪佔每日熱量約 28%–30%、其餘為碳水化合物的方式分配剩餘熱量。這是
          <strong>Betterbit 內部用來安排三餐組合的一般飲食規劃估算方式</strong>，不是任何特定醫療機構針對個人狀況開立的處方或個人化醫療建議。實際需求可能依你的健康狀況、活動量與飲食偏好而有所不同；蛋白質與熱量赤字部分則如上方所列有對應的公開來源。
        </p>
      </LegalSection>

      <LegalSection title="食物營養資料來源">
        <p>
          Betterbit 的食物與品牌營養資料庫，優先採用政府公開資料與官方資料庫，並會在辨識結果顯示資料來源與信心等級。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <HealthSourceLink href="https://www.fda.gov.tw/tc/siteList.aspx?sid=284">
              衛生福利部食品藥物管理署－食品營養成分資料庫
            </HealthSourceLink>
          </li>
          <li>
            <HealthSourceLink href="https://fdc.nal.usda.gov/">
              USDA FoodData Central
            </HealthSourceLink>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="AI 估算的限制">
        <p>
          拍照辨識、份量估算與熱量計算皆由 AI 輔助完成，可能因光線、擺盤、份量判斷等因素產生誤差。建議定期以體重、體脂或其他身體量測校正，發現數值與實際情況落差較大時，可使用手動修正功能調整。
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
