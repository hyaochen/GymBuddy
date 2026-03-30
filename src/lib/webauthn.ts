const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
const hostname = new URL(appUrl).hostname

export const rpName = "GymBuddy"
export const rpID = process.env.WEBAUTHN_RP_ID || hostname
export const origin = appUrl
