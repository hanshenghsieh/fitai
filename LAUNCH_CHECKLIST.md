# FitAI Launch Checklist

## Status: 95% Complete ✅

### ✅ Already Done
- [x] User authentication (Supabase)
- [x] Onboarding flow (goals, profile, questionnaire)
- [x] Weekly plan generation (TDEE, nutrition, workouts)
- [x] Menu rotation algorithm (self-cooked + convenience store)
- [x] Daily check-in system
- [x] Stripe subscription (complete payment flow)
- [x] Push notifications (FCM + Service Worker)
- [x] Database schema & RLS security
- [x] INBODY integration framework
- [x] Free upgrade logic (20+ days/month)

---

## 🎯 Critical Path to Launch (Next 1-2 weeks)

### 1. **MENU DATA** ⚠️ BLOCKING
**Status:** Waiting for real 7-11 / Family Mart products

**How to import your data:**

```bash
npm run import-menu
```

This will prompt you to paste menu data as JSON array. Example format:

```json
[
  {
    "id": "7-11-breakfast-1",
    "name": "雞胸肉蛋白早餐便當",
    "store": "7-11",
    "category": "breakfast",
    "calories": 350,
    "protein_g": 52,
    "carbs_g": 20,
    "fat_g": 8,
    "price": 89,
    "photo_url": "https://example.com/image.jpg",
    "description": "高蛋白早餐：烤雞胸肉+米飯+蔬菜"
  }
]
```

**Data requirements:**
- 20-30 items minimum (breakfast/lunch/dinner options from both stores)
- Real product photos (URLs or local paths)
- Real prices (TWD)
- Accurate calories & macros
- At least 50-72g protein per meal to match target

**Once you provide data:**
```bash
# Run this to update the menu
npm run import-menu
# Paste your data, press Enter twice
# Restart dev server
npm run dev
```

---

### 2. **STRIPE CONFIGURATION**
**Status:** Partially configured

**What's needed:**
1. Go to Stripe dashboard → Products
2. Create a product "FitAI Monthly"
3. Create a price: **500 TWD** / month
4. Copy the Price ID

**Update `.env.local`:**
```
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxxxx_your_actual_price_id
```

**Verify:** Try subscribing on the app (use Stripe test card: 4242 4242 4242 4242)

---

### 3. **INBODY API INTEGRATION** (Optional for MVP)
**Status:** Currently mock data

If you have INBODY API credentials:

```typescript
// In src/app/api/inbody-sync/route.ts, line 30:
// Replace:
// const inbodyData = await fetchFromInBodyAPI(inbodyUserId)
// With actual API call
```

If not, keep mock data for now — users can manually log body composition.

---

### 4. **DEPLOY TO PRODUCTION**

#### Option A: Vercel (Recommended - 5 min)
```bash
npm install -g vercel
vercel login
vercel
```

#### Option B: Your own server
```bash
npm run build
npm start
```

**Required environment variables:**
- Supabase URL & Key
- Firebase config (5 keys)
- Stripe Secret Key & Webhook Secret
- Firebase Admin SDK JSON

---

### 5. **POST-DEPLOY VERIFICATION**

**Test these flows:**
- [ ] User signup → onboarding → plan generation
- [ ] Daily check-in with meal selection (cook vs convenience store)
- [ ] Push notification prompt (check browser permissions)
- [ ] Subscribe button → Stripe payment
- [ ] INBODY sync (if integrated)

**Check these URLs:**
- [ ] `https://yourdomain.com/` → redirects to login
- [ ] `https://yourdomain.com/onboarding` → onboarding form
- [ ] `https://yourdomain.com/dashboard` → weekly plan view
- [ ] `https://yourdomain.com/settings` → subscription manager

---

### 6. **CRON JOBS FOR NOTIFICATIONS**

The app has scheduled notification endpoints. Set up a CRON trigger:

**Times to set:**
- 7:00 AM → `/api/cron/send-scheduled-notifications?type=breakfast`
- 12:00 PM → `/api/cron/send-scheduled-notifications?type=lunch`
- 6:30 PM → `/api/cron/send-scheduled-notifications?type=dinner`
- 7:00 PM → `/api/cron/send-scheduled-notifications?type=workout`
- 9:00 PM → `/api/cron/send-scheduled-notifications?type=reminder`

**Example with Vercel Cron:**
```
Add to `vercel.json`:
{
  "crons": [{
    "path": "/api/cron/send-scheduled-notifications",
    "schedule": "0 7 * * *"
  }]
}
```

---

## 📊 Estimates

| Task | Time | Impact |
|------|------|--------|
| Menu data collection | 2-3 hours | Critical 🔴 |
| Stripe setup | 15 min | High 🟡 |
| Vercel deploy | 5 min | Critical 🔴 |
| Testing | 30 min | High 🟡 |
| INBODY (optional) | 1-2 hours | Low 🟢 |

**Minimum to launch:** Menu data + Stripe config + Deploy = **4 hours**

---

## 🚀 After Launch

### Week 1-2: Monitor
- [ ] User signups
- [ ] Payment success rate
- [ ] Push notification delivery
- [ ] Plan generation errors (check `/api/logs`)

### Week 3-4: Optimize
- [ ] A/B test notification timing
- [ ] Analyze which meals are skipped (adjust menu)
- [ ] Get user feedback on difficulty
- [ ] Adjust TDEE calculations if needed

### Month 2: Scale
- [ ] INBODY API integration
- [ ] Social sharing (progress photos)
- [ ] Referral program
- [ ] Coach notes from AI (using Claude API)

---

## 💡 Quick Commands

```bash
# Import menu data
npm run import-menu

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel

# Check database
npx supabase status

# View logs
tail -f /tmp/dev.log
```

---

## ❓ FAQ

**Q: Can I launch with fake menu data?**
A: No — user complained about this. You need real photos & prices.

**Q: Do I need INBODY API?**
A: Not for MVP. Users can manually log measurements. Add API integration after launch.

**Q: What if Stripe payments fail?**
A: All failures are logged to `subscription_payments` table. Check status = 'failed'.

**Q: How do users get free month?**
A: Automatically when they complete 20+ days in a month. Check `/api/check-free-upgrade`.

---

## 📞 Support

If you get stuck:

1. Check `.env.local` has all required keys
2. Verify Supabase migrations ran: `npx supabase db list`
3. Check console logs: `npm run dev` and look for errors
4. Test endpoints: `curl http://localhost:3000/api/generate-plan`

Good luck! 🚀
