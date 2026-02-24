import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// All verified direct URLs from upload.wikimedia.org via Wikimedia Commons API
const EQUIPMENT_IMAGES: Record<string, string> = {
  // ID → imageUrl
  'cmlzdca7w000011jln64nuh8z': 'https://upload.wikimedia.org/wikipedia/commons/8/85/Olympic_barbell.jpg', // Olympic Barbell
  'cmlzdca7z000111jlg3bb5f2c': 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Ez-bar-curl-1.gif',  // EZ Bar
  'cmlzdca80000211jlowx6r935': 'https://upload.wikimedia.org/wikipedia/commons/b/be/Dumbbell.JPG',        // Dumbbells
  'cmlzdca82000311jl4vi8juwl': 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Weight_plate.jpg',    // Weight Plates
  'cmlzdca85000511jlhqfjyb1k': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/ShoulderPressMachineExercise.JPG', // Shoulder Press Machine
  'cmlzdca86000611jlktk9s0am': 'https://upload.wikimedia.org/wikipedia/commons/f/f8/PulldownMachineExercise.JPG',      // Lat Pulldown Machine
  'cmlzdca89000811jl16vcjq9i': 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Leg_press.jpg',       // Leg Press Machine
  'cmlzdca8a000911jlj94r1emm': 'https://upload.wikimedia.org/wikipedia/commons/c/c6/LyingLegCurlMachineExercise.JPG', // Leg Curl Machine
  'cmlzdca8c000a11jlszl6p099': 'https://upload.wikimedia.org/wikipedia/commons/3/36/LegExtensionMachineExercise.JPG',  // Leg Extension Machine
  'cmlzdca8d000b11jlt9uzb4uv': 'https://upload.wikimedia.org/wikipedia/commons/d/dd/HackSquatMachineExercise.JPG',     // Hack Squat Machine
  'cmlzdca8h000e11jldeu03zct': 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Smith_machine.GIF',   // Smith Machine
  'cmlzdca8k000g11jl1dl8nkd8': 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Personal_Training_at_a_Gym_-_Cable_Crossover.JPG', // Cable Machine
  'cmlzdca8l000h11jlxnxmkcxj': 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Personal_Training_at_a_Gym_-_Cable_Crossover.JPG', // Cable Crossover
  'cmlzdca8m000i11jl9kb8bp0t': 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Power_Rack.JPG',      // Power Rack
  'cmlzdca8o000j11jlz8t9iu2s': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Bench_press.jpg',     // Flat Bench
  'cmlzdca8p000k11jlnfyua5m0': 'https://upload.wikimedia.org/wikipedia/commons/1/14/Incline-bench-press-2.png', // Incline Bench
  'cmlzdca8q000l11jlu8sy8ttv': 'https://upload.wikimedia.org/wikipedia/commons/5/57/Bench_press.jpg',     // Decline Bench (same bench image)
  'cmlzdca8r000m11jl8mz2ntz0': 'https://upload.wikimedia.org/wikipedia/commons/8/89/Dips.jpg',            // Dip/Pull-up Station
}

async function main() {
  console.log('Updating equipment images...')
  let updated = 0

  for (const [id, imageUrl] of Object.entries(EQUIPMENT_IMAGES)) {
    const eq = await prisma.equipment.update({
      where: { id },
      data: { imageUrl },
      select: { name: true },
    })
    console.log(`  ✓ ${eq.name}`)
    updated++
  }

  console.log(`\nDone. Updated ${updated} equipment records.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
