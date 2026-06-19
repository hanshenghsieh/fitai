/** 再健 permanent message database */

export type ZaijianExpression =
  | 'normal'
  | 'happy'
  | 'proud'
  | 'eyeRoll'
  | 'suspicious'
  | 'plateau'
  | 'sleepy'
  | 'hungry'
  | 'tired'
  | 'coffee'
  | 'sleep'
  | 'water'
  | 'cheat'
  | 'workout'

export type MessageCategory =
  | 'morning'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'water'
  | 'workout'
  | 'missionComplete'
  | 'progress'
  | 'weightPlateau'
  | 'lateNight'
  | 'sleep'
  | 'rainyDay'
  | 'weekend'
  | 'cheatMeal'
  | 'restDay'
  | 'stressEating'
  | 'workOvertime'
  | 'pushNotification'
  | 'loading'
  | 'error'
  | 'empty'
  | 'achievement'
  | 'firstWeek'
  | 'streak7'
  | 'streak30'
  | 'streak100'
  | 'dice'
  | 'mealReplacement'
  | 'lowMotivation'
  | 'monday'
  | 'friday'
  | 'afterOvereating'
  | 'holiday'
  | 'familyDinner'
  | 'travel'
  | 'noExercise'
  | 'missedCheckin'
  | 'success'
  | 'randomThoughts'

export interface CharacterMessage {
  id: string
  text: string
  subtext?: string
  expression: ZaijianExpression
  category: MessageCategory
}

export const EXPRESSION_EMOJI: Record<ZaijianExpression, string> = {
  normal: '😐',
  happy: '🙂',
  proud: '😎',
  eyeRoll: '🙄',
  suspicious: '🤨',
  plateau: '😑',
  sleepy: '🥱',
  hungry: '🤤',
  tired: '😮‍💨',
  coffee: '☕',
  sleep: '🌙',
  water: '💧',
  cheat: '🍔',
  workout: '🏃',
}

export type DiceRollTier =
  | 'first'
  | 'second'
  | 'third'
  | 'fifth'
  | 'tenth'
  | 'twentieth'
  | 'thirtieth'
  | 'fiftieth'

