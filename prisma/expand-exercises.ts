import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Equipment IDs
const EQ = {
  BW: 'cmlzdca8x000q11jlbooyr2a1',
  CCross: 'cmlzdca8l000h11jlxnxmkcxj',
  Cable: 'cmlzdca8k000g11jl1dl8nkd8',
  ChestPress: 'cmlzdca83000411jly6zsxcbi',
  DeclineBench: 'cmlzdca8q000l11jlu8sy8ttv',
  DipStation: 'cmlzdca8r000m11jl8mz2ntz0',
  DB: 'cmlzdca80000211jlowx6r935',
  EZBar: 'cmlzdca7z000111jlg3bb5f2c',
  FlatBench: 'cmlzdca8o000j11jlz8t9iu2s',
  HackSquat: 'cmlzdca8d000b11jlt9uzb4uv',
  HipThrustM: 'cmlzdca8i000f11jl07v60kr9',
  InclineBench: 'cmlzdca8p000k11jlnfyua5m0',
  LatPulldown: 'cmlzdca86000611jlktk9s0am',
  LegCurl: 'cmlzdca8a000911jlj94r1emm',
  LegExt: 'cmlzdca8c000a11jlszl6p099',
  LegPress: 'cmlzdca89000811jl16vcjq9i',
  Barbell: 'cmlzdca7w000011jln64nuh8z',
  PecDeck: 'cmlzdca8e000c11jl0q6b7cd8',
  PowerRack: 'cmlzdca8m000i11jl9kb8bp0t',
  PreacherCurl: 'cmlzdca8g000d11jl30ijkjv8',
  SeatedRow: 'cmlzdca88000711jlvm0oupf6',
  ShoulderPressM: 'cmlzdca85000511jlhqfjyb1k',
  Smith: 'cmlzdca8h000e11jldeu03zct',
  WeightPlates: 'cmlzdca82000311jl4vi8juwl',
}

// Muscle Group IDs
const MG = {
  Triceps: 'cmlzdca9c001111jl9matn1ld',
  UpperChest: 'cmlzdca90000s11jl07tslweq',
  Biceps: 'cmlzdca9a001011jl5eedh5bc',
  LateralDelt: 'cmlzdca99000z11jlrh9smtvw',
  AnteriorDelt: 'cmlzdca98000y11jlnqcnzqmp',
  Forearms: 'cmlzdca9d001211jlezlnzpzb',
  Calves: 'cmlzdca9i001611jl7q1lxh7d',
  RearDelt: 'cmlzdca95000w11jls9zw8kcl',
  Traps: 'cmlzdca94000v11jlifmevsus',
  Quads: 'cmlzdca9f001311jlotbdumke',
  Lats: 'cmlzdca91000t11jlopv0hyy9',
  Pecs: 'cmlzdca8y000r11jlwjmm82t4',
  Hamstrings: 'cmlzdca9g001411jluxl2qvyp',
  Obliques: 'cmlzdca9l001811jlizh5wp8q',
  Abs: 'cmlzdca9k001711jlhijqumsi',
  Glutes: 'cmlzdca9h001511jlvduyiahb',
  Rhomboids: 'cmlzdca93000u11jlpb2nfjlj',
  Erectors: 'cmlzdca97000x11jl65q9fkg5',
  HipFlexors: 'cmlzdca9n001911jl60q9rwpm',
}

