import { describe, it, expect } from 'vitest'
import { signSession, verifySession } from '../lib/session'

describe('Session Token (HMAC-SHA256)', () => {
    // ─── 正常流程 ───
    it('sign → verify 成功取回 payload', async () => {
        const payload = { userId: 'user123', issuedAt: Date.now() }
        const token = await signSession(payload)
        const result = await verifySession(token)
        expect(result).not.toBeNull()
        expect(result!.userId).toBe('user123')
        expect(result!.issuedAt).toBe(payload.issuedAt)
    })

    it('token 格式為 base64url.base64url', async () => {
        const token = await signSession({ userId: 'test', issuedAt: 1 })
        expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
        // 不含 +, /, = (base64url 規範)
        expect(token).not.toMatch(/[+/=]/)
    })

    // ─── 篡改偵測 ───
    it('篡改 payload → 驗證失敗', async () => {
        const token = await signSession({ userId: 'user123', issuedAt: Date.now() })
        const [, sig] = token.split('.')
        // 替換 payload 為另一個用戶
        const fakePayload = btoa(JSON.stringify({ userId: 'hacker', issuedAt: Date.now() }))
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
        const tampered = `${fakePayload}.${sig}`
        const result = await verifySession(tampered)
        expect(result).toBeNull()
    })

    it('篡改 signature → 驗證失敗', async () => {
        const token = await signSession({ userId: 'user123', issuedAt: Date.now() })
        const [payload] = token.split('.')
        const tampered = `${payload}.fakesignaturehere`
        const result = await verifySession(tampered)
        expect(result).toBeNull()
    })

    // ─── 無效輸入 ───
    it('null token → null', async () => {
        expect(await verifySession(null)).toBeNull()
    })

    it('undefined token → null', async () => {
        expect(await verifySession(undefined)).toBeNull()
    })

    it('空字串 → null', async () => {
        expect(await verifySession('')).toBeNull()
    })

    it('無 dot 的字串 → null', async () => {
        expect(await verifySession('nodothere')).toBeNull()
    })

    it('只有 dot 的字串 → null', async () => {
        expect(await verifySession('.')).toBeNull()
    })

    it('亂碼 → null（不 crash）', async () => {
        expect(await verifySession('abc.def')).toBeNull()
        expect(await verifySession('!!!.@@@')).toBeNull()
    })

    // ─── Payload 完整性 ───
    it('payload 缺少 userId → null', async () => {
        // 手動建立一個沒有 userId 的 token
        const payload = { issuedAt: Date.now() } as any
        const token = await signSession(payload)
        const result = await verifySession(token)
        // signSession 不做驗證，但 verifySession 檢查 userId
        expect(result).toBeNull()
    })

    // ─── 過期檢查 ───
    it('30 天內的 token → 驗證成功', async () => {
        const payload = { userId: 'user1', issuedAt: Date.now() - 29 * 24 * 60 * 60 * 1000 }
        const token = await signSession(payload)
        const result = await verifySession(token)
        expect(result).not.toBeNull()
    })

    it('超過 30 天的 token → 驗證失敗（過期）', async () => {
        const payload = { userId: 'user1', issuedAt: Date.now() - 31 * 24 * 60 * 60 * 1000 }
        const token = await signSession(payload)
        const result = await verifySession(token)
        expect(result).toBeNull()
    })

    // ─── 一致性 ───
    it('同 payload 多次簽名 → token 相同（deterministic）', async () => {
        const payload = { userId: 'user1', issuedAt: 1000 }
        const t1 = await signSession(payload)
        const t2 = await signSession(payload)
        expect(t1).toBe(t2)
    })

    it('不同 payload → 不同 token', async () => {
        const t1 = await signSession({ userId: 'user1', issuedAt: 1 })
        const t2 = await signSession({ userId: 'user2', issuedAt: 1 })
        expect(t1).not.toBe(t2)
    })
})
