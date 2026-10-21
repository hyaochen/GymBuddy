// 暱稱與帳號辨識規則（註冊、Google 建帳共用）

const NICKNAME_MIN = 2
const NICKNAME_MAX = 20
// eslint-disable-next-line no-control-regex
const NICKNAME_FORBIDDEN = /[\/?#%\@\u0000-\u001f\u007f-\u009f]/

/** 回傳錯誤訊息；通過回傳 null。呼叫前請先 trim。 */
export function validateNickname(name: string): string | null {
    if (!name || !name.trim()) return "暱稱不可為空白"
    if ([...name].length < NICKNAME_MIN || [...name].length > NICKNAME_MAX) {
        return `暱稱長度需為 ${NICKNAME_MIN} 至 ${NICKNAME_MAX} 個字`
    }
    if (NICKNAME_FORBIDDEN.test(name)) {
        return "暱稱不可包含 / ? # % \ @ 或控制字元"
    }
    return null
}

/** 把任意字串（如 Google 顯示名稱）轉成符合規則的暱稱基底 */
export function sanitizeNickname(raw: string | null | undefined, fallback: string): string {
    const cleaned = [...(raw ?? "").replace(new RegExp(NICKNAME_FORBIDDEN.source, "g"), "").trim()]
        .slice(0, NICKNAME_MAX)
        .join("")
        .trim()
    return validateNickname(cleaned) === null ? cleaned : fallback
}

/** 登入識別字：含 @ 視為 email，否則視為暱稱，兩個命名空間不混比 */
export function isEmailIdentifier(identifier: string): boolean {
    return identifier.includes("@")
}