// --- Step 1: Update GIF URLs for existing exercises ---
const GIF_UPDATES: Record<string, string> = {
  'cmlzdca9o001a11jl6e68w6k8': 'https://wger.de/media/exercise-images/192/Bench-press-1.png',          // 槓鈴臥推
  'cmlzdcaa2001b11jljh08hwvo': 'https://wger.de/media/exercise-images/41/Incline-bench-press-1.png',    // 上斜槓鈴臥推
  'cmlzdcaba001h11jlw4qesrqg': 'https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png', // 槓鈴肩推
  'cmlzdcacs001o11jl81sagr15': 'https://wger.de/media/exercise-images/181/Chin-ups-2.png',              // 引體向上
  'cmlzdcadf001r11jlj17yojvy': 'https://wger.de/media/exercise-images/110/Reverse-grip-bent-over-rows-1.png', // 槓鈴划船
  'cmlzdcacf001n11jl27x9zqhe': 'https://wger.de/media/exercise-images/161/Dead-lifts-2.png',            // 硬舉
  'cmlzdcae5001v11jlx20nwifb': 'https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg', // 槓鈴深蹲
  'cmlzdcael001x11jlvcwa15nv': 'https://wger.de/media/exercise-images/161/Dead-lifts-2.png',            // 羅馬尼亞硬舉
  'cmlzzvv8x0001pddr37fi77sa': 'https://wger.de/media/exercise-images/1614/7f3cfae2-e062-4211-9a6b-5a10851ce7f4.jpg', // 臀推
  'cmlzdcabx001k11jlx8f4vj9f': 'https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png', // 纜繩三頭下壓
  'cmlzzvv900002pddrut303r65': 'https://wger.de/media/exercise-images/81/Biceps-curl-1.png',            // 啞鈴彎舉
  'cmlzdcadp001s11jledg98qnn': 'https://wger.de/media/exercise-images/1732/d13b9adb-968e-4f73-95e6-b16690bcf616.jpg', // 臉拉
  'cmlzzvv8s0000pddrjfqdn4ul': 'https://wger.de/media/exercise-images/1593/9815fcd6-cf40-4ddd-9b38-2eac25973de1.gif', // 保加利亞分腿蹲
}

// --- Step 2: New exercises to create ---
interface NewExercise {
  name: string
  description: string
  gifUrl?: string
  stepInstructions: string[]
  equipment: string[]
  primaryMuscles: string[]
  secondaryMuscles: string[]
}

