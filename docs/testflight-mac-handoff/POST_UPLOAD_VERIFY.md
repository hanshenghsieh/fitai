# 上传 TestFlight 后验收

## 1. 等 Build Ready

App Store Connect → TestFlight → 新 Build → **Ready to Test**

iPhone → TestFlight App → 更新 BetterBit

确认 Build 号 ≥ **11**

---

## 2. Sandbox 准备

1. 设定 → **开发人员** → **Sandbox Apple 帐户** → 登入 ASC 建的测试员
2. BetterBit App 用**自己的 Email 帐号**登入（不是 Sandbox email）

---

## 3. 订阅测试

1. **设定 → 会员（BetterBit Pro）**
2. 应看到 **「订阅 BetterBit Pro」**（不是「订阅准备中」）
3. 点订阅
4. **应弹出 Apple 付款画面**（带 Sandbox 字样）
5. 完成或取消后，按钮不应永久「處理中」

失败时应有 toast 错误讯息（Build 11+ 已加 timeout / 错误提示）。

---

## 4. 还原购买

同页点 **还原购买** → 应提示已还原或找不到

---

## 5. 永久会员 / 排计划

老婆帐号（已有 manual_grant 永久会员）：

1. 完全关闭 App 重开
2. 会员页应显示 **BetterBit Pro 使用中**
3. 点 **帮我排本週** → 不应再弹「试用期已结束」

---

## 6. 换帐号

1. 设定 → 登出
2. 注册新帐号
3. 今日 / 进步页应为**空或新帐号资料**（不应看到旧帐号餐点）

---

## 7. RevenueCat 验证（可选）

RevenueCat → Customers → 搜 Supabase user id → 看是否有 purchase / entitlement
