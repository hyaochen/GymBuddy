// Uses Web Crypto API (crypto.subtle) - compatible with both Edge and Node.js runtimes

export type SessionPayload = {
    userId: string;
    issuedAt: number;
};

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production";
const encoder = new TextEncoder();

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let str = "";
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(str: string): ArrayBuffer {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (padded.length % 4)) % 4);
    const binary = atob(padded + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer as ArrayBuffer;
}

async function getKey(): Promise<CryptoKey> {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}

export async function signSession(payload: SessionPayload): Promise<string> {
    const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
    const key = await getKey();
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payloadB64));
    return `${payloadB64}.${toBase64Url(sig)}`;
}

export async function verifySession(token?: string | null): Promise<SessionPayload | null> {
    if (!token) return null;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;
    const payloadB64 = token.slice(0, dotIdx);
    const sigB64 = token.slice(dotIdx + 1);
    if (!payloadB64 || !sigB64) return null;
    try {
        const key = await getKey();
        const sigBuf = fromBase64Url(sigB64);
        const valid = await crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(payloadB64));
        if (!valid) return null;
        const payloadBuf = fromBase64Url(payloadB64);
        const payload = JSON.parse(new TextDecoder().decode(payloadBuf)) as SessionPayload;
        if (!payload.userId) return null;
        return payload;
    } catch {
        return null;
    }
}