const NEW_EXERCISES: NewExercise[] = [
  // ===== CHEST =====
  {
    name: '下斜槓鈴臥推 Decline Barbell Bench Press',
    description: '在下斜凳上進行槓鈴臥推，重點刺激下胸肌',
    gifUrl: 'https://wger.de/media/exercise-images/1583/2dc7de5d-9d26-42aa-93c6-b07f6cff1888.jpg',
    stepInstructions: [
      '在下斜凳上固定雙腿，仰躺，背部貼緊凳面',
      '雙手握槓，比肩略寬，從架上取下槓鈴',
      '緩慢下放至下胸附近，感受胸肌拉伸',
      '有力推起，恢復初始位置',
      '全程核心收緊，保持穩定',
    ],
    equipment: [EQ.DeclineBench, EQ.Barbell, EQ.WeightPlates],
    primaryMuscles: [MG.Pecs],
    secondaryMuscles: [MG.Triceps, MG.AnteriorDelt],
  },
  {
    name: '上斜啞鈴臥推 Incline Dumbbell Press',
    description: '在上斜凳上進行啞鈴推胸，強調上胸與前三角肌',
    gifUrl: 'https://wger.de/media/exercise-images/23/Dumbbell-Incline-press-1.png',
    stepInstructions: [
      '上斜凳調整至30-45度，仰躺並雙手持啞鈴',
      '啞鈴置於肩膀上方，掌心朝前',
      '緩慢下放至上胸兩側，感受拉伸',
      '用力推起，於頂部不要鎖死手肘',
      '全程控制動作節奏',
    ],
    equipment: [EQ.InclineBench, EQ.DB],
    primaryMuscles: [MG.UpperChest],
    secondaryMuscles: [MG.Pecs, MG.Triceps, MG.AnteriorDelt],
  },
  {
    name: '繩索飛鳥 Cable Crossover Fly',
    description: '使用纜繩交叉機進行胸部飛鳥，全程張力恆定',
    gifUrl: 'https://wger.de/media/exercise-images/23/Cable-crossover-1.png',
    stepInstructions: [
      '站於纜繩交叉機中間，雙手各持一端握把',
      '微微前傾，雙臂向兩側展開，保持微彎',
      '雙臂向前方夾合，感受胸部收縮',
      '緩慢還原，感受拉伸',
      '可調整高低滑輪以刺激不同胸部區域',
    ],
    equipment: [EQ.CCross],
    primaryMuscles: [MG.Pecs],
    secondaryMuscles: [MG.UpperChest, MG.AnteriorDelt],
  },
  // ===== BACK =====
  {
    name: '單臂啞鈴划船 Single-arm Dumbbell Row',
    description: '以平板凳支撐進行單側啞鈴划船，有效孤立背闊肌',
    gifUrl: 'https://wger.de/media/exercise-images/23/Dumbbell-one-arm-bent-over-row-1.png',
    stepInstructions: [
      '一手一腳支撐於平板凳上，身體平行地面',
      '另一手持啞鈴自然下垂',
      '肘關節引導，將啞鈴拉向髖部側方',
      '頂峰收縮背闊肌，緩慢放下',
      '兩側各完成指定組數',
    ],
    equipment: [EQ.DB, EQ.FlatBench],
    primaryMuscles: [MG.Lats],
    secondaryMuscles: [MG.Rhomboids, MG.RearDelt, MG.Biceps],
  },
  {
    name: '直臂下拉 Straight-arm Lat Pulldown',
    description: '使用繩索機，雙臂伸直下拉，孤立背闊肌',
    stepInstructions: [
      '站於高位滑輪前，雙手持寬握把，手臂幾乎伸直',
      '輕微前傾，核心收緊',
      '保持手臂伸直，將握把向下拉至大腿前方',
      '頂峰收縮背闊肌，緩慢還原',
      '全程手臂保持伸直，避免彎肘',
    ],
    equipment: [EQ.Cable],
    primaryMuscles: [MG.Lats],
    secondaryMuscles: [MG.Triceps, MG.RearDelt],
  },
  {
    name: '寬距引體向上 Wide-grip Pull-up',
    description: '寬握距引體向上，更強調背闊肌的拉伸與收縮',
    gifUrl: 'https://wger.de/media/exercise-images/181/Chin-ups-2.png',
    stepInstructions: [
      '雙手握槓，比肩更寬，正握（掌心朝外）',
      '手臂完全伸展，雙腳離地',
      '核心收緊，以背闊肌的力量拉起身體',
      '拉至下巴過槓或鎖骨觸槓',
      '緩慢下放至手臂完全伸展',
    ],
    equipment: [EQ.DipStation],
    primaryMuscles: [MG.Lats],
    secondaryMuscles: [MG.Rhomboids, MG.Biceps, MG.RearDelt],
  },
  {
    name: 'T槓划船 T-bar Row',
    description: '使用T槓或槓鈴角落固定進行划船，有效增厚背部',
    stepInstructions: [
      '槓鈴一端插入角落固定，另一端套上槓片',
      '雙腿跨槓而站，俯身約45度，雙手握槓末端',
      '以肘關節引導，將槓向腹部拉起',
      '頂峰收縮背部，感受菱形肌與背闊肌擠壓',
      '緩慢放下，保持背部平直',
    ],
    equipment: [EQ.Barbell, EQ.WeightPlates],
    primaryMuscles: [MG.Rhomboids],
    secondaryMuscles: [MG.Lats, MG.Traps, MG.Biceps],
  },
  // ===== SHOULDERS =====
  {
    name: '啞鈴肩推 Dumbbell Shoulder Press',
    description: '坐姿或站姿啞鈴肩推，允許更自由的動作軌跡',
    gifUrl: 'https://wger.de/media/exercise-images/23/Dumbbell-shoulder-press-1.png',
    stepInstructions: [
      '坐於有靠背的凳子上，雙手持啞鈴置於肩膀高度',
      '掌心朝前，上臂平行地面',
      '向上推起，於頭頂上方不完全鎖死手肘',
      '緩慢下放至起始位置',
      '全程保持核心收緊，避免腰部過度挺起',
    ],
    equipment: [EQ.DB, EQ.FlatBench],
    primaryMuscles: [MG.AnteriorDelt],
    secondaryMuscles: [MG.LateralDelt, MG.Triceps, MG.Traps],
  },
  {
    name: '阿諾德推舉 Arnold Press',
    description: '結合旋轉動作的啞鈴肩推，全面刺激三角肌各頭',
    stepInstructions: [
      '坐姿，雙手持啞鈴，掌心朝向自己置於肩膀高度',
      '推起時同時旋轉手腕，使掌心最終朝向前方',
      '在頂部啞鈴接近但不碰觸',
      '下放時同樣旋轉還原至掌心朝向自己',
      '動作全程流暢，不要猛力推舉',
    ],
    equipment: [EQ.DB],
    primaryMuscles: [MG.AnteriorDelt],
    secondaryMuscles: [MG.LateralDelt, MG.RearDelt, MG.Triceps],
  },
  {
    name: '繩索側平舉 Cable Lateral Raise',
    description: '使用低位繩索進行側平舉，提供持續張力',
    stepInstructions: [
      '站於低位繩索機側方，對側手抓握繩索',
      '另一手扶住機器保持穩定',
      '身體保持直立，手臂微彎',
      '將繩索側向拉至與肩同高，感受側三角肌收縮',
      '緩慢下放，全程控制張力',
    ],
    equipment: [EQ.Cable],
    primaryMuscles: [MG.LateralDelt],
    secondaryMuscles: [MG.Traps, MG.RearDelt],
  },
  {
    name: '俯身啞鈴飛鳥 Bent-over Rear Delt Fly',
    description: '俯身姿態進行啞鈴飛鳥，主要訓練後三角肌',
    stepInstructions: [
      '坐於凳邊或站姿，前傾至幾乎平行地面',
      '雙手持輕啞鈴，手臂微彎垂於地面',
      '雙臂向兩側展開，引導後三角肌收縮',
      '雙臂抬至與肩同高，保持短暫收縮',
      '緩慢下放，感受後三角肌拉伸',
    ],
    equipment: [EQ.DB],
    primaryMuscles: [MG.RearDelt],
    secondaryMuscles: [MG.Rhomboids, MG.Traps],
  },
  // ===== BICEPS =====
  {
    name: '斜板彎舉 Preacher Curl',
    description: '使用牧師椅固定上臂，孤立訓練二頭肌',
    stepInstructions: [
      '坐於牧師椅，上臂緊靠斜板，雙手握EZ槓或啞鈴',
      '手臂完全伸展為起始位置',
      '以二頭肌力量將槓鈴彎舉至最高點',
      '頂峰收縮後緩慢放下至完全伸展',
      '避免讓手臂自由落下，全程控制',
    ],
    equipment: [EQ.PreacherCurl, EQ.EZBar],
    primaryMuscles: [MG.Biceps],
    secondaryMuscles: [MG.Forearms],
  },
  {
    name: '集中彎舉 Concentration Curl',
    description: '坐姿以肘靠腿固定，極度孤立二頭肌',
    stepInstructions: [
      '坐於凳上，雙腿分開，持啞鈴一手肘靠於大腿內側',
      '上臂固定不動，以二頭肌將啞鈴彎起',
      '彎至最高點時旋轉手腕（小指朝外），增加峰值收縮',
      '緩慢下放至完全伸展',
      '兩側分別完成全部組數',
    ],
    equipment: [EQ.DB],
    primaryMuscles: [MG.Biceps],
    secondaryMuscles: [MG.Forearms],
  },
  // ===== TRICEPS =====
  {
    name: '頭頂三頭伸展 Overhead Tricep Extension',
    description: '在頭頂上方進行三頭伸展，有效拉伸長頭',
    gifUrl: 'https://wger.de/media/exercise-images/23/Seated-dumbbell-overhead-extension-1.png',
    stepInstructions: [
      '坐姿或站姿，雙手捧住一個啞鈴置於頭頂後方',
      '上臂緊貼耳朵保持固定，只移動前臂',
      '伸展手臂，將啞鈴推至頭頂上方',
      '緩慢彎曲手臂下放，感受三頭長頭拉伸',
      '也可使用繩索高位進行單手版本',
    ],
    equipment: [EQ.DB],
    primaryMuscles: [MG.Triceps],
    secondaryMuscles: [],
  },
  {
    name: '窄距臥推 Close-grip Bench Press',
    description: '窄握距槓鈴臥推，將重心轉移至三頭肌',
    stepInstructions: [
      '仰躺於平板凳，雙手握槓比肩窄（約與肩同寬或略窄）',
      '從架上取下槓鈴，緩慢下放至下胸',
      '保持手肘靠近身體兩側',
      '有力推起，感受三頭肌收縮',
      '全程保持手腕中立，避免向外扭轉',
    ],
    equipment: [EQ.Barbell, EQ.FlatBench],
    primaryMuscles: [MG.Triceps],
    secondaryMuscles: [MG.Pecs, MG.AnteriorDelt],
  },
  // ===== LEGS =====
  {
    name: '跨步蹲 Lunges',
    description: '前跨步蹲，同時訓練股四頭肌、臀大肌與腘繩肌',
    stepInstructions: [
      '站立，雙手持啞鈴或空手',
      '一腳大步向前跨出，前膝彎曲至約90度',
      '後膝幾乎觸地但不著地',
      '以前腳發力推起，回到起始位置',
      '交替雙腳或完成單腿所有組數後換邊',
    ],
    equipment: [EQ.DB, EQ.BW],
    primaryMuscles: [MG.Quads],
    secondaryMuscles: [MG.Glutes, MG.Hamstrings],
  },
  {
    name: '前蹲 Front Squat',
    description: '槓鈴置於前方的深蹲變體，更強調股四頭肌與核心',
    stepInstructions: [
      '槓鈴置於深蹲架，調至鎖骨高度',
      '雙手交叉或正握槓，使槓置於前三角肌上方',
      '腳與肩同寬，腳尖微外，下蹲保持軀幹直立',
      '蹲至大腿平行地面或更低',
      '以腳掌全力蹬地站起，全程保持背脊中立',
    ],
    equipment: [EQ.Barbell, EQ.PowerRack],
    primaryMuscles: [MG.Quads],
    secondaryMuscles: [MG.Glutes, MG.Abs, MG.Erectors],
  },
  {
    name: '臀橋 Glute Bridge',
    description: '仰躺進行臀部抬起，有效訓練臀大肌',
    stepInstructions: [
      '仰躺，雙膝彎曲腳踩地，雙臂置於身體兩側',
      '可在大腿根部放槓鈴增加重量',
      '以臀部發力將臀部抬起，使身體從肩到膝成一直線',
      '頂端收縮臀部2秒',
      '緩慢下放但不完全著地，接續下一下',
    ],
    equipment: [EQ.BW],
    primaryMuscles: [MG.Glutes],
    secondaryMuscles: [MG.Hamstrings],
  },
  {
    name: '坐姿腿彎舉 Seated Leg Curl',
    description: '坐姿腿彎舉機，更好地拉伸腘繩肌近端',
    stepInstructions: [
      '坐於坐姿腿彎舉機，調整墊子位置至腳踝後方',
      '大腿緊壓座墊，背部直立',
      '以腘繩肌力量將重量向下彎曲',
      '彎至最大限度，收縮1秒',
      '緩慢還原，全程控制重量',
    ],
    equipment: [EQ.LegCurl],
    primaryMuscles: [MG.Hamstrings],
    secondaryMuscles: [MG.Calves],
  },
  {
    name: '繩索臀踢腿 Cable Kickback',
    description: '以繩索進行後踢腿，孤立訓練臀大肌',
    stepInstructions: [
      '在低位繩索上套腳踝固定器，套於欲訓練腿的腳踝',
      '面向機器站立，雙手扶握把保持穩定',
      '核心收緊，以臀大肌發力將腿向後伸',
      '後伸至臀部完全收縮，停頓1秒',
      '緩慢還原，不要用甩的方式完成動作',
    ],
    equipment: [EQ.Cable],
    primaryMuscles: [MG.Glutes],
    secondaryMuscles: [MG.Hamstrings],
  },
  {
    name: '哈克深蹲 Hack Squat Machine',
    description: '使用哈克深蹲機進行固定軌跡深蹲，強調股四頭肌',
    gifUrl: 'https://wger.de/media/exercise-images/23/Hack-squat-1.png',
    stepInstructions: [
      '站於哈克深蹲機踏板，背靠墊，肩膀置於墊下',
      '雙腳與肩同寬，腳尖微外，解除安全鎖',
      '緩慢彎膝下蹲，至大腿平行或更低',
      '以腳掌全力推起，不要鎖死膝蓋',
      '完成組數後重新上鎖安全機構',
    ],
    equipment: [EQ.HackSquat],
    primaryMuscles: [MG.Quads],
    secondaryMuscles: [MG.Glutes, MG.Hamstrings],
  },
  // ===== CORE =====
  {
    name: '懸掛舉腿 Hanging Leg Raise',
    description: '懸掛於引體向上架進行舉腿，高效訓練下腹與髖屈肌',
    stepInstructions: [
      '雙手抓握引體向上架，身體懸空',
      '核心收緊，避免身體搖擺',
      '以腹部發力將雙腿抬起至與地面平行或更高',
      '頂峰保持1秒，感受腹部收縮',
      '緩慢放下，不要讓身體借力搖擺',
    ],
    equipment: [EQ.DipStation],
    primaryMuscles: [MG.Abs],
    secondaryMuscles: [MG.HipFlexors, MG.Obliques],
  },
  {
    name: '側棒式 Side Plank',
    description: '側向支撐棒式，重點訓練腹斜肌與核心穩定性',
    stepInstructions: [
      '側躺，以一側前臂撐地，手肘在肩膀正下方',
      '雙腳疊放，身體從頭到腳呈一直線',
      '臀部抬起，保持身體平直',
      '可在臀部上方放重量或抬起上方腿增加難度',
      '兩側各保持指定時間',
    ],
    equipment: [EQ.BW],
    primaryMuscles: [MG.Obliques],
    secondaryMuscles: [MG.Abs],
  },
  {
    name: '反向捲腹 Reverse Crunch',
    description: '仰躺進行下腹捲腹，強調下腹部收縮',
    stepInstructions: [
      '仰躺，雙手置於身體兩側，掌心向下',
      '雙腿彎曲抬起至大腿與地面垂直',
      '以腹部發力，將臀部從地面捲起，膝蓋向胸部靠近',
      '頂端收縮腹部，緩慢下放',
      '避免用腿部甩動的力量完成動作',
    ],
    equipment: [EQ.BW],
    primaryMuscles: [MG.Abs],
    secondaryMuscles: [MG.HipFlexors],
  },
  {
    name: '坐姿提踵 Seated Calf Raise',
    description: '坐姿進行小腿抬起，更有效地訓練比目魚肌',
    stepInstructions: [
      '坐於腿推機或將槓鈴置於膝蓋上，腳掌前端踩於墊子上',
      '以最大範圍下放腳跟（充分拉伸小腿）',
      '以小腿肌肉發力，將腳跟抬至最高點',
      '頂端保持1秒，緩慢下放',
      '全程保持動作節奏，感受比目魚肌的工作',
    ],
    equipment: [EQ.LegPress],
    primaryMuscles: [MG.Calves],
    secondaryMuscles: [],
  },
]

