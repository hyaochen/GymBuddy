import sharp from 'sharp'
import path from 'path'

const sizes = [192, 512]
const outDir = path.resolve(__dirname, '../public')

async function generateIcon(size: number) {
    const fontSize = Math.round(size * 0.35)
    const subtitleSize = Math.round(size * 0.1)
    const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1"/>
          <stop offset="100%" style="stop-color:#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
      <text x="50%" y="45%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="900" font-size="${fontSize}"
            fill="white" letter-spacing="-2">GB</text>
      <text x="50%" y="72%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="600" font-size="${subtitleSize}"
            fill="rgba(255,255,255,0.8)">GymBuddy</text>
    </svg>`

    await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(outDir, `icon-${size}.png`))

    console.log(`✅ icon-${size}.png`)
}

async function generateFavicon() {
    const svg = `
    <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1"/>
          <stop offset="100%" style="stop-color:#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="url(#bg)"/>
      <text x="50%" y="55%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="900" font-size="14"
            fill="white">GB</text>
    </svg>`

    await sharp(Buffer.from(svg))
        .png()
        .toFile(path.join(outDir, 'favicon.png'))

    // Also create apple-touch-icon (180x180)
    const appleSvg = `
    <svg width="180" height="180" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#6366F1"/>
          <stop offset="100%" style="stop-color:#8B5CF6"/>
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="32" fill="url(#bg)"/>
      <text x="50%" y="45%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="900" font-size="64"
            fill="white" letter-spacing="-2">GB</text>
      <text x="50%" y="72%" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="600" font-size="18"
            fill="rgba(255,255,255,0.8)">GymBuddy</text>
    </svg>`

    await sharp(Buffer.from(appleSvg))
        .png()
        .toFile(path.join(outDir, 'apple-touch-icon.png'))

    console.log('✅ favicon.png + apple-touch-icon.png')
}

async function main() {
    for (const size of sizes) {
        await generateIcon(size)
    }
    await generateFavicon()
    console.log('Done!')
}

main()