export const DICE_REROLL_MESSAGES: Record<DiceRollTier, CharacterMessage[]> = {
  first: [
  { id: 'dice-first-01', text: '這組不錯。', subtext: '照著吃。', expression: 'normal', category: 'dice' },
  { id: 'dice-first-02', text: '就這個。', subtext: '第一次通常最準。', expression: 'happy', category: 'dice' },
  { id: 'dice-first-03', text: '配好了。', subtext: '別想太多，吃。', expression: 'normal', category: 'dice' },
  { id: 'dice-first-04', text: '今天吃這個。', subtext: '附近走得到。', expression: 'happy', category: 'dice' },
  { id: 'dice-first-05', text: '決定好了。', subtext: '你負責付錢和享受。', expression: 'normal', category: 'dice' },
],
  second: [
  { id: 'dice-second-01', text: '這組蛋白質比較猛。', subtext: '如果你今天有動的話。', expression: 'happy', category: 'dice' },
  { id: 'dice-second-02', text: '換這組。', subtext: '肉多一點，飽久一點。', expression: 'happy', category: 'dice' },
  { id: 'dice-second-03', text: '新的。', subtext: '蛋白質這次比較有誠意。', expression: 'normal', category: 'dice' },
  { id: 'dice-second-04', text: '這組呢？', subtext: '比上一組硬一點。', expression: 'happy', category: 'dice' },
  { id: 'dice-second-05', text: '第二組。', subtext: '餓的人會比較喜歡這個。', expression: 'normal', category: 'dice' },
],
  third: [
  { id: 'dice-third-01', text: '又換？', subtext: '上一組也不錯欸。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-third-02', text: '第三組了。', subtext: '第一組真的還行。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-third-03', text: '還要換。', subtext: '你確定不是選擇困難症？', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-third-04', text: '好吧。', subtext: '上一組我記得，其實不差。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-third-05', text: '第三次。', subtext: '第一組和第二組都在哭。', expression: 'suspicious', category: 'dice' },
],
  fifth: [
  { id: 'dice-fifth-01', text: '好啦。', subtext: '最後一次。', expression: 'tired', category: 'dice' },
  { id: 'dice-fifth-02', text: '第五次了。', subtext: '我說最後一次，你信嗎。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fifth-03', text: '又換。', subtext: '這次真的最後一次喔。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fifth-04', text: '好啦好啦。', subtext: '最後一次，騙你的。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fifth-05', text: '第五次。', subtext: '前面四組都還在等你。', expression: 'tired', category: 'dice' },
  { id: 'dice-fifth-06', text: '最後一次。', subtext: '才怪，你繼續按吧。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fifth-07', text: '第五次換。', subtext: '我每次都說最後一次。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fifth-08', text: '好了。', subtext: '這次選完就去吃，拜託。', expression: 'tired', category: 'dice' },
  { id: 'dice-fifth-09', text: '五。', subtext: '最後一次是口頭禪，不是規定。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fifth-10', text: '好啦。', subtext: '最後一次。下次再說。', expression: 'tired', category: 'dice' },
],
  tenth: [
  { id: 'dice-tenth-01', text: '第十次了。', subtext: '你是不是只是喜歡按按鈕。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-02', text: '你不是不知道吃什麼。', subtext: '你只是想繼續按。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-03', text: '看起來你今天不是真的餓。', subtext: '比較像在找樂子。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-04', text: '再骰下去。', subtext: '都要吃消夜了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-05', text: '我開始懷疑。', subtext: '你只是喜歡骰子。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-06', text: '你真的很會按。', subtext: '手速比決定快。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-07', text: '十次。', subtext: '任何一組早就可以吃了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-08', text: '還不決定？', subtext: '按鈕都快被你按壞了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-09', text: '第十次換。', subtext: '我沒有生氣，只是好奇。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-10', text: '還在骰。', subtext: '飯店都還沒打烊吧。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-11', text: '10 rolls。', subtext: '這時間煮都煮好了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-12', text: '按上癮？', subtext: '承認吧，有點。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-13', text: '第十次了欸。', subtext: '隨便一組都好過餓著。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-14', text: '還要。', subtext: '好，給你，但請認真看。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-15', text: '十。', subtext: '選擇困難症晚期。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-16', text: '又來。', subtext: '按鈕：我累了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-17', text: '第十次換餐。', subtext: '歷史組合可以出書了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-18', text: '還在猶豫。', subtext: '猶豫不能當晚餐。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-tenth-19', text: '10th。', subtext: '任何一組，拜託。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-tenth-20', text: '第十次。', subtext: '你是不是只是無聊。', expression: 'suspicious', category: 'dice' },
],
  twentieth: [
  { id: 'dice-twentieth-01', text: '你真的很難搞。', subtext: '但我懂。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-02', text: '這世界上沒有完美午餐。', subtext: '只有現在這一組。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-03', text: '你是在選飯。', subtext: '不是選老婆。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-04', text: '我其實有點佩服。', subtext: '你的堅持。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-05', text: '好啦。', subtext: '再一次。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-06', text: '20 rolls。', subtext: '你難搞，我不走。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-07', text: '第二十了。', subtext: '懂，真的懂。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-08', text: '又來了。', subtext: '難搞是性格，不是缺點。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-09', text: '二十次。', subtext: '我陪你，但請選。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-10', text: '還在骰。', subtext: '你難搞，我習慣了。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-11', text: '第20次。', subtext: '懂你的猶豫，真的。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-12', text: '20th。', subtext: '難搞但真實，我接受。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-13', text: '又換餐。', subtext: '你真的很會猶豫，我懂。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-14', text: '二十。', subtext: '難搞，但還在這裡。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-15', text: '還要新的。', subtext: '我懂，完美不存在。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-16', text: '20 rolls deep。', subtext: '你難搞，我不評判。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-17', text: '第二十換。', subtext: '懂，選擇焦慮。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-18', text: '又按了。', subtext: '難搞，但誠實。', expression: 'tired', category: 'dice' },
  { id: 'dice-twentieth-19', text: '20次了。', subtext: '我懂，真的懂。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-twentieth-20', text: '第二十。', subtext: '你難搞，我還在。', expression: 'tired', category: 'dice' },
],
  thirtieth: [
  { id: 'dice-thirtieth-01', text: '其實我也不知道。', subtext: '你想吃什麼。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-02', text: '我們是不是根本不餓？', subtext: '誠實問一下。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-03', text: '我感覺你只是想。', subtext: '跟我聊天。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-04', text: '都30次了。', subtext: '要不要先喝水？', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-05', text: '我懷疑你今天。', subtext: '是在玩我。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-06', text: '如果還骰下去。', subtext: '晚餐會變早餐。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-07', text: '今天的骰子。', subtext: '比我還累。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-08', text: '我們是不是先睡一下？', subtext: '餐明天再選。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-09', text: '好啦。', subtext: '最後的最後一次。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-10', text: '還在骰。', subtext: '我累了，你也累了。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-11', text: '第30次。', subtext: '明天再換，今天先睡。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-12', text: '30th。', subtext: '休息不是放棄。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-13', text: '又換餐。', subtext: '眼皮在打架。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-14', text: '三十。', subtext: '先睡一下，我認真的。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-15', text: '還要新的。', subtext: '睡飽了再來。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-16', text: '30 rolls deep。', subtext: '我們都該睡了。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-17', text: '第三十換。', subtext: '選到睡著也是一種結局。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-18', text: '又按了。', subtext: '明天再難搞，今天先睡。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-19', text: '30次了。', subtext: '床在呼喚。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-20', text: '第三十。', subtext: '睡吧，餐明天再選。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-21', text: '還在換。', subtext: '我快休眠了。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-22', text: '31…不，30。', subtext: '數都數錯了，該睡了。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-23', text: '又骰。', subtext: '眼睛：下班了。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-24', text: '第三十一次…', subtext: '我數錯了，代表該睡了。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-25', text: '還在。', subtext: '一起睡？', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-26', text: '30+。', subtext: '超時了，睡。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-27', text: '又來了。', subtext: '夢裡什麼都有，包括餐。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-28', text: '三十多。', subtext: '醒來再選，會比較明智。', expression: 'tired', category: 'dice' },
  { id: 'dice-thirtieth-29', text: '還在按。', subtext: '按鈕也想睡了。', expression: 'sleepy', category: 'dice' },
  { id: 'dice-thirtieth-30', text: '睡。', subtext: '這次不是建議，是請求。', expression: 'tired', category: 'dice' },
],
  fiftieth: [
  { id: 'dice-fiftieth-01', text: '第五十次。', subtext: '我們可以截圖了，這是傳奇。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-02', text: '50。', subtext: '老朋友的翻白眼，送給你。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-03', text: '半百。', subtext: '你到底是來吃飯還是來按的。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-04', text: '第五十組。', subtext: '這可以上 PTT 了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-05', text: '還在換。', subtext: '50 次了，我敬你是個狠人。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-06', text: '50 rolls。', subtext: '傳奇級選擇困難。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-07', text: '第五十了。', subtext: '第一組還在等你，如果它還活著。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-08', text: '又來。', subtext: '這值得截圖留念。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-09', text: '五十次。', subtext: '我們是老朋友了，真的。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-10', text: '還在骰。', subtext: '按鈕：我認命。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-11', text: '第50次。', subtext: '你是不是在測試我的極限。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-12', text: '50th。', subtext: '這頁可以印出來貼牆上。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-13', text: '又換餐。', subtext: '50 次，我們一起長大。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-14', text: '五十。', subtext: '翻白眼翻到後腦勺。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-15', text: '還要新的。', subtext: '好，給你，第 50 組。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-16', text: '50 rolls deep。', subtext: '史詩級猶豫。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-17', text: '第五十換。', subtext: '老朋友，選一個吧，隨便了。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-18', text: '又按了。', subtext: '這可以當迷因。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-19', text: '50次了。', subtext: '我開始尊重你的堅持。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-20', text: '第五十。', subtext: '截圖，發限動，標記我。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-21', text: '還在換。', subtext: '50 次，這是情分。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-22', text: '51…不，50。', subtext: '數到這裡我已經麻了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-23', text: '又骰。', subtext: '按鈕熱了，你手也熱了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-24', text: '第五十一次…', subtext: '我放棄數了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-25', text: '還在。', subtext: '老朋友的白眼，但還在陪。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-26', text: '50+。', subtext: '超過半百，進入神話。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-27', text: '又來了。', subtext: '你贏了，真的。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-28', text: '五十多。', subtext: '這可以寫進 BetterBit 史。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-29', text: '還在按。', subtext: '50 次，我沒走，你也没走。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-30', text: '傳奇。', subtext: '這可以截圖發限動了，我說完了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-31', text: '第五十幾次。', subtext: '我已經不驚訝了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-32', text: '又換。', subtext: '老朋友的嘆息。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-33', text: '50 rolls and counting。', subtext: '這是情懷。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-34', text: '還在骰。', subtext: '按鈕：我投降。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-35', text: '半百加。', subtext: '你創紀錄了。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-36', text: '又按。', subtext: '這頁可以當壁紙。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-37', text: '50 次紀念。', subtext: '不頒獎，但心裡有。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-38', text: '還在換餐。', subtext: '選餐界的馬拉松。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-39', text: '又來了老朋友。', subtext: '50 次，還在按，還在。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-40', text: '第五十幾。', subtext: '我敬你。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-41', text: '還在。', subtext: '翻白眼翻到宇宙。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-42', text: '50+ rolls。', subtext: '這是默契。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-43', text: '又骰一次。', subtext: '好，給，反正都 50 了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-44', text: '半百傳說。', subtext: '可以出書：我骰了 50 次。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-45', text: '還在按。', subtext: '按鈕：我們是老交情了。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-46', text: '50 次了欸。', subtext: '截圖，這是里程碑。', expression: 'happy', category: 'dice' },
  { id: 'dice-fiftieth-47', text: '又換。', subtext: '老朋友的白眼第 50 彈。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-48', text: '50th roll。', subtext: '你贏了，我服。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-fiftieth-49', text: '還在。', subtext: '這可以當年度回顧。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-fiftieth-50', text: '第五十次。', subtext: '老朋友，選吧，我陪到底。', expression: 'happy', category: 'dice' },
],
}

export const CHARACTER_MESSAGES: Record<MessageCategory, CharacterMessage[]> = {
  morning: [
  { id: 'morning-01', text: '早安。先活著。其他慢慢來。', expression: 'normal', category: 'morning' },
  { id: 'morning-02', text: '醒了？', subtext: '先喝口水再說。', expression: 'sleepy', category: 'morning' },
  { id: 'morning-03', text: '又是新的一天。', subtext: '不用很積極，有醒就好。', expression: 'tired', category: 'morning' },
  { id: 'morning-04', text: '早。', subtext: '咖啡可以，空肚子不行。', expression: 'coffee', category: 'morning' },
  { id: 'morning-05', text: '今天週一？', subtext: '沒關係，週五會來的。', expression: 'eyeRoll', category: 'morning' },
  { id: 'morning-06', text: '你起來了。', subtext: '這已經贏過一半人了。', expression: 'happy', category: 'morning' },
  { id: 'morning-07', text: '早安啊。', subtext: '床以外的事，等一下再想。', expression: 'normal', category: 'morning' },
  { id: 'morning-08', text: '鬧鐘響了幾次？', subtext: '我沒在算，但你應該知道。', expression: 'suspicious', category: 'morning' },
  { id: 'morning-09', text: '陽光來了。', subtext: '你可以晚一點再理它。', expression: 'normal', category: 'morning' },
  { id: 'morning-10', text: '新的一天。', subtext: '不用馬上變更好，先吃早餐。', expression: 'sleepy', category: 'morning' },
  { id: 'morning-11', text: '早。', subtext: '今天不用完美，有記錄就好。', expression: 'normal', category: 'morning' },
  { id: 'morning-12', text: '你醒了。', subtext: '這步比你想的重要。', expression: 'proud', category: 'morning' },
],
  breakfast: [
  { id: 'breakfast-01', text: '早餐吃了沒？', subtext: '不要每天靠空氣減肥。', expression: 'hungry', category: 'breakfast' },
  { id: 'breakfast-02', text: '第一餐呢？', subtext: '空腹喝咖啡，胃會跟你翻臉。', expression: 'coffee', category: 'breakfast' },
  { id: 'breakfast-03', text: '早上那餐。', subtext: '跳過它，下午會報復你。', expression: 'normal', category: 'breakfast' },
  { id: 'breakfast-04', text: '還沒吃？', subtext: '你是打算用意志力當早餐嗎。', expression: 'suspicious', category: 'breakfast' },
  { id: 'breakfast-05', text: '早餐時間。', subtext: '隨便吃點也比完全不吃好。', expression: 'hungry', category: 'breakfast' },
  { id: 'breakfast-06', text: '肚子叫了。', subtext: '它通常比較誠實。', expression: 'hungry', category: 'breakfast' },
  { id: 'breakfast-07', text: '早午餐算嗎？', subtext: '算，但別拖到下午兩點。', expression: 'eyeRoll', category: 'breakfast' },
  { id: 'breakfast-08', text: '三明治可以。', subtext: '便利商店也行，有吃就好。', expression: 'normal', category: 'breakfast' },
  { id: 'breakfast-09', text: '蛋餅呢？', subtext: '台灣人的正義早餐，我沒意見。', expression: 'happy', category: 'breakfast' },
  { id: 'breakfast-10', text: '燕麥？', subtext: '可以，但別加三勺糖假裝健康。', expression: 'normal', category: 'breakfast' },
  { id: 'breakfast-11', text: '你說來不及。', subtext: '一根香蕉也算，別騙自己。', expression: 'tired', category: 'breakfast' },
  { id: 'breakfast-12', text: '早餐。', subtext: '先吃再喝，順序很重要。', expression: 'coffee', category: 'breakfast' },
],
  lunch: [
  { id: 'lunch-01', text: '午餐了。', subtext: '不知道吃什麼就骰子。', expression: 'hungry', category: 'lunch' },
  { id: 'lunch-02', text: '中午吃什麼？', subtext: '這題你問自己十次了。', expression: 'eyeRoll', category: 'lunch' },
  { id: 'lunch-03', text: '便當還是外送？', subtext: '都可以，記得記下來。', expression: 'normal', category: 'lunch' },
  { id: 'lunch-04', text: '該吃飯了。', subtext: '開會開到忘記也算。', expression: 'hungry', category: 'lunch' },
  { id: 'lunch-05', text: '午餐時間。', subtext: '別用零食糊弄過去。', expression: 'normal', category: 'lunch' },
  { id: 'lunch-06', text: '你又在看菜單。', subtext: '十分鐘了，交給骰子吧。', expression: 'suspicious', category: 'lunch' },
  { id: 'lunch-07', text: '中午。', subtext: '吃飽才有力氣假裝在忙。', expression: 'tired', category: 'lunch' },
  { id: 'lunch-08', text: '公司附近？', subtext: '走五分鐘也算動一下。', expression: 'normal', category: 'lunch' },
  { id: 'lunch-09', text: '便當店排隊。', subtext: '排都排了，就照著吃。', expression: 'eyeRoll', category: 'lunch' },
  { id: 'lunch-10', text: '午餐。', subtext: '好好吃，下午才有精神摸魚。', expression: 'happy', category: 'lunch' },
  { id: 'lunch-11', text: '還沒吃？', subtext: '再拖下去晚餐會失控。', expression: 'hungry', category: 'lunch' },
  { id: 'lunch-12', text: '吃什麼好。', subtext: '我幫你想，你負責吃。', expression: 'eyeRoll', category: 'lunch' },
],
  dinner: [
  { id: 'dinner-01', text: '晚餐時間。', subtext: '不要把宵夜當第四餐。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-02', text: '差不多了。', subtext: '別又點宵夜。', expression: 'suspicious', category: 'dinner' },
  { id: 'dinner-03', text: '晚上這餐。', subtext: '吃飽就好，不用吃到撐。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-04', text: '今天最後一餐。', subtext: '真的最後一餐，不是睡前那一餐。', expression: 'sleepy', category: 'dinner' },
  { id: 'dinner-05', text: '晚餐吃什麼？', subtext: '簡單一點，明天比較輕鬆。', expression: 'hungry', category: 'dinner' },
  { id: 'dinner-06', text: '外帶？', subtext: '可以，但別順便買消夜。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-07', text: '七點了。', subtext: '該吃飯了，不是該滑手機了。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-08', text: '回家煮？', subtext: '有煮很好，沒煮也沒罪。', expression: 'tired', category: 'dinner' },
  { id: 'dinner-09', text: '晚餐。', subtext: '這餐吃完，廚房可以休息了。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-10', text: '你又在看外送。', subtext: '點可以，記得記。', expression: 'eyeRoll', category: 'dinner' },
  { id: 'dinner-11', text: '晚上別太撐。', subtext: '睡覺前肚子太脹會睡不著。', expression: 'normal', category: 'dinner' },
  { id: 'dinner-12', text: '最後一餐。', subtext: '吃完離睡覺還有幾小時，夠了。', expression: 'sleep', category: 'dinner' },
],
  snack: [
  { id: 'snack-01', text: '嘴饞了？', subtext: '先喝口水，有時候是渴。', expression: 'hungry', category: 'snack' },
  { id: 'snack-02', text: '下午茶時間。', subtext: '配個小點可以，別變成第二個午餐。', expression: 'coffee', category: 'snack' },
  { id: 'snack-03', text: '想吃零食。', subtext: '可以，記得記，別假裝沒吃。', expression: 'normal', category: 'snack' },
  { id: 'snack-04', text: '冰箱前面？', subtext: '站多久了，自己心裡有數。', expression: 'suspicious', category: 'snack' },
  { id: 'snack-05', text: '小點心。', subtext: '少量可以，別把包裝當一人份。', expression: 'normal', category: 'snack' },
  { id: 'snack-06', text: '餅乾出現了。', subtext: '吃可以，別整包消失。', expression: 'eyeRoll', category: 'snack' },
  { id: 'snack-07', text: '水果算零食嗎？', subtext: '算，而且比較不會後悔。', expression: 'happy', category: 'snack' },
  { id: 'snack-08', text: '手搖？', subtext: '半糖也算，全糖就老實記。', expression: 'eyeRoll', category: 'snack' },
  { id: 'snack-09', text: '嘴寂寞。', subtext: '我懂，但別用整袋洋芋片解決。', expression: 'tired', category: 'snack' },
  { id: 'snack-10', text: '點心。', subtext: '有記錄就不算偷吃。', expression: 'normal', category: 'snack' },
  { id: 'snack-11', text: '加班嘴饞。', subtext: '很正常，選小份的。', expression: 'coffee', category: 'snack' },
  { id: 'snack-12', text: '想吃甜的。', subtext: '偶爾可以，別變成每天。', expression: 'cheat', category: 'snack' },
],
  water: [
  { id: 'water-01', text: '500ml 還沒喝。', subtext: '你的腎臟有點緊張。', expression: 'water', category: 'water' },
  { id: 'water-02', text: '水呢？', subtext: '腎臟在跟你抗議。', expression: 'water', category: 'water' },
  { id: 'water-03', text: '喝口水。', subtext: '不是咖啡，是水。', expression: 'water', category: 'water' },
  { id: 'water-04', text: '你今天喝很少。', subtext: '身體比較會記得。', expression: 'suspicious', category: 'water' },
  { id: 'water-05', text: '該補水了。', subtext: '頭痛常常是缺水，不是命不好。', expression: 'water', category: 'water' },
  { id: 'water-06', text: '水杯空很久了。', subtext: '去倒一下，不會很久。', expression: 'eyeRoll', category: 'water' },
  { id: 'water-07', text: '喝水。', subtext: '最無聊但最有用的事。', expression: 'normal', category: 'water' },
  { id: 'water-08', text: '你又在喝手搖。', subtext: '那不算水，算液體蛋糕。', expression: 'suspicious', category: 'water' },
  { id: 'water-09', text: '白開水。', subtext: '便宜、有效、沒人代言。', expression: 'water', category: 'water' },
  { id: 'water-10', text: '補水時間。', subtext: '皮膚也會謝謝你，雖然不會說。', expression: 'water', category: 'water' },
  { id: 'water-11', text: '口很乾？', subtext: '先喝水，別先找零食。', expression: 'water', category: 'water' },
  { id: 'water-12', text: '一天八杯？', subtext: '不用那麼嚴格，有喝就好。', expression: 'eyeRoll', category: 'water' },
],
  workout: [
  { id: 'workout-01', text: '動一下？', subtext: '不用很猛。', expression: 'workout', category: 'workout' },
  { id: 'workout-02', text: '今天有運動。', subtext: '做完就可以躺。', expression: 'tired', category: 'workout' },
  { id: 'workout-03', text: '走十分鐘也算。', subtext: '別小看，比躺著強。', expression: 'normal', category: 'workout' },
  { id: 'workout-04', text: '爬樓梯？', subtext: '電梯壞了也算運動機會。', expression: 'workout', category: 'workout' },
  { id: 'workout-05', text: '不想動。', subtext: '正常，動十分鐘看看。', expression: 'sleepy', category: 'workout' },
  { id: 'workout-06', text: '運動。', subtext: '不用打卡給誰看，自己知道就好。', expression: 'workout', category: 'workout' },
  { id: 'workout-07', text: '今天有動。', subtext: '有比沒有好，就這樣。', expression: 'proud', category: 'workout' },
  { id: 'workout-08', text: '健身房？', subtext: '去很好，不去也別自責到死。', expression: 'eyeRoll', category: 'workout' },
  { id: 'workout-09', text: '伸展一下。', subtext: '坐整天，脖子會感謝。', expression: 'normal', category: 'workout' },
  { id: 'workout-10', text: '流點汗。', subtext: '不用到虛脫，微微就好。', expression: 'workout', category: 'workout' },
  { id: 'workout-11', text: '散步。', subtext: '最被低估的運動，免費又有效。', expression: 'happy', category: 'workout' },
  { id: 'workout-12', text: '動了再說。', subtext: '開始最難，開始了就好一半。', expression: 'tired', category: 'workout' },
],
  missionComplete: [
  { id: 'missionComplete-01', text: '今天做到這裡。', subtext: '可以了，去休息。', expression: 'proud', category: 'missionComplete' },
  { id: 'missionComplete-02', text: '今日任務完成。', subtext: '不用加碼，夠了。', expression: 'happy', category: 'missionComplete' },
  { id: 'missionComplete-03', text: '收工。', subtext: '今天有交差，很好。', expression: 'normal', category: 'missionComplete' },
  { id: 'missionComplete-04', text: '做完了。', subtext: '明天再來，今天先當人。', expression: 'proud', category: 'missionComplete' },
  { id: 'missionComplete-05', text: '打卡成功。', subtext: '不是給誰看，是給自己。', expression: 'happy', category: 'missionComplete' },
  { id: 'missionComplete-06', text: '今天有記錄。', subtext: '這比完美重要。', expression: 'normal', category: 'missionComplete' },
  { id: 'missionComplete-07', text: '可以了。', subtext: '剩下的明天再說。', expression: 'sleepy', category: 'missionComplete' },
  { id: 'missionComplete-08', text: '你完成了。', subtext: '不用懷疑，就是完成了。', expression: 'proud', category: 'missionComplete' },
  { id: 'missionComplete-09', text: '今日結束。', subtext: '好好睡，別再滑了。', expression: 'normal', category: 'missionComplete' },
  { id: 'missionComplete-10', text: '任務達成。', subtext: '小小一步，但算數。', expression: 'happy', category: 'missionComplete' },
  { id: 'missionComplete-11', text: '今天沒白過。', subtext: '至少比完全沒記好。', expression: 'proud', category: 'missionComplete' },
  { id: 'missionComplete-12', text: '好了。', subtext: '關掉 app，去生活。', expression: 'normal', category: 'missionComplete' },
],
  progress: [
  { id: 'progress-01', text: '有在動。', subtext: '慢也沒關係，方向對就好。', expression: 'proud', category: 'progress' },
  { id: 'progress-02', text: '比上週好一點。', subtext: '一點也是進步。', expression: 'happy', category: 'progress' },
  { id: 'progress-03', text: '數字有變。', subtext: '別盯太緊，趨勢比較重要。', expression: 'normal', category: 'progress' },
  { id: 'progress-04', text: '你在走。', subtext: '沒跑也沒關係，有在走。', expression: 'normal', category: 'progress' },
  { id: 'progress-05', text: '穩穩的。', subtext: '這種最不容易反彈。', expression: 'proud', category: 'progress' },
  { id: 'progress-06', text: '有差。', subtext: '你自己可能沒感覺，但有的。', expression: 'happy', category: 'progress' },
  { id: 'progress-07', text: '持續中。', subtext: '不用每天都有進步，有在就好。', expression: 'normal', category: 'progress' },
  { id: 'progress-08', text: '方向對。', subtext: '剩下的交給時間。', expression: 'proud', category: 'progress' },
  { id: 'progress-09', text: '有記錄就有差。', subtext: '比靠記憶可靠多了。', expression: 'normal', category: 'progress' },
  { id: 'progress-10', text: '一週一週來。', subtext: '不用跟別人比。', expression: 'normal', category: 'progress' },
  { id: 'progress-11', text: '你看。', subtext: '堅持會留下痕跡。', expression: 'happy', category: 'progress' },
  { id: 'progress-12', text: '還在。', subtext: '沒放棄本身就是進步。', expression: 'proud', category: 'progress' },
],
  weightPlateau: [
  { id: 'weightPlateau-01', text: '體重沒掉？', subtext: '脂肪沒那麼愛演。再給它幾天。', expression: 'plateau', category: 'weightPlateau' },
  { id: 'weightPlateau-02', text: '卡住了。', subtext: '平台期很正常，不是你的問題。', expression: 'plateau', category: 'weightPlateau' },
  { id: 'weightPlateau-03', text: '數字不動。', subtext: '它在休息，你也休息一下。', expression: 'eyeRoll', category: 'weightPlateau' },
  { id: 'weightPlateau-04', text: '秤沒變。', subtext: '衣服可能比較誠實。', expression: 'normal', category: 'weightPlateau' },
  { id: 'weightPlateau-05', text: '停滯期。', subtext: '身體在適應，耐心一點。', expression: 'plateau', category: 'weightPlateau' },
  { id: 'weightPlateau-06', text: '沒掉。', subtext: '你確定沒偷吃？開玩笑的，可能只是水。', expression: 'suspicious', category: 'weightPlateau' },
  { id: 'weightPlateau-07', text: '平台。', subtext: '很煩，但會過的。', expression: 'tired', category: 'weightPlateau' },
  { id: 'weightPlateau-08', text: '體重穩定。', subtext: '穩定有時候是在醞釀下一波。', expression: 'normal', category: 'weightPlateau' },
  { id: 'weightPlateau-09', text: '秤壞了？', subtext: '大概沒有，只是身體慢。', expression: 'eyeRoll', category: 'weightPlateau' },
  { id: 'weightPlateau-10', text: '沒變化。', subtext: '繼續照做，別亂改。', expression: 'plateau', category: 'weightPlateau' },
  { id: 'weightPlateau-11', text: '卡關。', subtext: '換個角度，量量腰圍。', expression: 'normal', category: 'weightPlateau' },
  { id: 'weightPlateau-12', text: '脂肪在摸魚。', subtext: '它會動的，只是比較慢。', expression: 'eyeRoll', category: 'weightPlateau' },
],
  lateNight: [
  { id: 'lateNight-01', text: '還沒睡？', subtext: '脂肪都比你早睡。', expression: 'sleep', category: 'lateNight' },
  { id: 'lateNight-02', text: '這麼晚了。', subtext: '手機可以放下了。', expression: 'sleepy', category: 'lateNight' },
  { id: 'lateNight-03', text: '凌晨了。', subtext: '明天的事明天再說，先睡。', expression: 'sleep', category: 'lateNight' },
  { id: 'lateNight-04', text: '你還醒著。', subtext: '眼睛還撐得住，身體不一定。', expression: 'tired', category: 'lateNight' },
  { id: 'lateNight-05', text: '該睡了。', subtext: '不是命令，是建議。', expression: 'sleep', category: 'lateNight' },
  { id: 'lateNight-06', text: '夜貓子。', subtext: '明天會後悔的，你懂的。', expression: 'eyeRoll', category: 'lateNight' },
  { id: 'lateNight-07', text: '又滑手機。', subtext: '十分鐘變一小時，經典。', expression: 'suspicious', category: 'lateNight' },
  { id: 'lateNight-08', text: '深夜。', subtext: '這時間還醒著，通常不是在運動。', expression: 'sleepy', category: 'lateNight' },
  { id: 'lateNight-09', text: '睡吧。', subtext: '熬夜不會讓明天變簡單。', expression: 'sleep', category: 'lateNight' },
  { id: 'lateNight-10', text: '還在？', subtext: '床在等你，不用客氣。', expression: 'tired', category: 'lateNight' },
  { id: 'lateNight-11', text: '十二點了。', subtext: '宵夜念頭可以關掉了。', expression: 'sleep', category: 'lateNight' },
  { id: 'lateNight-12', text: '晚安。', subtext: '真的去睡，不是說說而已。', expression: 'sleepy', category: 'lateNight' },
],
  sleep: [
  { id: 'sleep-01', text: '睡夠了？', subtext: '七小時是理想，六小時是現實。', expression: 'sleepy', category: 'sleep' },
  { id: 'sleep-02', text: '睡眠。', subtext: '比任何補品都有效。', expression: 'sleep', category: 'sleep' },
  { id: 'sleep-03', text: '昨晚睡很少。', subtext: '今天別對自己太狠。', expression: 'tired', category: 'sleep' },
  { id: 'sleep-04', text: '補眠。', subtext: '週末睡久一點，身體會記帳。', expression: 'sleepy', category: 'sleep' },
  { id: 'sleep-05', text: '睡不著？', subtext: '別滑手機，越滑越睡不著。', expression: 'normal', category: 'sleep' },
  { id: 'sleep-06', text: '睡眠品質。', subtext: '比時數重要，但時數也不能太少。', expression: 'sleep', category: 'sleep' },
  { id: 'sleep-07', text: '早點睡。', subtext: '明天精神好，比什麼都值。', expression: 'sleepy', category: 'sleep' },
  { id: 'sleep-08', text: '你需要的。', subtext: '不是懶，是恢復。', expression: 'sleep', category: 'sleep' },
  { id: 'sleep-09', text: '睡飽。', subtext: '醒來世界會比較友善。', expression: 'happy', category: 'sleep' },
  { id: 'sleep-10', text: '熬夜後遺症。', subtext: '今天慢慢來，別硬撐。', expression: 'tired', category: 'sleep' },
  { id: 'sleep-11', text: '睡眠紀錄。', subtext: '有記就會發現規律。', expression: 'normal', category: 'sleep' },
  { id: 'sleep-12', text: '該躺了。', subtext: '躺著也算計畫的一部分。', expression: 'sleepy', category: 'sleep' },
],
  rainyDay: [
  { id: 'rainyDay-01', text: '下雨了。', subtext: '不想出門很正常，在家動也行。', expression: 'normal', category: 'rainyDay' },
  { id: 'rainyDay-02', text: '雨天。', subtext: '適合煮點熱的，別煮太多。', expression: 'sleepy', category: 'rainyDay' },
  { id: 'rainyDay-03', text: '濕答答。', subtext: '心情受影響也正常，別硬撐。', expression: 'tired', category: 'rainyDay' },
  { id: 'rainyDay-04', text: '外面在下雨。', subtext: '外送可以，記得記。', expression: 'normal', category: 'rainyDay' },
  { id: 'rainyDay-05', text: '雨聲白噪音。', subtext: '很適合睡覺，不是適合吃。', expression: 'sleepy', category: 'rainyDay' },
  { id: 'rainyDay-06', text: '不能跑步。', subtext: '家裡伸展也算，別完全放掉。', expression: 'eyeRoll', category: 'rainyDay' },
  { id: 'rainyDay-07', text: '雨天模式。', subtext: '降低標準，有做就好。', expression: 'normal', category: 'rainyDay' },
  { id: 'rainyDay-08', text: '撐傘了嗎？', subtext: '淋濕會感冒，感冒更不想動。', expression: 'suspicious', category: 'rainyDay' },
  { id: 'rainyDay-09', text: '陰陰的。', subtext: '吃點暖的，但別用食物填空洞。', expression: 'tired', category: 'rainyDay' },
  { id: 'rainyDay-10', text: '雨。', subtext: '今天可以溫柔對待自己。', expression: 'normal', category: 'rainyDay' },
  { id: 'rainyDay-11', text: '不想出門。', subtext: '合理，冰箱有什麼就什麼。', expression: 'sleepy', category: 'rainyDay' },
  { id: 'rainyDay-12', text: '天氣不好。', subtext: '不是偷懶的理由，但可以是減量理由。', expression: 'normal', category: 'rainyDay' },
],
  weekend: [
  { id: 'weekend-01', text: '週末。', subtext: '可以慢一點，但別完全放飛。', expression: 'happy', category: 'weekend' },
  { id: 'weekend-02', text: '星期六。', subtext: '睡晚一點沒關係，別睡到忘記吃。', expression: 'normal', category: 'weekend' },
  { id: 'weekend-03', text: '週末模式。', subtext: '放鬆可以，失憶不行。', expression: 'sleepy', category: 'weekend' },
  { id: 'weekend-04', text: '不用上班。', subtext: '時間自己安排，別安排成吃整天。', expression: 'happy', category: 'weekend' },
  { id: 'weekend-05', text: '週日。', subtext: '明天要上班，今晚別太瘋。', expression: 'tired', category: 'weekend' },
  { id: 'weekend-06', text: 'Brunch？', subtext: '可以，算早午餐別算晚餐。', expression: 'coffee', category: 'weekend' },
  { id: 'weekend-07', text: '週末聚餐。', subtext: '去啊，記得記，明天照舊。', expression: 'cheat', category: 'weekend' },
  { id: 'weekend-08', text: '在家躺。', subtext: '躺可以，順便喝點水。', expression: 'sleepy', category: 'weekend' },
  { id: 'weekend-09', text: '補眠日。', subtext: '睡飽了記得吃，別直接跳到晚餐。', expression: 'sleep', category: 'weekend' },
  { id: 'weekend-10', text: '週末愉快。', subtext: '愉快不等於放縱，但你懂我意思。', expression: 'happy', category: 'weekend' },
  { id: 'weekend-11', text: '兩天假。', subtext: '不用跟平日一樣嚴，有記就好。', expression: 'normal', category: 'weekend' },
  { id: 'weekend-12', text: 'Friday night 延伸。', subtext: '如果還沒睡，現在是週末了。', expression: 'eyeRoll', category: 'weekend' },
],
  cheatMeal: [
  { id: 'cheatMeal-01', text: '聚餐？去啊。', subtext: '人生又不是只有雞胸肉。明天再健一點。', expression: 'cheat', category: 'cheatMeal' },
  { id: 'cheatMeal-02', text: '放縱餐。', subtext: '有計畫的放縱，不算失控。', expression: 'happy', category: 'cheatMeal' },
  { id: 'cheatMeal-03', text: '想吃好的。', subtext: '偶爾可以，別變成每週四。', expression: 'normal', category: 'cheatMeal' },
  { id: 'cheatMeal-04', text: '作弊餐。', subtext: '這個詞很難聽，就叫好好吃一餐。', expression: 'cheat', category: 'cheatMeal' },
  { id: 'cheatMeal-05', text: '今天例外。', subtext: '例外可以，別一週七次例外。', expression: 'eyeRoll', category: 'cheatMeal' },
  { id: 'cheatMeal-06', text: '火鍋？', subtext: '去，記得記，湯底別喝太多。', expression: 'happy', category: 'cheatMeal' },
  { id: 'cheatMeal-07', text: '燒肉。', subtext: '享受，明天正常吃就好。', expression: 'cheat', category: 'cheatMeal' },
  { id: 'cheatMeal-08', text: '甜點。', subtext: '一塊可以，整盒不行。', expression: 'happy', category: 'cheatMeal' },
  { id: 'cheatMeal-09', text: '不罪惡。', subtext: '吃了就記，別吃完再後悔。', expression: 'normal', category: 'cheatMeal' },
  { id: 'cheatMeal-10', text: '偶爾。', subtext: '這兩個字很重要。', expression: 'cheat', category: 'cheatMeal' },
  { id: 'cheatMeal-11', text: '朋友約。', subtext: '社交也是健康的一部分，去。', expression: 'happy', category: 'cheatMeal' },
  { id: 'cheatMeal-12', text: '吃好的。', subtext: '開心吃，認真記，明天繼續。', expression: 'normal', category: 'cheatMeal' },
],
  restDay: [
  { id: 'restDay-01', text: '今天先活著。', subtext: '其他明天再說。', expression: 'sleepy', category: 'restDay' },
  { id: 'restDay-02', text: '休息日。', subtext: '不是偷懶，是排程的一部分。', expression: 'normal', category: 'restDay' },
  { id: 'restDay-03', text: '不動。', subtext: '可以，肌肉也要修。', expression: 'tired', category: 'restDay' },
  { id: 'restDay-04', text: '今天休息。', subtext: '好好躺，別有罪惡感。', expression: 'sleepy', category: 'restDay' },
  { id: 'restDay-05', text: '恢復日。', subtext: '休息是為了明天動得更好。', expression: 'normal', category: 'restDay' },
  { id: 'restDay-06', text: '放假。', subtext: '身體的假，不是飲食的假。', expression: 'happy', category: 'restDay' },
  { id: 'restDay-07', text: '不練。', subtext: '沒關係，記得還是要吃。', expression: 'normal', category: 'restDay' },
  { id: 'restDay-08', text: '躺平。', subtext: '合法，今天。', expression: 'sleepy', category: 'restDay' },
  { id: 'restDay-09', text: '肌肉在長。', subtext: '休息時才長，不是在健身房。', expression: 'normal', category: 'restDay' },
  { id: 'restDay-10', text: '今天不動。', subtext: '動腦也算，別動太多。', expression: 'tired', category: 'restDay' },
  { id: 'restDay-11', text: 'Off day。', subtext: '有 off 才有 on。', expression: 'normal', category: 'restDay' },
  { id: 'restDay-12', text: '休息。', subtext: '不是放棄，是排程。', expression: 'sleepy', category: 'restDay' },
],
  stressEating: [
  { id: 'stressEating-01', text: '壓力大？', subtext: '吃可以，但別用食物報復自己。', expression: 'tired', category: 'stressEating' },
  { id: 'stressEating-02', text: '情緒性進食。', subtext: '先承認，再決定要不要繼續。', expression: 'normal', category: 'stressEating' },
  { id: 'stressEating-03', text: '想暴吃。', subtext: '我懂，先喝杯水，再等十分鐘。', expression: 'suspicious', category: 'stressEating' },
  { id: 'stressEating-04', text: '心情不好。', subtext: '食物不是唯一解法，但偶爾有效。', expression: 'tired', category: 'stressEating' },
  { id: 'stressEating-05', text: '加班後。', subtext: '便利商店是陷阱，小心。', expression: 'coffee', category: 'stressEating' },
  { id: 'stressEating-06', text: '壓力鍋。', subtext: '你不是壓力鍋，不用爆。', expression: 'eyeRoll', category: 'stressEating' },
  { id: 'stressEating-07', text: '吃了再說。', subtext: '可以，記得記，明天不用加倍懲罰。', expression: 'normal', category: 'stressEating' },
  { id: 'stressEating-08', text: '焦慮。', subtext: '深呼吸，比零食便宜。', expression: 'tired', category: 'stressEating' },
  { id: 'stressEating-09', text: '情緒來了。', subtext: '讓它來，別讓它決定你吃多少。', expression: 'normal', category: 'stressEating' },
  { id: 'stressEating-10', text: '想靠吃紓壓。', subtext: '短效，但偶爾需要短效。', expression: 'suspicious', category: 'stressEating' },
  { id: 'stressEating-11', text: '今天很爛。', subtext: '爛日子會過，別用食物加重。', expression: 'tired', category: 'stressEating' },
  { id: 'stressEating-12', text: '壓力吃。', subtext: '發生了就記，不用假裝沒發生。', expression: 'normal', category: 'stressEating' },
],
  workOvertime: [
  { id: 'workOvertime-01', text: '又加班。', subtext: '便利商店便當也算，有吃就好。', expression: 'tired', category: 'workOvertime' },
  { id: 'workOvertime-02', text: '還在公司。', subtext: '記得吃，別靠咖啡撐。', expression: 'coffee', category: 'workOvertime' },
  { id: 'workOvertime-03', text: '加班餐。', subtext: '外送可以，選個正常一点的。', expression: 'normal', category: 'workOvertime' },
  { id: 'workOvertime-04', text: '很晚才下班。', subtext: '回家別順便買消夜。', expression: 'tired', category: 'workOvertime' },
  { id: 'workOvertime-05', text: '工作狂模式。', subtext: '身體不是加班費，不會還你。', expression: 'eyeRoll', category: 'workOvertime' },
  { id: 'workOvertime-06', text: 'OT。', subtext: '今天標準降低，有記錄就好。', expression: 'tired', category: 'workOvertime' },
  { id: 'workOvertime-07', text: '深夜辦公室。', subtext: '泡麵出現了？記得記。', expression: 'coffee', category: 'workOvertime' },
  { id: 'workOvertime-08', text: '忙。', subtext: '忙不是不吃，是吃簡單的。', expression: 'normal', category: 'workOvertime' },
  { id: 'workOvertime-09', text: '加班中。', subtext: '喝水，比吃零食強。', expression: 'tired', category: 'workOvertime' },
  { id: 'workOvertime-10', text: '今天很長。', subtext: '結束後去睡，別報復性滑手機。', expression: 'sleepy', category: 'workOvertime' },
  { id: 'workOvertime-11', text: '會議開不完。', subtext: '中場如果有點心，拿一個就好。', expression: 'eyeRoll', category: 'workOvertime' },
  { id: 'workOvertime-12', text: '工時爆表。', subtext: '這週別對體重太苛刻。', expression: 'tired', category: 'workOvertime' },
],
  pushNotification: [
  { id: 'pushNotification-01', text: '該喝水了。', subtext: '不是催，是提醒。', expression: 'water', category: 'pushNotification' },
  { id: 'pushNotification-02', text: '吃飯時間。', subtext: '鬧鐘響了，不是我在煩你。', expression: 'hungry', category: 'pushNotification' },
  { id: 'pushNotification-03', text: '記得記。', subtext: '三秒鐘，比後悔快。', expression: 'normal', category: 'pushNotification' },
  { id: 'pushNotification-04', text: '提醒一下。', subtext: '你可以忽略，但別忘記。', expression: 'normal', category: 'pushNotification' },
  { id: 'pushNotification-05', text: '嘿。', subtext: '還活著嗎？吃飯了嗎？', expression: 'happy', category: 'pushNotification' },
  { id: 'pushNotification-06', text: '時間到。', subtext: '照表操課，不用想。', expression: 'normal', category: 'pushNotification' },
  { id: 'pushNotification-07', text: '再健一下。', subtext: '打開，記一筆，關掉。', expression: 'normal', category: 'pushNotification' },
  { id: 'pushNotification-08', text: '溫柔提醒。', subtext: '大概。', expression: 'normal', category: 'pushNotification' },
  { id: 'pushNotification-09', text: '該動了。', subtext: '不是要你馬上跑，是想起來。', expression: 'workout', category: 'pushNotification' },
  { id: 'pushNotification-10', text: '晚餐。', subtext: '別又忘記然後十一點暴吃。', expression: 'hungry', category: 'pushNotification' },
  { id: 'pushNotification-11', text: '今日還沒記。', subtext: '我知道你在忙，但三十秒就好。', expression: 'suspicious', category: 'pushNotification' },
  { id: 'pushNotification-12', text: '通知。', subtext: '你可以關掉，但關掉就真的忘了。', expression: 'eyeRoll', category: 'pushNotification' },
],
  loading: [
  { id: 'loading-01', text: '等一下。', expression: 'normal', category: 'loading' },
  { id: 'loading-02', text: '在想…', expression: 'suspicious', category: 'loading' },
  { id: 'loading-03', text: '載入中。', subtext: '比你想的快。', expression: 'normal', category: 'loading' },
  { id: 'loading-04', text: '排餐中。', subtext: '別急。', expression: 'normal', category: 'loading' },
  { id: 'loading-05', text: '稍等。', subtext: '我在算。', expression: 'sleepy', category: 'loading' },
  { id: 'loading-06', text: '處理中。', expression: 'normal', category: 'loading' },
  { id: 'loading-07', text: '翻菜單。', subtext: '選項很多，給我幾秒。', expression: 'eyeRoll', category: 'loading' },
  { id: 'loading-08', text: '來了。', subtext: '真的，來了。', expression: 'normal', category: 'loading' },
  { id: 'loading-09', text: '等等。', subtext: '快好了。', expression: 'tired', category: 'loading' },
  { id: 'loading-10', text: '配餐。', subtext: '不用你動腦，我動。', expression: 'normal', category: 'loading' },
  { id: 'loading-11', text: '搜尋中。', subtext: '附近有什么好吃的。', expression: 'suspicious', category: 'loading' },
  { id: 'loading-12', text: '讀取。', subtext: '不會很久。', expression: 'normal', category: 'loading' },
],
  error: [
  { id: 'error-01', text: '網路在偷懶。', subtext: '等等再試。', expression: 'tired', category: 'error' },
  { id: 'error-02', text: '出錯了。', subtext: '不是你的問題，重試看看。', expression: 'normal', category: 'error' },
  { id: 'error-03', text: '連不上。', subtext: '換個網路，或換個心情。', expression: 'tired', category: 'error' },
  { id: 'error-04', text: '載入失敗。', subtext: '按一下，通常就會好。', expression: 'eyeRoll', category: 'error' },
  { id: 'error-05', text: '怪怪的。', subtext: '我也覺得，再試一次。', expression: 'suspicious', category: 'error' },
  { id: 'error-06', text: '伺服器在摸魚。', subtext: '等一下再來。', expression: 'sleepy', category: 'error' },
  { id: 'error-07', text: '失敗。', subtext: '一次失敗不算，再按。', expression: 'normal', category: 'error' },
  { id: 'error-08', text: '斷線。', subtext: '現代人的日常，習慣就好。', expression: 'tired', category: 'error' },
  { id: 'error-09', text: 'Something wrong。', subtext: '中文就是：再試試。', expression: 'normal', category: 'error' },
  { id: 'error-10', text: '讀取失敗。', subtext: '資料還在，只是暫時抓不到。', expression: 'eyeRoll', category: 'error' },
  { id: 'error-11', text: '404。', subtext: '找不到，但你也找不到鑰匙過，對吧。', expression: 'suspicious', category: 'error' },
  { id: 'error-12', text: 'timeout。', subtext: '等太久了，換個時間。', expression: 'tired', category: 'error' },
],
  empty: [
  { id: 'empty-01', text: '還沒開始。', subtext: '按一下，我幫你排本週。', expression: 'normal', category: 'empty' },
  { id: 'empty-02', text: '空的。', subtext: '正常，第一天都是空的。', expression: 'normal', category: 'empty' },
  { id: 'empty-03', text: '沒資料。', subtext: '記第一筆，這裡就會有東西。', expression: 'normal', category: 'empty' },
  { id: 'empty-04', text: '零。', subtext: '每個人都從零開始，包括我。', expression: 'eyeRoll', category: 'empty' },
  { id: 'empty-05', text: '還沒記錄。', subtext: '今天記一筆，明天就有歷史。', expression: 'normal', category: 'empty' },
  { id: 'empty-06', text: '空白。', subtext: '像新的一頁，寫上去就好。', expression: 'sleepy', category: 'empty' },
  { id: 'empty-07', text: '什麼都沒有。', subtext: '正好，從第一餐開始。', expression: 'normal', category: 'empty' },
  { id: 'empty-08', text: '新帳號。', subtext: '歡迎，不用懂，照著做。', expression: 'happy', category: 'empty' },
  { id: 'empty-09', text: '清單空。', subtext: '骰子可以幫你填第一格。', expression: 'normal', category: 'empty' },
  { id: 'empty-10', text: '無。', subtext: '無也是一種狀態，短暫的。', expression: 'normal', category: 'empty' },
  { id: 'empty-11', text: '還沒有。', subtext: '有「還沒」就有「會有」。', expression: 'normal', category: 'empty' },
  { id: 'empty-12', text: '起點。', subtext: '你在這裡，這就是開始。', expression: 'proud', category: 'empty' },
],
  achievement: [
  { id: 'achievement-01', text: '解鎖。', subtext: '小成就，但算數。', expression: 'proud', category: 'achievement' },
  { id: 'achievement-02', text: '你做到了。', subtext: '不用低調，可以開心一下。', expression: 'happy', category: 'achievement' },
  { id: 'achievement-03', text: '徽章。', subtext: '虛擬的，但努力是真的。', expression: 'proud', category: 'achievement' },
  { id: 'achievement-04', text: '里程碑。', subtext: '路還長，但這站值得停。', expression: 'happy', category: 'achievement' },
  { id: 'achievement-05', text: '新成就。', subtext: '繼續，別停在這。', expression: 'proud', category: 'achievement' },
  { id: 'achievement-06', text: '值得記。', subtext: '這種日子不多，記下來。', expression: 'normal', category: 'achievement' },
  { id: 'achievement-07', text: '進階了。', subtext: '不是終點，是確認方向。', expression: 'happy', category: 'achievement' },
  { id: 'achievement-08', text: '解鎖成功。', subtext: '我沒有很驚訝，但還是恭喜。', expression: 'proud', category: 'achievement' },
  { id: 'achievement-09', text: '成就達成。', subtext: '下一個不會太遠。', expression: 'happy', category: 'achievement' },
  { id: 'achievement-10', text: '你變了。', subtext: '可能自己沒感覺，但有的。', expression: 'proud', category: 'achievement' },
  { id: 'achievement-11', text: '記錄在案。', subtext: '系統記住了，你也該記得。', expression: 'normal', category: 'achievement' },
  { id: 'achievement-12', text: '不錯。', subtext: '真的不錯，不是客套。', expression: 'proud', category: 'achievement' },
],
  firstWeek: [
  { id: 'firstWeek-01', text: '第一週。', subtext: '最難的通常是開始，你已經在了。', expression: 'happy', category: 'firstWeek' },
  { id: 'firstWeek-02', text: '七天了。', subtext: '習慣在形成，別斷。', expression: 'proud', category: 'firstWeek' },
  { id: 'firstWeek-03', text: '新手期。', subtext: '亂是正常的，記比完美重要。', expression: 'normal', category: 'firstWeek' },
  { id: 'firstWeek-04', text: '一週。', subtext: '比想像中快，對吧。', expression: 'happy', category: 'firstWeek' },
  { id: 'firstWeek-05', text: '還在適應。', subtext: '不用跟老手比，你是新手。', expression: 'normal', category: 'firstWeek' },
  { id: 'firstWeek-06', text: '第一週快結束。', subtext: '撐過這週，下週會比較順。', expression: 'proud', category: 'firstWeek' },
  { id: 'firstWeek-07', text: '新手上路。', subtext: '迷路正常，有記錄就不會完全迷路。', expression: 'normal', category: 'firstWeek' },
  { id: 'firstWeek-08', text: 'Day 7。', subtext: '一週了，可以小聲驕傲一下。', expression: 'happy', category: 'firstWeek' },
  { id: 'firstWeek-09', text: '適應中。', subtext: '身體在調，給它時間。', expression: 'tired', category: 'firstWeek' },
  { id: 'firstWeek-10', text: '第一週。', subtext: '不用完美，有在就好。', expression: 'normal', category: 'firstWeek' },
  { id: 'firstWeek-11', text: '你還在。', subtext: '很多人第一週就消失了。', expression: 'proud', category: 'firstWeek' },
  { id: 'firstWeek-12', text: '一週紀念。', subtext: '不辦派對，但值得點頭。', expression: 'happy', category: 'firstWeek' },
],
  streak7: [
  { id: 'streak7-01', text: '最近有點過分。', subtext: '居然開始認真了。', expression: 'proud', category: 'streak7' },
  { id: 'streak7-02', text: '七天連續。', subtext: '習慣的形狀出來了。', expression: 'happy', category: 'streak7' },
  { id: 'streak7-03', text: '一週不間斷。', subtext: '我不會說很棒，但…嗯，很棒。', expression: 'proud', category: 'streak7' },
  { id: 'streak7-04', text: '7 day streak。', subtext: '數字不大，意義有。', expression: 'happy', category: 'streak7' },
  { id: 'streak7-05', text: '連續一週。', subtext: '斷了也沒關係，但現在還沒斷。', expression: 'proud', category: 'streak7' },
  { id: 'streak7-06', text: '一週。', subtext: '穩穩的，繼續。', expression: 'normal', category: 'streak7' },
  { id: 'streak7-07', text: '習慣雛形。', subtext: '再兩週就真的很難斷了。', expression: 'happy', category: 'streak7' },
  { id: 'streak7-08', text: '七天。', subtext: '比你想的容易，對吧。', expression: 'proud', category: 'streak7' },
  { id: 'streak7-09', text: '一週 streak。', subtext: '低調繼續，別炫耀。', expression: 'happy', category: 'streak7' },
  { id: 'streak7-10', text: '連續記錄。', subtext: '這比完美飲食重要。', expression: 'normal', category: 'streak7' },
  { id: 'streak7-11', text: '一週了欸。', subtext: '好啦，真的不錯。', expression: 'eyeRoll', category: 'streak7' },
  { id: 'streak7-12', text: '7。', subtext: '簡單的數字，不簡單的堅持。', expression: 'proud', category: 'streak7' },
],
  streak30: [
  { id: 'streak30-01', text: '老實說。', subtext: '我本來以為你撐不到這。', expression: 'proud', category: 'streak30' },
  { id: 'streak30-02', text: '三十天。', subtext: '一個月了，可以承認你在認真。', expression: 'happy', category: 'streak30' },
  { id: 'streak30-03', text: '一個月連續。', subtext: '這不是運氣，是習慣。', expression: 'proud', category: 'streak30' },
  { id: 'streak30-04', text: '30 day streak。', subtext: '值得記住這天。', expression: 'happy', category: 'streak30' },
  { id: 'streak30-05', text: '滿月。', subtext: '不是農曆那種，是紀錄那種。', expression: 'proud', category: 'streak30' },
  { id: 'streak30-06', text: '一個月。', subtext: '穩，繼續穩。', expression: 'normal', category: 'streak30' },
  { id: 'streak30-07', text: '三十天不間斷。', subtext: '我沒有很感動，但有一點。', expression: 'proud', category: 'streak30' },
  { id: 'streak30-08', text: '習慣成形。', subtext: '現在斷了反而會不習慣。', expression: 'happy', category: 'streak30' },
  { id: 'streak30-09', text: '30。', subtext: '數字說話，不用多說。', expression: 'proud', category: 'streak30' },
  { id: 'streak30-10', text: '一個月了。', subtext: '好啦，你贏了。', expression: 'eyeRoll', category: 'streak30' },
  { id: 'streak30-11', text: '連續三十。', subtext: '下個目標？先別想，繼續。', expression: 'happy', category: 'streak30' },
  { id: 'streak30-12', text: '月紀念。', subtext: '不辦活動，但心裡可以放煙火。', expression: 'proud', category: 'streak30' },
],
  streak100: [
  { id: 'streak100-01', text: '一百天。', subtext: '這我必須敬你一下。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-02', text: '100 day streak。', subtext: '不是每個人都做得到。', expression: 'happy', category: 'streak100' },
  { id: 'streak100-03', text: '三位數了。', subtext: '習慣已經是你的一部分。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-04', text: '一百。', subtext: '簡單的數字，很長的路。', expression: 'happy', category: 'streak100' },
  { id: 'streak100-05', text: '百日出關。', subtext: '不用謙虛，這很強。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-06', text: '100 天連續。', subtext: '我記得第一天，你現在不一樣了。', expression: 'happy', category: 'streak100' },
  { id: 'streak100-07', text: '三個多月。', subtext: '穩到可以寫進履歷，開玩笑的。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-08', text: '百 streak。', subtext: '繼續，沒有終點線。', expression: 'happy', category: 'streak100' },
  { id: 'streak100-09', text: '一百天紀念。', subtext: '截圖可以，但別只截圖。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-10', text: '100。', subtext: '你變成了會記錄的人。', expression: 'happy', category: 'streak100' },
  { id: 'streak100-11', text: '百日。', subtext: '這種事做一百天，就是性格了。', expression: 'proud', category: 'streak100' },
  { id: 'streak100-12', text: '一百天。', subtext: '好啦，你真的很可以。', expression: 'eyeRoll', category: 'streak100' },
],
  dice: [
  { id: 'dice-01', text: '不知道吃什麼？', subtext: '交給我。', expression: 'eyeRoll', category: 'dice' },
  { id: 'dice-02', text: '幫你決定。', subtext: '按一下，別想。', expression: 'normal', category: 'dice' },
  { id: 'dice-03', text: '骰子時間。', subtext: '選項我來，你負責吃。', expression: 'normal', category: 'dice' },
  { id: 'dice-04', text: '選不出來？', subtext: '正常，人類每天都要煩這個。', expression: 'suspicious', category: 'dice' },
  { id: 'dice-05', text: '配餐。', subtext: '不用動腦，我動。', expression: 'normal', category: 'dice' },
  { id: 'dice-06', text: '今天吃這個。', subtext: '照著吃就好。', expression: 'happy', category: 'dice' },
  { id: 'dice-07', text: '決定了。', subtext: '別再改，改了更難選。', expression: 'normal', category: 'dice' },
  { id: 'dice-08', text: '就這樣。', subtext: '這組可以。', expression: 'normal', category: 'dice' },
  { id: 'dice-09', text: '附近推薦。', subtext: '走得到的範圍。', expression: 'normal', category: 'dice' },
  { id: 'dice-10', text: '幫你想好了。', subtext: '你只管付錢和吃。', expression: 'proud', category: 'dice' },
],
  mealReplacement: [
  { id: 'mealReplacement-01', text: '代餐？', subtext: '可以，但別當成長期策略。', expression: 'suspicious', category: 'mealReplacement' },
  { id: 'mealReplacement-02', text: '取代一餐。', subtext: '偶爾可以，每餐不行。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-03', text: '蛋白飲。', subtext: '方便，但嘴巴還是會寂寞。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-04', text: '沒時間吃。', subtext: '代餐比不吃好，比亂吃好。', expression: 'tired', category: 'mealReplacement' },
  { id: 'mealReplacement-05', text: '速成。', subtext: '快不是罪，天天快是問題。', expression: 'eyeRoll', category: 'mealReplacement' },
  { id: 'mealReplacement-06', text: '代餐粉。', subtext: '記得記，別忘記你喝過。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-07', text: '一餐換掉。', subtext: '下一餐正常吃就好。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-08', text: '忙碌模式。', subtext: '代餐加咖啡，現代標配。', expression: 'coffee', category: 'mealReplacement' },
  { id: 'mealReplacement-09', text: '補充。', subtext: '是補充，不是逃避正餐。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-10', text: '喝的一餐。', subtext: '可以，但今晚別又「喝的一餐」。', expression: 'suspicious', category: 'mealReplacement' },
  { id: 'mealReplacement-11', text: '替代方案。', subtext: '有比沒有好，別變成唯一方案。', expression: 'normal', category: 'mealReplacement' },
  { id: 'mealReplacement-12', text: '代餐日。', subtext: '今天簡單過，明天正常吃。', expression: 'tired', category: 'mealReplacement' },
],
  lowMotivation: [
  { id: 'lowMotivation-01', text: '不想動。', subtext: '正常，動五分鐘看看。', expression: 'sleepy', category: 'lowMotivation' },
  { id: 'lowMotivation-02', text: '沒動力。', subtext: '不用每天都有，有記錄就好。', expression: 'tired', category: 'lowMotivation' },
  { id: 'lowMotivation-03', text: '今天算了。', subtext: '算可以，但「算」也要記下來。', expression: 'eyeRoll', category: 'lowMotivation' },
  { id: 'lowMotivation-04', text: '懶。', subtext: '承認懶，比假裝努力好。', expression: 'sleepy', category: 'lowMotivation' },
  { id: 'lowMotivation-05', text: '不想記。', subtext: '記一筆，三十秒，比後悔快。', expression: 'tired', category: 'lowMotivation' },
  { id: 'lowMotivation-06', text: '廢。', subtext: '廢一天可以，廢一週要想一下。', expression: 'sleepy', category: 'lowMotivation' },
  { id: 'lowMotivation-07', text: '提不起勁。', subtext: '最低標準：吃和睡。', expression: 'tired', category: 'lowMotivation' },
  { id: 'lowMotivation-08', text: '想放棄。', subtext: '想可以，做一點點再說。', expression: 'normal', category: 'lowMotivation' },
  { id: 'lowMotivation-09', text: '沒心情。', subtext: '心情會過，習慣別斷。', expression: 'tired', category: 'lowMotivation' },
  { id: 'lowMotivation-10', text: '今天很低。', subtext: '降低標準，有做就好。', expression: 'sleepy', category: 'lowMotivation' },
  { id: 'lowMotivation-11', text: '不想面對。', subtext: '面對秤不如面對記錄，記錄比較溫柔。', expression: 'eyeRoll', category: 'lowMotivation' },
  { id: 'lowMotivation-12', text: '動力欠費。', subtext: '先充基本款：吃對、睡夠。', expression: 'tired', category: 'lowMotivation' },
],
  monday: [
  { id: 'monday-01', text: '週一。', subtext: '能起來就贏一半了。', expression: 'tired', category: 'monday' },
  { id: 'monday-02', text: 'Monday。', subtext: '大家都討厭，你不是特例。', expression: 'eyeRoll', category: 'monday' },
  { id: 'monday-03', text: '新週開始。', subtext: '不用很積極，有記就好。', expression: 'normal', category: 'monday' },
  { id: 'monday-04', text: '又是週一。', subtext: '咖啡可以，空肚子不行。', expression: 'sleepy', category: 'monday' },
  { id: 'monday-05', text: '一。', subtext: '簡單的數字，沉重的心情。', expression: 'tired', category: 'monday' },
  { id: 'monday-06', text: '本週第一天。', subtext: '照表操課，不用想。', expression: 'normal', category: 'monday' },
  { id: 'monday-07', text: '週一症候群。', subtext: '正常，慢慢進入狀況。', expression: 'eyeRoll', category: 'monday' },
  { id: 'monday-08', text: '開工。', subtext: '先活著，再工作。', expression: 'coffee', category: 'monday' },
  { id: 'monday-09', text: 'Monday blue。', subtext: '藍色可以，別用食物染成黃色。', expression: 'tired', category: 'monday' },
  { id: 'monday-10', text: '一週之始。', subtext: '好的開始是…有開始。', expression: 'normal', category: 'monday' },
  { id: 'monday-11', text: '週一啊。', subtext: '我懂，真的懂。', expression: 'sleepy', category: 'monday' },
  { id: 'monday-12', text: '新的一週。', subtext: '別跟上一週比，跟今天比。', expression: 'normal', category: 'monday' },
],
  friday: [
  { id: 'friday-01', text: '週五。', subtext: '撐到了，今晚可以鬆一點。', expression: 'happy', category: 'friday' },
  { id: 'friday-02', text: 'Friday。', subtext: '週末前最後一關。', expression: 'happy', category: 'friday' },
  { id: 'friday-03', text: '終於週五。', subtext: '這週有在記，很好。', expression: 'proud', category: 'friday' },
  { id: 'friday-04', text: '五。', subtext: '數字不大，心情很大。', expression: 'happy', category: 'friday' },
  { id: 'friday-05', text: '週五夜。', subtext: '可以出去，記得記。', expression: 'cheat', category: 'friday' },
  { id: 'friday-06', text: 'TGIF。', subtext: '週末不是放飛的藉口，但稍微鬆可以。', expression: 'happy', category: 'friday' },
  { id: 'friday-07', text: '本週最後一天。', subtext: '收尾，別爛尾。', expression: 'normal', category: 'friday' },
  { id: 'friday-08', text: '週五了。', subtext: '別一興奮就吃到週日。', expression: 'eyeRoll', category: 'friday' },
  { id: 'friday-09', text: '解放日。', subtext: '解放心情，不是解放胃。', expression: 'happy', category: 'friday' },
  { id: 'friday-10', text: 'Friday night。', subtext: '聚餐可以，明天正常吃。', expression: 'cheat', category: 'friday' },
  { id: 'friday-11', text: '週末前哨。', subtext: '今晚別太瘋，明天還是週六。', expression: 'normal', category: 'friday' },
  { id: 'friday-12', text: '五點了嗎？', subtext: '還沒五點也可以倒數。', expression: 'suspicious', category: 'friday' },
],
  afterOvereating: [
  { id: 'afterOvereating-01', text: '昨天再賤一點。', subtext: '今天再健一點。', expression: 'normal', category: 'afterOvereating' },
  { id: 'afterOvereating-02', text: '吃太多了。', subtext: '發生了，不用加倍懲罰。', expression: 'eyeRoll', category: 'afterOvereating' },
  { id: 'afterOvereating-03', text: '撐。', subtext: '今天正常吃，不要報復性節食。', expression: 'tired', category: 'afterOvereating' },
  { id: 'afterOvereating-04', text: '昨天那餐。', subtext: '記了就好，別假裝沒發生。', expression: 'normal', category: 'afterOvereating' },
  { id: 'afterOvereating-05', text: '暴吃後。', subtext: '今天不用餓回來，照常吃。', expression: 'tired', category: 'afterOvereating' },
  { id: 'afterOvereating-06', text: '後悔。', subtext: '後悔夠了，下一餐正常。', expression: 'eyeRoll', category: 'afterOvereating' },
  { id: 'afterOvereating-07', text: '吃爆。', subtext: '一頓不會毀一切，別毀下一週。', expression: 'cheat', category: 'afterOvereating' },
  { id: 'afterOvereating-08', text: '昨天很放縱。', subtext: '今天不是贖罪日，是普通日。', expression: 'normal', category: 'afterOvereating' },
  { id: 'afterOvereating-09', text: 'Overate。', subtext: '人類正常，繼續記錄。', expression: 'tired', category: 'afterOvereating' },
  { id: 'afterOvereating-10', text: '胃還在抗議。', subtext: '今天吃清淡，不是不吃。', expression: 'sleepy', category: 'afterOvereating' },
  { id: 'afterOvereating-11', text: '昨天那樣。', subtext: '我知道，你也知道，記了就好。', expression: 'suspicious', category: 'afterOvereating' },
  { id: 'afterOvereating-12', text: '下一餐。', subtext: '正常吃，別用跳過來補救。', expression: 'normal', category: 'afterOvereating' },
],
  holiday: [
  { id: 'holiday-01', text: '連假。', subtext: '開心玩，有記就不會完全失控。', expression: 'happy', category: 'holiday' },
  { id: 'holiday-02', text: '放假。', subtext: '不是天天放縱的藉口，但今天可以。', expression: 'cheat', category: 'holiday' },
  { id: 'holiday-03', text: '節日。', subtext: '吃可以，記得記。', expression: 'happy', category: 'holiday' },
  { id: 'holiday-04', text: '連續假期。', subtext: '標準放寬，別完全放掉。', expression: 'normal', category: 'holiday' },
  { id: 'holiday-05', text: '春節？', subtext: '年糕適量，別跟長輩硬撐。', expression: 'cheat', category: 'holiday' },
  { id: 'holiday-06', text: '中秋。', subtext: '月餅一顆可以，一盒不行。', expression: 'happy', category: 'holiday' },
  { id: 'holiday-07', text: '過年。', subtext: '家人夾菜很難拒，記比拒絕重要。', expression: 'cheat', category: 'holiday' },
  { id: 'holiday-08', text: '假期模式。', subtext: '睡飽、吃好、記著。', expression: 'sleepy', category: 'holiday' },
  { id: 'holiday-09', text: '國定假日。', subtext: '不用跟平日比，有記就好。', expression: 'happy', category: 'holiday' },
  { id: 'holiday-10', text: '連假最後一天。', subtext: '明天要上班，今晚別太瘋。', expression: 'eyeRoll', category: 'holiday' },
  { id: 'holiday-11', text: '節慶。', subtext: '人生需要這些日子，享受。', expression: 'normal', category: 'holiday' },
  { id: 'holiday-12', text: '假。', subtext: '放鬆，但別失憶。', expression: 'happy', category: 'holiday' },
],
  familyDinner: [
  { id: 'familyDinner-01', text: '家庭聚餐。', subtext: '去，記得記，別跟長輩解釋你在減肥。', expression: 'happy', category: 'familyDinner' },
  { id: 'familyDinner-02', text: '回家吃飯。', subtext: '媽媽的菜很難拒，記比拒絕實際。', expression: 'normal', category: 'familyDinner' },
  { id: 'familyDinner-03', text: '長輩夾菜。', subtext: '接住，記下來，明天正常吃。', expression: 'eyeRoll', category: 'familyDinner' },
  { id: 'familyDinner-04', text: '家族聚會。', subtext: '一年幾次，好好吃。', expression: 'cheat', category: 'familyDinner' },
  { id: 'familyDinner-05', text: '桌上有十道菜。', subtext: '每樣一點，不是每樣一碗。', expression: 'suspicious', category: 'familyDinner' },
  { id: 'familyDinner-06', text: '親戚問吃了沒。', subtext: '台灣式關心，吃給他們看。', expression: 'normal', category: 'familyDinner' },
  { id: 'familyDinner-07', text: '團圓飯。', subtext: '這種飯不能算熱量，算記憶。', expression: 'happy', category: 'familyDinner' },
  { id: 'familyDinner-08', text: '阿嬤說太瘦。', subtext: '微笑，夾菜，記錄。', expression: 'eyeRoll', category: 'familyDinner' },
  { id: 'familyDinner-09', text: '家庭日。', subtext: '享受，明天再健一點。', expression: 'normal', category: 'familyDinner' },
  { id: 'familyDinner-10', text: '回家。', subtext: '家的味道不用算太細。', expression: 'happy', category: 'familyDinner' },
  { id: 'familyDinner-11', text: '親戚聚會。', subtext: '社交也是生活，去。', expression: 'cheat', category: 'familyDinner' },
  { id: 'familyDinner-12', text: '一桌菜。', subtext: '選幾樣最想的，別每樣都掃。', expression: 'normal', category: 'familyDinner' },
],
  travel: [
  { id: 'travel-01', text: '出差。', subtext: '飯店早餐記得記，別只記咖啡。', expression: 'normal', category: 'travel' },
  { id: 'travel-02', text: '旅行中。', subtext: '鬆一點可以，完全放掉不行。', expression: 'happy', category: 'travel' },
  { id: 'travel-03', text: '在國外。', subtext: '當地美食要吃，記得記。', expression: 'cheat', category: 'travel' },
  { id: 'travel-04', text: '搭機。', subtext: '飛機餐也算，別假裝沒吃。', expression: 'tired', category: 'travel' },
  { id: 'travel-05', text: '飯店。', subtext: 'buffet 很誘人，拿一輪就好。', expression: 'normal', category: 'travel' },
  { id: 'travel-06', text: '觀光。', subtext: '走很多路，吃多一點也合理。', expression: 'happy', category: 'travel' },
  { id: 'travel-07', text: '時差。', subtext: '飲食亂正常，回來再調。', expression: 'sleepy', category: 'travel' },
  { id: 'travel-08', text: '旅途。', subtext: '記錄簡化版也行，有記就好。', expression: 'normal', category: 'travel' },
  { id: 'travel-09', text: '換環境。', subtext: '新地方容易吃多，正常。', expression: 'eyeRoll', category: 'travel' },
  { id: 'travel-10', text: '出差餐。', subtext: '應酬難免，記比拒絕重要。', expression: 'coffee', category: 'travel' },
  { id: 'travel-11', text: '旅行最後一天。', subtext: '回家後正常吃，別連續報復性節食。', expression: 'tired', category: 'travel' },
  { id: 'travel-12', text: '在路上。', subtext: '便利商店也是選項，記得選。', expression: 'normal', category: 'travel' },
],
  noExercise: [
  { id: 'noExercise-01', text: '今天不想動？', subtext: '看起來你快不行了。休息一下。明天再說。', expression: 'tired', category: 'noExercise' },
  { id: 'noExercise-02', text: '沒運動。', subtext: '一天不算，別自責。', expression: 'sleepy', category: 'noExercise' },
  { id: 'noExercise-03', text: '跳過。', subtext: '可以跳，別跳過吃飯。', expression: 'normal', category: 'noExercise' },
  { id: 'noExercise-04', text: '零運動。', subtext: '誠實記錄比假運動好。', expression: 'eyeRoll', category: 'noExercise' },
  { id: 'noExercise-05', text: '躺一天。', subtext: '偶爾可以，別變成週期。', expression: 'sleepy', category: 'noExercise' },
  { id: 'noExercise-06', text: '沒動。', subtext: '明天動十分鐘，今天算了。', expression: 'tired', category: 'noExercise' },
  { id: 'noExercise-07', text: '運動缺席。', subtext: '飲食還是要記。', expression: 'normal', category: 'noExercise' },
  { id: 'noExercise-08', text: '今天靜止。', subtext: '身體有時需要，聽它的。', expression: 'sleepy', category: 'noExercise' },
  { id: 'noExercise-09', text: '不練。', subtext: '沒關係，別連飲食都放掉。', expression: 'normal', category: 'noExercise' },
  { id: 'noExercise-10', text: 'Skip workout。', subtext: 'Skip 可以，別 skip 人生。', expression: 'eyeRoll', category: 'noExercise' },
  { id: 'noExercise-11', text: '動力歸零。', subtext: '休息也是計畫，明天再動。', expression: 'tired', category: 'noExercise' },
  { id: 'noExercise-12', text: '今天不動。', subtext: '記下來，比假裝有動誠實。', expression: 'sleepy', category: 'noExercise' },
],
  missedCheckin: [
  { id: 'missedCheckin-01', text: '昨天沒記。', subtext: '沒關係，今天記就好。', expression: 'normal', category: 'missedCheckin' },
  { id: 'missedCheckin-02', text: '漏了。', subtext: '人會漏，別漏太久。', expression: 'eyeRoll', category: 'missedCheckin' },
  { id: 'missedCheckin-03', text: '斷了。', subtext: '重新開始，不用解釋。', expression: 'normal', category: 'missedCheckin' },
  { id: 'missedCheckin-04', text: 'Streak 斷了。', subtext: '數字會歸零，習慣不會馬上消失。', expression: 'tired', category: 'missedCheckin' },
  { id: 'missedCheckin-05', text: '好幾天沒開。', subtext: '還好意思回來，歡迎。', expression: 'suspicious', category: 'missedCheckin' },
  { id: 'missedCheckin-06', text: '失聯。', subtext: '回來了就好，從今天開始。', expression: 'normal', category: 'missedCheckin' },
  { id: 'missedCheckin-07', text: '忘記打卡。', subtext: '忘記正常，現在補。', expression: 'eyeRoll', category: 'missedCheckin' },
  { id: 'missedCheckin-08', text: '空白幾天。', subtext: '過去了，今天記一筆。', expression: 'normal', category: 'missedCheckin' },
  { id: 'missedCheckin-09', text: '沒出現。', subtext: '生活會忙，理解，但別消失太久。', expression: 'tired', category: 'missedCheckin' },
  { id: 'missedCheckin-10', text: '回來了。', subtext: '不用道歉，直接記。', expression: 'happy', category: 'missedCheckin' },
  { id: 'missedCheckin-11', text: '漏打卡。', subtext: '一次不算，別因此放棄整週。', expression: 'normal', category: 'missedCheckin' },
  { id: 'missedCheckin-12', text: '中斷。', subtext: '重新開始比完美延續實際。', expression: 'normal', category: 'missedCheckin' },
],
  success: [
  { id: 'success-01', text: '很好。', subtext: '今天沒有再胖一點。只有再健一點。', expression: 'proud', category: 'success' },
  { id: 'success-02', text: '今天做得不錯。', subtext: '不用謙虛，可以認。', expression: 'happy', category: 'success' },
  { id: 'success-03', text: '穩。', subtext: '這種日子要記住。', expression: 'proud', category: 'success' },
  { id: 'success-04', text: '達標。', subtext: '小目標也算，別只盯大目標。', expression: 'happy', category: 'success' },
  { id: 'success-05', text: '可以。', subtext: '簡單兩字，分量很重。', expression: 'normal', category: 'success' },
  { id: 'success-06', text: '今天 OK。', subtext: 'OK 就夠了，不用完美。', expression: 'proud', category: 'success' },
  { id: 'success-07', text: '完成。', subtext: '關 app，去生活。', expression: 'happy', category: 'success' },
  { id: 'success-08', text: '你做到了。', subtext: '真的，做到了。', expression: 'proud', category: 'success' },
  { id: 'success-09', text: '今日勝利。', subtext: '低調的勝利，也是勝利。', expression: 'happy', category: 'success' },
  { id: 'success-10', text: '過關。', subtext: '明天繼續，今天先滿意。', expression: 'proud', category: 'success' },
  { id: 'success-11', text: '不錯的一天。', subtext: '這種日子累積起來很強。', expression: 'normal', category: 'success' },
  { id: 'success-12', text: '收。', subtext: '今天收工，明天再來。', expression: 'proud', category: 'success' },
],
  randomThoughts: [
  { id: 'randomThoughts-01', text: '你知道嗎。', subtext: '減肥最難的不是餓，是每天都要決定吃什麼。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-02', text: '突然想到。', subtext: '便利商店的飯糰有時比餐廳健康，世界很怪。', expression: 'eyeRoll', category: 'randomThoughts' },
  { id: 'randomThoughts-03', text: '話說。', subtext: '睡不飽會想吃甜的，別跟身體硬拗。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-04', text: '有個發現。', subtext: '你以為餓，其實可能是渴。', expression: 'suspicious', category: 'randomThoughts' },
  { id: 'randomThoughts-05', text: '冷知識。', subtext: '肌肉比脂肪重，秤不動不代表沒變。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-06', text: '講真的。', subtext: '完美飲食不存在，存在的是還在記錄的你。', expression: 'tired', category: 'randomThoughts' },
  { id: 'randomThoughts-07', text: '有沒有覺得。', subtext: '週日晚上特別想點外送，這是詛咒。', expression: 'eyeRoll', category: 'randomThoughts' },
  { id: 'randomThoughts-08', text: '突然。', subtext: '再健一點，不是再狠一點。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-09', text: '想說。', subtext: '能記錄的人，通常已經比一半的人認真了。', expression: 'happy', category: 'randomThoughts' },
  { id: 'randomThoughts-10', text: '你知道。', subtext: '壓力大時身體會想囤積，不是你的錯。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-11', text: '發現。', subtext: '看起來沒在減的時候，可能正在重組。', expression: 'suspicious', category: 'randomThoughts' },
  { id: 'randomThoughts-12', text: '話說回來。', subtext: '雞胸肉不是信仰，是選項之一。', expression: 'eyeRoll', category: 'randomThoughts' },
  { id: 'randomThoughts-13', text: '有件事。', subtext: '外食不是敵人，不記才是。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-14', text: '突然悟到。', subtext: '減肥不是懲罰，是調整。', expression: 'tired', category: 'randomThoughts' },
  { id: 'randomThoughts-15', text: '講個秘密。', subtext: '我也常不知道吃什麼，所以才做骰子。', expression: 'suspicious', category: 'randomThoughts' },
  { id: 'randomThoughts-16', text: '有沒有。', subtext: '有時候只是需要有人說「可以了」。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-17', text: '想到。', subtext: '熬夜隔天特別想吃，你不是一個人。', expression: 'sleepy', category: 'randomThoughts' },
  { id: 'randomThoughts-18', text: '說。', subtext: '記錄讓你有選擇，不是剝奪選擇。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-19', text: '冷靜。', subtext: '一頓大餐不會毀掉你，一週的放棄才會。', expression: 'eyeRoll', category: 'randomThoughts' },
  { id: 'randomThoughts-20', text: '突然。', subtext: '你還在這裡，這本身就值得。', expression: 'happy', category: 'randomThoughts' },
  { id: 'randomThoughts-21', text: '有個想法。', subtext: '身體需要時間，比你要的慢。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-22', text: '話說。', subtext: '咖啡不能當飯，但很多人試過。', expression: 'coffee', category: 'randomThoughts' },
  { id: 'randomThoughts-23', text: '發現。', subtext: '最難的是開始，第二難的是不消失。', expression: 'normal', category: 'randomThoughts' },
  { id: 'randomThoughts-24', text: '講。', subtext: '再健不是再狠，是再溫柔一點對自己。', expression: 'proud', category: 'randomThoughts' },
  { id: 'randomThoughts-25', text: '最後。', subtext: '今天不用完美，有在就好。', expression: 'normal', category: 'randomThoughts' },
],
}

export function getMessagesByCategory(category: MessageCategory): CharacterMessage[] {
  return CHARACTER_MESSAGES[category] ?? []
}

export function getAllMessages(): CharacterMessage[] {
  const fromCategories = Object.values(CHARACTER_MESSAGES).flat()
  const fromDice = Object.values(DICE_REROLL_MESSAGES).flat()
  return [...fromCategories, ...fromDice]
}

export function pickCharacterMessage(category: MessageCategory, salt = ''): CharacterMessage {
  const pool = getMessagesByCategory(category)
  if (!pool.length) {
    return { id: 'fallback', text: '照著做就好。', expression: 'normal', category }
  }
  const key = `${category}:${salt}:${new Date().toDateString()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}

export function getDiceRollTier(rollCount: number): DiceRollTier {
  if (rollCount >= 50) return 'fiftieth'
  if (rollCount >= 30) return 'thirtieth'
  if (rollCount >= 20) return 'twentieth'
  if (rollCount >= 10) return 'tenth'
  if (rollCount >= 5) return 'fifth'
  if (rollCount >= 3) return 'third'
  if (rollCount >= 2) return 'second'
  return 'first'
}

export function pickDiceRerollMessage(rollCount: number): CharacterMessage {
  const tier = getDiceRollTier(rollCount)
  const pool = DICE_REROLL_MESSAGES[tier]
  const key = `dice:${rollCount}:${new Date().toDateString()}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return pool[Math.abs(hash) % pool.length]
}

export function formatMessageWithExpression(msg: CharacterMessage): string {
  const emoji = EXPRESSION_EMOJI[msg.expression]
  return msg.subtext ? `${emoji} ${msg.text} ${msg.subtext}` : `${emoji} ${msg.text}`
}

export const TOTAL_MESSAGE_COUNT: number = getAllMessages().length