// --- Step 3: Alternative exercise pairs to establish/expand ---
// [exerciseNameA, exerciseNameB] → bidirectional alternatives
const ALTERNATIVE_PAIRS: [string, string][] = [
  // Chest alternatives
  ['槓鈴臥推 Barbell Bench Press', '啞鈴臥推 Dumbbell Bench Press'],
  ['槓鈴臥推 Barbell Bench Press', '胸推機 Chest Press Machine'],
  ['槓鈴臥推 Barbell Bench Press', '伏地挺身 Push-up'],
  ['槓鈴臥推 Barbell Bench Press', '下斜槓鈴臥推 Decline Barbell Bench Press'],
  ['槓鈴臥推 Barbell Bench Press', '窄距臥推 Close-grip Bench Press'],
  ['啞鈴臥推 Dumbbell Bench Press', '胸推機 Chest Press Machine'],
  ['啞鈴臥推 Dumbbell Bench Press', '繩索飛鳥 Cable Crossover Fly'],
  ['上斜槓鈴臥推 Incline Barbell Bench Press', '上斜啞鈴臥推 Incline Dumbbell Press'],
  ['啞鈴飛鳥 Dumbbell Fly', '蝴蝶機夾胸 Pec Deck Fly'],
  ['啞鈴飛鳥 Dumbbell Fly', '繩索飛鳥 Cable Crossover Fly'],
  ['蝴蝶機夾胸 Pec Deck Fly', '繩索飛鳥 Cable Crossover Fly'],

  // Back alternatives
  ['引體向上 Pull-up', '滑輪下拉 Lat Pulldown'],
  ['引體向上 Pull-up', '寬距引體向上 Wide-grip Pull-up'],
  ['引體向上 Pull-up', '直臂下拉 Straight-arm Lat Pulldown'],
  ['槓鈴划船 Barbell Row', '坐姿划船 Seated Cable Row'],
  ['槓鈴划船 Barbell Row', '單臂啞鈴划船 Single-arm Dumbbell Row'],
  ['槓鈴划船 Barbell Row', 'T槓划船 T-bar Row'],
  ['坐姿划船 Seated Cable Row', '單臂啞鈴划船 Single-arm Dumbbell Row'],
  ['滑輪下拉 Lat Pulldown', '直臂下拉 Straight-arm Lat Pulldown'],

  // Shoulder alternatives
  ['槓鈴肩推 Overhead Barbell Press', '啞鈴肩推 Dumbbell Shoulder Press'],
  ['槓鈴肩推 Overhead Barbell Press', '肩推機 Shoulder Press Machine'],
  ['啞鈴肩推 Dumbbell Shoulder Press', '阿諾德推舉 Arnold Press'],
  ['啞鈴肩推 Dumbbell Shoulder Press', '肩推機 Shoulder Press Machine'],
  ['啞鈴側平舉 Dumbbell Lateral Raise', '繩索側平舉 Cable Lateral Raise'],
  ['啞鈴側平舉 Dumbbell Lateral Raise', '側平舉機 Machine Lateral Raise'],
  ['繩索側平舉 Cable Lateral Raise', '側平舉機 Machine Lateral Raise'],
  ['臉拉 Face Pull', '俯身啞鈴飛鳥 Bent-over Rear Delt Fly'],

  // Biceps alternatives
  ['啞鈴彎舉 Dumbbell Curl', '槓鈴彎舉 Barbell Bicep Curl'],
  ['啞鈴彎舉 Dumbbell Curl', '繩索彎舉 Cable Curl'],
  ['啞鈴彎舉 Dumbbell Curl', '集中彎舉 Concentration Curl'],
  ['槓鈴彎舉 Barbell Bicep Curl', '斜板彎舉 Preacher Curl'],
  ['槓鈴彎舉 Barbell Bicep Curl', '繩索彎舉 Cable Curl'],
  ['啞鈴錘式彎舉 Dumbbell Hammer Curl', '集中彎舉 Concentration Curl'],

  // Triceps alternatives
  ['纜繩三頭下壓 Cable Tricep Pushdown', '頭頂三頭伸展 Overhead Tricep Extension'],
  ['纜繩三頭下壓 Cable Tricep Pushdown', '臥式三頭屈伸 Skull Crusher'],
  ['臥式三頭屈伸 Skull Crusher', '窄距臥推 Close-grip Bench Press'],
  ['雙槓撐體 Dips', '窄距臥推 Close-grip Bench Press'],
  ['雙槓撐體 Dips', '頭頂三頭伸展 Overhead Tricep Extension'],

  // Legs alternatives
  ['槓鈴深蹲 Barbell Back Squat', '前蹲 Front Squat'],
  ['槓鈴深蹲 Barbell Back Squat', '腿推機 Leg Press'],
  ['槓鈴深蹲 Barbell Back Squat', '哈克深蹲 Hack Squat Machine'],
  ['腿推機 Leg Press', '哈克深蹲 Hack Squat Machine'],
  ['保加利亞分腿蹲 Bulgarian Split Squat', '跨步蹲 Lunges'],
  ['保加利亞分腿蹲 Bulgarian Split Squat', '哈克深蹲 Hack Squat Machine'],
  ['羅馬尼亞硬舉 Romanian Deadlift', '臀推 Hip Thrust'],
  ['羅馬尼亞硬舉 Romanian Deadlift', '坐姿腿彎舉 Seated Leg Curl'],
  ['臀推 Hip Thrust', '臀橋 Glute Bridge'],
  ['臀推 Hip Thrust', '繩索臀踢腿 Cable Kickback'],
  ['腿彎舉 Leg Curl', '坐姿腿彎舉 Seated Leg Curl'],
  ['硬舉 Deadlift', '羅馬尼亞硬舉 Romanian Deadlift'],
  ['硬舉 Deadlift', '背伸展 Back Extension'],

  // Core alternatives
  ['棒式 Plank', '側棒式 Side Plank'],
  ['仰臥起坐 Crunches', '纜繩捲腹 Cable Crunch'],
  ['仰臥起坐 Crunches', '反向捲腹 Reverse Crunch'],
  ['纜繩捲腹 Cable Crunch', '懸掛舉腿 Hanging Leg Raise'],
  ['俄羅斯轉體 Russian Twist', '側棒式 Side Plank'],

  // Calves
  ['提踵 Calf Raise', '坐姿提踵 Seated Calf Raise'],
]

async function main() {
  // Step 1: Update GIF URLs
  console.log('\n=== Updating GIF URLs for existing exercises ===')
  for (const [id, gifUrl] of Object.entries(GIF_UPDATES)) {
    await prisma.exercise.update({ where: { id }, data: { gifUrl } })
    console.log(`  Updated GIF: ${id}`)
  }

  // Step 2: Create new exercises
  console.log('\n=== Creating new exercises ===')
  const createdIds: Record<string, string> = {}

  for (const ex of NEW_EXERCISES) {
    const existing = await prisma.exercise.findFirst({ where: { name: ex.name } })
    if (existing) {
      console.log(`  Skip (exists): ${ex.name}`)
      createdIds[ex.name] = existing.id
      continue
    }

    const created = await prisma.exercise.create({
      data: {
        name: ex.name,
        description: ex.description,
        gifUrl: ex.gifUrl ?? null,
        stepInstructions: ex.stepInstructions,
        equipment: { create: ex.equipment.map(equipmentId => ({ equipmentId })) },
        muscles: {
          create: [
            ...ex.primaryMuscles.map(id => ({ muscleGroupId: id, isPrimary: true })),
            ...ex.secondaryMuscles.map(id => ({ muscleGroupId: id, isPrimary: false })),
          ],
        },
      },
    })
    console.log(`  Created: ${ex.name} (${created.id})`)
    createdIds[ex.name] = created.id
  }

  // Build a full name→id map from DB
  console.log('\n=== Building exercise name map ===')
  const allExercises = await prisma.exercise.findMany({ select: { id: true, name: true } })
  const nameToId: Record<string, string> = {}
  for (const e of allExercises) {
    nameToId[e.name] = e.id
  }

  // Step 3: Establish alternatives
  console.log('\n=== Setting up alternative pairs ===')
  let pairsAdded = 0
  for (const [nameA, nameB] of ALTERNATIVE_PAIRS) {
    const idA = nameToId[nameA]
    const idB = nameToId[nameB]
    if (!idA) { console.log(`  MISSING: ${nameA}`); continue }
    if (!idB) { console.log(`  MISSING: ${nameB}`); continue }

    // Check if pair already exists (either direction)
    const existing = await prisma.exerciseAlternative.findFirst({
      where: {
        OR: [
          { exerciseId: idA, alternativeExerciseId: idB },
          { exerciseId: idB, alternativeExerciseId: idA },
        ],
      },
    })
    if (existing) {
      // Already set up, skip
      continue
    }

    // Create both directions
    await prisma.exerciseAlternative.createMany({
      data: [
        { exerciseId: idA, alternativeExerciseId: idB },
        { exerciseId: idB, alternativeExerciseId: idA },
      ],
      skipDuplicates: true,
    })
    pairsAdded++
  }
  console.log(`  Added ${pairsAdded} new alternative pairs`)

  // Summary
  const totalExercises = await prisma.exercise.count()
  const totalAlternatives = await prisma.exerciseAlternative.count()
  console.log(`\n=== Done ===`)
  console.log(`Total exercises: ${totalExercises}`)
  console.log(`Total alternative links: ${totalAlternatives}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
