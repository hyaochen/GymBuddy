import { PrismaClient, EquipmentCategory, Difficulty, ExerciseType, BodyRegion } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Check if already seeded
    const existingCount = await prisma.equipment.count()
    if (existingCount > 0) {
        console.log('✅ Database already seeded, skipping...')
        return
    }

    console.log('🌱 Seeding database...')

    // ─── 1. Equipment ────────────────────────────────────────────────────────

    const equipmentDefs = [
        // FREE_WEIGHTS
        { name: 'Olympic Barbell / 奧林匹克槓鈴', category: EquipmentCategory.FREE_WEIGHTS, description: '標準 20kg 直槓，用於大部分自由重量訓練' },
        { name: 'EZ Bar / EZ槓', category: EquipmentCategory.FREE_WEIGHTS, description: '彎曲槓桿，適合彎舉和臥推' },
        { name: 'Dumbbells / 啞鈴', category: EquipmentCategory.FREE_WEIGHTS, description: '2kg - 50kg 啞鈴組，靈活多用途' },
        { name: 'Weight Plates / 槓片', category: EquipmentCategory.FREE_WEIGHTS, description: '1.25kg / 2.5kg / 5kg / 10kg / 20kg' },
        // MACHINES
        { name: 'Chest Press Machine / 胸推機', category: EquipmentCategory.MACHINES, description: '坐姿胸部推壓機器，適合初學者' },
        { name: 'Shoulder Press Machine / 肩推機', category: EquipmentCategory.MACHINES, description: '坐姿肩部推壓機器' },
        { name: 'Lat Pulldown Machine / 滑輪下拉機', category: EquipmentCategory.MACHINES, description: '背部訓練，模擬引體向上動作' },
        { name: 'Seated Row Machine / 坐姿划船機', category: EquipmentCategory.MACHINES, description: '坐姿划船，訓練背部厚度' },
        { name: 'Leg Press Machine / 腿推機', category: EquipmentCategory.MACHINES, description: '坐姿腿部推壓，安全的下肢訓練' },
        { name: 'Leg Curl Machine / 腿彎舉機', category: EquipmentCategory.MACHINES, description: '俯臥或坐姿訓練腘繩肌' },
        { name: 'Leg Extension Machine / 腿屈伸機', category: EquipmentCategory.MACHINES, description: '坐姿訓練股四頭肌' },
        { name: 'Hack Squat Machine / 哈克深蹲機', category: EquipmentCategory.MACHINES, description: '斜板式深蹲機，股四頭訓練' },
        { name: 'Pec Deck / Butterfly Machine / 蝴蝶機', category: EquipmentCategory.MACHINES, description: '坐姿夾胸，胸部孤立訓練' },
        { name: 'Preacher Curl Machine / 牧師椅彎舉機', category: EquipmentCategory.MACHINES, description: '固定上臂角度的彎舉機器' },
        { name: 'Smith Machine / 史密斯機', category: EquipmentCategory.MACHINES, description: '固定軌道的槓鈴機，安全槓' },
        { name: 'Hip Thrust Machine / 臀推機', category: EquipmentCategory.MACHINES, description: '坐姿臀部推壓訓練' },
        // CABLES
        { name: 'Cable Machine / 纜繩機', category: EquipmentCategory.CABLES, description: '可調高度纜繩機，多方向訓練' },
        { name: 'Cable Crossover / 纜繩交叉機', category: EquipmentCategory.CABLES, description: '雙邊高位纜繩，胸部訓練' },
        // STATIONS
        { name: 'Power Rack / Squat Rack / 深蹲架', category: EquipmentCategory.STATIONS, description: '全功能深蹲架，支援深蹲/臥推/硬舉' },
        { name: 'Flat Bench / 平板凳', category: EquipmentCategory.STATIONS, description: '平板啞鈴/臥推凳' },
        { name: 'Incline Bench / 上斜凳', category: EquipmentCategory.STATIONS, description: '可調30-45度上斜角' },
        { name: 'Decline Bench / 下斜凳', category: EquipmentCategory.STATIONS, description: '下斜角臥推凳' },
        { name: 'Dip / Pull-up Station / 雙槓引體向上架', category: EquipmentCategory.STATIONS, description: '雙槓撐體和引體向上' },
        // CARDIO
        { name: 'Treadmill / 跑步機', category: EquipmentCategory.CARDIO, description: '電動跑步機' },
        { name: 'Elliptical / 橢圓機', category: EquipmentCategory.CARDIO, description: '低衝擊有氧訓練' },
        { name: 'Stationary Bike / 固定式腳踏車', category: EquipmentCategory.CARDIO, description: '直立式或臥姿腳踏車' },
        // BODYWEIGHT
        { name: 'Bodyweight / 自體重量', category: EquipmentCategory.BODYWEIGHT, description: '不需器材的自身體重訓練' },
    ]

    const equipment: Record<string, string> = {}
    for (const eq of equipmentDefs) {
        const created = await prisma.equipment.create({ data: eq })
        equipment[eq.name] = created.id
    }
    console.log(`  ✓ Created ${equipmentDefs.length} equipment items`)

    // ─── 2. Muscle Groups ─────────────────────────────────────────────────────

    const muscleGroupDefs = [
        { name: '胸大肌 Pectorals', bodyRegion: BodyRegion.CHEST },
        { name: '上胸 Upper Chest', bodyRegion: BodyRegion.CHEST },
        { name: '背闊肌 Latissimus Dorsi', bodyRegion: BodyRegion.BACK },
        { name: '菱形肌 Rhomboids', bodyRegion: BodyRegion.BACK },
        { name: '斜方肌 Trapezius', bodyRegion: BodyRegion.BACK },
        { name: '後三角肌 Rear Deltoid', bodyRegion: BodyRegion.BACK },
        { name: '豎脊肌 Erector Spinae', bodyRegion: BodyRegion.BACK },
        { name: '前三角肌 Anterior Deltoid', bodyRegion: BodyRegion.SHOULDERS },
        { name: '側三角肌 Lateral Deltoid', bodyRegion: BodyRegion.SHOULDERS },
        { name: '二頭肌 Biceps Brachii', bodyRegion: BodyRegion.ARMS },
        { name: '三頭肌 Triceps Brachii', bodyRegion: BodyRegion.ARMS },
        { name: '前臂 Forearms', bodyRegion: BodyRegion.ARMS },
        { name: '股四頭肌 Quadriceps', bodyRegion: BodyRegion.LEGS },
        { name: '腘繩肌 Hamstrings', bodyRegion: BodyRegion.LEGS },
        { name: '臀大肌 Glutes', bodyRegion: BodyRegion.LEGS },
        { name: '小腿 Calves', bodyRegion: BodyRegion.LEGS },
        { name: '腹直肌 Rectus Abdominis', bodyRegion: BodyRegion.CORE },
        { name: '腹斜肌 Obliques', bodyRegion: BodyRegion.CORE },
        { name: '髖屈肌 Hip Flexors', bodyRegion: BodyRegion.LEGS },
    ]

    const muscles: Record<string, string> = {}
    for (const mg of muscleGroupDefs) {
        const created = await prisma.muscleGroup.create({ data: mg })
        muscles[mg.name] = created.id
    }
    console.log(`  ✓ Created ${muscleGroupDefs.length} muscle groups`)

    // ─── 3. Exercises ─────────────────────────────────────────────────────────

    type ExerciseDef = {
        name: string
        description?: string
        stepInstructions: string[]
        difficulty: Difficulty
        exerciseType: ExerciseType
        gifUrl?: string
        videoUrl?: string
        primaryMuscles: string[]
        secondaryMuscles?: string[]
        equipment: string[]
    }

    const exerciseDefs: ExerciseDef[] = [
        // ── PUSH: Chest ──
        {
            name: '槓鈴臥推 Barbell Bench Press',
            description: '複合動作，訓練胸大肌、前三角肌和三頭肌的經典動作',
            stepInstructions: [
                '躺平於臥推凳，腳踩地板，腰部自然拱起',
                '雙手握槓，比肩略寬（約1.5倍肩寬）',
                '將槓鈴從架上取下，移至胸口正上方',
                '緩慢下放槓鈴至胸口，保持手肘約75度角',
                '用力推回起始位置，呼氣，重複',
                '注意：下放約2-3秒，上推1秒',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            gifUrl: 'https://wger.de/media/exercise-images/192/Barbell-Bench-Press_1.gif',
            primaryMuscles: ['胸大肌 Pectorals'],
            secondaryMuscles: ['前三角肌 Anterior Deltoid', '三頭肌 Triceps Brachii'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴', 'Flat Bench / 平板凳', 'Power Rack / Squat Rack / 深蹲架'],
        },
        {
            name: '上斜槓鈴臥推 Incline Barbell Bench Press',
            description: '強調上胸的臥推變化式',
            stepInstructions: [
                '調整凳子至30-45度角',
                '躺上斜凳，握槓比肩略寬',
                '將槓鈴下放至上胸鎖骨下方',
                '手肘維持75度，有控制地下放',
                '推回起始位置，感受上胸發力',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['上胸 Upper Chest'],
            secondaryMuscles: ['前三角肌 Anterior Deltoid', '三頭肌 Triceps Brachii'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴', 'Incline Bench / 上斜凳', 'Power Rack / Squat Rack / 深蹲架'],
        },
        {
            name: '啞鈴臥推 Dumbbell Bench Press',
            description: '使用啞鈴的臥推，活動範圍更大',
            stepInstructions: [
                '坐在平板凳末端，啞鈴放在大腿上',
                '後躺時利用腿部力量將啞鈴帶至胸口兩側',
                '啞鈴位於胸口高度，手肘稍低於肩膀',
                '推起啞鈴至胸口正上方，但不要碰在一起',
                '緩慢下放，感受胸肌伸展',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['胸大肌 Pectorals'],
            secondaryMuscles: ['前三角肌 Anterior Deltoid', '三頭肌 Triceps Brachii'],
            equipment: ['Dumbbells / 啞鈴', 'Flat Bench / 平板凳'],
        },
        {
            name: '啞鈴飛鳥 Dumbbell Fly',
            description: '孤立胸大肌的展翅動作',
            stepInstructions: [
                '躺於平板凳，啞鈴舉於胸口上方，手肘微彎',
                '雙臂向兩側張開，呈弧形下降',
                '直到感受到胸肌充分伸展時停止（約與肩同高）',
                '收縮胸肌，沿原弧線將啞鈴合攏至起始位置',
                '全程保持手肘微彎，避免鎖死',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['胸大肌 Pectorals'],
            secondaryMuscles: ['前三角肌 Anterior Deltoid'],
            equipment: ['Dumbbells / 啞鈴', 'Flat Bench / 平板凳'],
        },
        {
            name: '胸推機 Chest Press Machine',
            description: '機器式臥推，適合初學者建立基礎',
            stepInstructions: [
                '調整座椅高度，使把手位於胸口中間高度',
                '坐直，背部緊貼靠背，腳踩地板',
                '雙手握住把手，推出至手臂伸直',
                '緩慢收回，感受胸肌伸展',
                '機器提供穩定軌跡，適合練習胸肌發力感',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['胸大肌 Pectorals'],
            secondaryMuscles: ['三頭肌 Triceps Brachii'],
            equipment: ['Chest Press Machine / 胸推機'],
        },
        {
            name: '伏地挺身 Push-up',
            description: '經典自重訓練，不需任何器材',
            stepInstructions: [
                '俯臥，雙手置於胸口兩側，比肩略寬',
                '腳尖著地，身體成一直線',
                '彎曲手肘，下降至胸口接近地面',
                '推回起始位置，保持核心緊繃',
                '初學者可以膝蓋著地降低難度',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['胸大肌 Pectorals'],
            secondaryMuscles: ['前三角肌 Anterior Deltoid', '三頭肌 Triceps Brachii'],
            equipment: ['Bodyweight / 自體重量'],
        },
        {
            name: '蝴蝶機夾胸 Pec Deck Fly',
            description: '使用蝴蝶機的孤立胸肌訓練',
            stepInstructions: [
                '調整座椅高度，使手臂與肩膀同高',
                '坐直，雙臂打開置於墊板上',
                '向前夾合，感受胸肌收縮',
                '緩慢回到起始位置，讓胸肌充分伸展',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['胸大肌 Pectorals'],
            equipment: ['Pec Deck / Butterfly Machine / 蝴蝶機'],
        },
        // ── PUSH: Shoulders ──
        {
            name: '槓鈴肩推 Overhead Barbell Press',
            description: '站姿或坐姿槓鈴肩推，訓練整體三角肌',
            stepInstructions: [
                '站立或坐在凳上，握槓於鎖骨前方',
                '握距略寬於肩膀',
                '向上推起至手臂伸直，槓鈴過頭頂',
                '緩慢下放至鎖骨位置',
                '站姿時注意不要過度弓腰',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['前三角肌 Anterior Deltoid', '側三角肌 Lateral Deltoid'],
            secondaryMuscles: ['三頭肌 Triceps Brachii', '斜方肌 Trapezius'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴', 'Power Rack / Squat Rack / 深蹲架'],
        },
        {
            name: '啞鈴側平舉 Dumbbell Lateral Raise',
            description: '孤立側三角肌的經典動作',
            stepInstructions: [
                '站立，雙手各握一個啞鈴垂於身體兩側',
                '保持手肘微彎，雙臂向兩側抬起',
                '抬至與肩同高，拇指略向下傾（倒水姿勢）',
                '緩慢下放，保持肌肉控制',
                '注意不要利用身體搖擺的慣性',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['側三角肌 Lateral Deltoid'],
            equipment: ['Dumbbells / 啞鈴'],
        },
        {
            name: '肩推機 Shoulder Press Machine',
            description: '機器式肩推，軌跡固定更安全',
            stepInstructions: [
                '調整座椅使把手位於肩膀高度',
                '背部緊貼靠背，握住把手',
                '向上推至手臂伸直',
                '緩慢下放至起始位置',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['前三角肌 Anterior Deltoid', '側三角肌 Lateral Deltoid'],
            secondaryMuscles: ['三頭肌 Triceps Brachii'],
            equipment: ['Shoulder Press Machine / 肩推機'],
        },
        // ── PUSH: Triceps ──
        {
            name: '纜繩三頭下壓 Cable Tricep Pushdown',
            description: '纜繩機三頭下壓，孤立三頭肌訓練',
            stepInstructions: [
                '站在高位纜繩機前，握住下壓把手',
                '上臂緊靠身體兩側，固定不動',
                '向下壓至手臂完全伸直',
                '緩慢回到起始位置，感受三頭肌伸展',
                '可以用繩索把手增加旋外動作',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['三頭肌 Triceps Brachii'],
            equipment: ['Cable Machine / 纜繩機'],
        },
        {
            name: '臥式三頭屈伸 Skull Crusher',
            description: 'EZ槓臥式三頭訓練，也稱法式推舉',
            stepInstructions: [
                '躺於平板凳，雙手握EZ槓伸直至胸口上方',
                '固定上臂不動，彎曲手肘使槓鈴下降至頭部後方',
                '感受三頭肌伸展後，收縮三頭肌推回起始位置',
                '上臂全程保持垂直地面',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['三頭肌 Triceps Brachii'],
            equipment: ['EZ Bar / EZ槓', 'Flat Bench / 平板凳'],
        },
        {
            name: '雙槓撐體 Dips',
            description: '自重訓練，可訓練胸部或三頭肌（依身體傾斜角度）',
            stepInstructions: [
                '雙手握住雙槓，身體懸空',
                '彎曲手肘緩慢下沉',
                '訓練三頭肌：身體保持直立，下降約90度',
                '訓練胸部：身體前傾，下降至感受胸肌伸展',
                '推回起始位置',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['三頭肌 Triceps Brachii', '胸大肌 Pectorals'],
            equipment: ['Dip / Pull-up Station / 雙槓引體向上架', 'Bodyweight / 自體重量'],
        },
        // ── PULL: Back ──
        {
            name: '硬舉 Deadlift',
            description: '全身性複合動作，是力量訓練之王',
            stepInstructions: [
                '雙腳與肩同寬，槓鈴位於腳背正上方（距脛骨約2cm）',
                '俯身握槓，雙手比肩略寬，鎖定核心',
                '深吸氣，擴張胸腔，脊椎保持中立位',
                '推地起身，槓鈴緊貼脛骨上升',
                '站直後臀部夾緊，不要過度後仰',
                '緩慢下放，控制好每一吋行程',
            ],
            difficulty: Difficulty.ADVANCED,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['豎脊肌 Erector Spinae', '臀大肌 Glutes', '腘繩肌 Hamstrings'],
            secondaryMuscles: ['斜方肌 Trapezius', '前臂 Forearms', '股四頭肌 Quadriceps'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴', 'Weight Plates / 槓片'],
        },
        {
            name: '引體向上 Pull-up',
            description: '背部訓練之王，全面訓練背闊肌',
            stepInstructions: [
                '正握（手心朝外）或反握（手心朝內）握住槓',
                '手臂伸直懸掛，肩胛骨微收（不要聳肩）',
                '彎曲手肘，將胸口拉向橫槓',
                '感受背闊肌收縮，稍作停頓',
                '緩慢下放至手臂伸直，保持肌肉張力',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['背闊肌 Latissimus Dorsi'],
            secondaryMuscles: ['二頭肌 Biceps Brachii', '菱形肌 Rhomboids'],
            equipment: ['Dip / Pull-up Station / 雙槓引體向上架', 'Bodyweight / 自體重量'],
        },
        {
            name: '滑輪下拉 Lat Pulldown',
            description: '使用機器模擬引體向上，適合初學者',
            stepInstructions: [
                '坐於滑輪下拉機，大腿固定在護膝下',
                '寬握槓（比肩寬），掌心向外',
                '稍微後仰，拉槓至鎖骨位置',
                '感受背闊肌收縮，緩慢讓手臂回到伸直狀態',
                '不要過度搖擺身體借力',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['背闊肌 Latissimus Dorsi'],
            secondaryMuscles: ['二頭肌 Biceps Brachii', '菱形肌 Rhomboids'],
            equipment: ['Lat Pulldown Machine / 滑輪下拉機'],
        },
        {
            name: '坐姿划船 Seated Cable Row',
            description: '訓練背部厚度的划船動作',
            stepInstructions: [
                '坐在划船機上，腳踩踏板，膝蓋微彎',
                '握住把手，背部打直，上身略向前傾',
                '收縮背肌，將把手拉向腹部',
                '肩胛骨向後夾緊，稍作停頓',
                '緩慢回到起始位置，感受背部伸展',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['菱形肌 Rhomboids', '背闊肌 Latissimus Dorsi'],
            secondaryMuscles: ['二頭肌 Biceps Brachii', '後三角肌 Rear Deltoid'],
            equipment: ['Seated Row Machine / 坐姿划船機'],
        },
        {
            name: '槓鈴划船 Barbell Row',
            description: '自由重量背部訓練，訓練背部厚度',
            stepInstructions: [
                '雙腳與肩同寬，微彎膝，俯身使上身與地面平行',
                '正握或反握槓鈴，雙手與肩同寬',
                '保持背部打直，將槓鈴拉向腹部',
                '肩胛骨向後收縮，稍作停頓',
                '緩慢下放，背部不要放鬆',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['背闊肌 Latissimus Dorsi', '菱形肌 Rhomboids'],
            secondaryMuscles: ['二頭肌 Biceps Brachii', '後三角肌 Rear Deltoid', '豎脊肌 Erector Spinae'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴'],
        },
        {
            name: '臉拉 Face Pull',
            description: '訓練後三角肌和菱形肌，預防肩部傷害',
            stepInstructions: [
                '將纜繩機設置在臉部高度，裝上繩索把手',
                '雙手握繩，掌心相對，站立或微蹲',
                '將繩索拉向臉部，手肘高於肩膀',
                '感受後三角肌和菱形肌收縮',
                '緩慢回到起始位置',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['後三角肌 Rear Deltoid'],
            secondaryMuscles: ['菱形肌 Rhomboids', '斜方肌 Trapezius'],
            equipment: ['Cable Machine / 纜繩機'],
        },
        // ── PULL: Biceps ──
        {
            name: '槓鈴彎舉 Barbell Bicep Curl',
            description: '二頭肌訓練的基礎動作',
            stepInstructions: [
                '站立，正握槓鈴（掌心向上），手臂伸直',
                '上臂緊靠身體兩側固定不動',
                '彎曲手肘，將槓鈴捲起至肩膀前方',
                '頂端稍作停頓，感受二頭肌收縮',
                '緩慢下放，不要完全放鬆',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['二頭肌 Biceps Brachii'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴'],
        },
        {
            name: '啞鈴錘式彎舉 Dumbbell Hammer Curl',
            description: '中性握法彎舉，同時訓練二頭肌和前臂',
            stepInstructions: [
                '站立，雙手各握一啞鈴，中性握（大拇指朝上）',
                '上臂固定，交替或同時彎舉',
                '將啞鈴捲起至肩膀高度',
                '緩慢下放，感受前臂肱橈肌伸展',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['二頭肌 Biceps Brachii'],
            secondaryMuscles: ['前臂 Forearms'],
            equipment: ['Dumbbells / 啞鈴'],
        },
        // ── LEGS ──
        {
            name: '槓鈴深蹲 Barbell Back Squat',
            description: '腿部訓練之王，全面發展下肢力量',
            stepInstructions: [
                '將槓鈴放置在頸後斜方肌上方（低槓位置在三角肌後束）',
                '雙腳與肩同寬或略寬，腳尖向外15-30度',
                '深吸氣，擴張腹壓，緩慢下蹲',
                '蹲至大腿平行地面或更低，膝蓋朝向腳尖方向',
                '推地站起，全程保持脊椎中立',
            ],
            difficulty: Difficulty.ADVANCED,
            exerciseType: ExerciseType.COMPOUND,
            gifUrl: 'https://wger.de/media/exercise-images/111/Squat_1.gif',
            primaryMuscles: ['股四頭肌 Quadriceps', '臀大肌 Glutes'],
            secondaryMuscles: ['腘繩肌 Hamstrings', '豎脊肌 Erector Spinae'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴', 'Power Rack / Squat Rack / 深蹲架'],
        },
        {
            name: '腿推機 Leg Press',
            description: '機器式下肢訓練，比深蹲更容易上手',
            stepInstructions: [
                '坐入腿推機，背部完全靠在靠背上',
                '雙腳置於踏板上，與肩同寬',
                '解除安全鎖，緩慢彎曲膝蓋下降',
                '腳踝、膝蓋和臀部成一直線',
                '推回至腿部幾乎伸直（不要鎖死膝蓋）',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['股四頭肌 Quadriceps', '臀大肌 Glutes'],
            secondaryMuscles: ['腘繩肌 Hamstrings'],
            equipment: ['Leg Press Machine / 腿推機'],
        },
        {
            name: '羅馬尼亞硬舉 Romanian Deadlift',
            description: '針對腘繩肌和臀部的硬舉變化式',
            stepInstructions: [
                '站立，雙手握槓鈴（過肩寬），槓置於大腿前方',
                '保持腿部微彎，髖部向後推，俯身下降',
                '槓鈴緊貼大腿和小腿下降，感受腘繩肌伸展',
                '下降至感受充分伸展（約脛骨中段）',
                '收縮臀部和腘繩肌，推髖恢復站姿',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['腘繩肌 Hamstrings', '臀大肌 Glutes'],
            secondaryMuscles: ['豎脊肌 Erector Spinae'],
            equipment: ['Olympic Barbell / 奧林匹克槓鈴'],
        },
        {
            name: '腿彎舉 Leg Curl',
            description: '孤立訓練腘繩肌的機器動作',
            stepInstructions: [
                '俯臥於腿彎舉機，腳踝置於滾輪下方',
                '固定大腿，緩慢彎曲膝蓋至最大幅度',
                '感受腘繩肌充分收縮',
                '緩慢回到起始位置',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['腘繩肌 Hamstrings'],
            equipment: ['Leg Curl Machine / 腿彎舉機'],
        },
        {
            name: '腿屈伸 Leg Extension',
            description: '孤立訓練股四頭肌的機器動作',
            stepInstructions: [
                '坐在腿屈伸機上，後背緊靠靠背',
                '腳踝置於滾輪後方，膝蓋在關節軸心處',
                '伸直膝蓋，感受股四頭肌收縮',
                '保持頂端張力約1秒',
                '緩慢回到起始位置',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['股四頭肌 Quadriceps'],
            equipment: ['Leg Extension Machine / 腿屈伸機'],
        },
        {
            name: '哈克深蹲 Hack Squat',
            description: '斜板式深蹲，強調股四頭肌訓練',
            stepInstructions: [
                '站入哈克深蹲機，背部和肩膀緊靠斜板',
                '雙腳置於踏板上，與肩同寬',
                '解除安全鎖，緩慢彎曲膝蓋下降',
                '蹲至大腿平行地面',
                '推回起始位置，不要完全鎖死膝蓋',
            ],
            difficulty: Difficulty.INTERMEDIATE,
            exerciseType: ExerciseType.COMPOUND,
            primaryMuscles: ['股四頭肌 Quadriceps'],
            secondaryMuscles: ['臀大肌 Glutes'],
            equipment: ['Hack Squat Machine / 哈克深蹲機'],
        },
        {
            name: '提踵 Calf Raise',
            description: '訓練小腿肌群的基本動作',
            stepInstructions: [
                '站立於台階邊緣，腳尖踩在邊緣（腳跟懸空）',
                '緩慢下降腳跟至最低點，感受小腿伸展',
                '用力踮腳，推至最高點',
                '頂端停留1-2秒，確保充分收縮',
                '可手持啞鈴增加阻力',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['小腿 Calves'],
            equipment: ['Bodyweight / 自體重量', 'Dumbbells / 啞鈴'],
        },
        // ── CORE ──
        {
            name: '棒式 Plank',
            description: '靜態核心訓練，全面強化腹部和背部',
            stepInstructions: [
                '俯臥，前臂和腳尖支撐，身體離地',
                '身體成一直線，從頭到腳踝',
                '收緊腹部和臀部，不要讓腰部下沉或翹起',
                '保持正常呼吸，維持指定時間',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['腹直肌 Rectus Abdominis'],
            secondaryMuscles: ['腹斜肌 Obliques', '豎脊肌 Erector Spinae'],
            equipment: ['Bodyweight / 自體重量'],
        },
        {
            name: '仰臥起坐 Crunches',
            description: '訓練腹直肌的基礎動作',
            stepInstructions: [
                '仰臥，膝蓋彎曲，腳踩地板',
                '雙手交叉放在胸前或輕扶耳朵兩側',
                '收縮腹肌，抬起肩膀和頭部離地',
                '到達頂點後緩慢下放，不完全躺回地面',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['腹直肌 Rectus Abdominis'],
            equipment: ['Bodyweight / 自體重量'],
        },
        {
            name: '纜繩捲腹 Cable Crunch',
            description: '使用纜繩機的加重捲腹訓練',
            stepInstructions: [
                '跪在高位纜繩機前，握住繩索把手放在頭部兩側',
                '上身微向前傾，以腹肌為軸心向下捲腹',
                '感受腹部充分收縮後緩慢回位',
                '全程保持臀部固定，不要用臀部擺動借力',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['腹直肌 Rectus Abdominis'],
            equipment: ['Cable Machine / 纜繩機'],
        },
        {
            name: '俄羅斯轉體 Russian Twist',
            description: '旋轉動作訓練腹斜肌',
            stepInstructions: [
                '坐在地板上，膝蓋彎曲，腳跟離地或輕觸地',
                '上身後仰約45度，雙手合握於胸前',
                '左右旋轉上半身，手觸地面增加難度',
                '可手持啞鈴增加阻力',
            ],
            difficulty: Difficulty.BEGINNER,
            exerciseType: ExerciseType.ISOLATION,
            primaryMuscles: ['腹斜肌 Obliques'],
            equipment: ['Bodyweight / 自體重量'],
        },
    ]

    const exerciseIds: Record<string, string> = {}
    for (const ex of exerciseDefs) {
        const { primaryMuscles, secondaryMuscles, equipment: exEquipment, stepInstructions, ...exerciseData } = ex

        const created = await prisma.exercise.create({
            data: {
                ...exerciseData,
                stepInstructions: stepInstructions,
            },
        })
        exerciseIds[ex.name] = created.id

        // Link muscles
        for (const muscleName of primaryMuscles) {
            if (muscles[muscleName]) {
                await prisma.exerciseMuscle.create({
                    data: { exerciseId: created.id, muscleGroupId: muscles[muscleName], isPrimary: true },
                })
            }
        }
        for (const muscleName of (secondaryMuscles || [])) {
            if (muscles[muscleName]) {
                await prisma.exerciseMuscle.create({
                    data: { exerciseId: created.id, muscleGroupId: muscles[muscleName], isPrimary: false },
                })
            }
        }

        // Link equipment
        for (const eqName of exEquipment) {
            if (equipment[eqName]) {
                await prisma.exerciseEquipment.create({
                    data: { exerciseId: created.id, equipmentId: equipment[eqName] },
                })
            }
        }
    }
    console.log(`  ✓ Created ${exerciseDefs.length} exercises`)

    // ─── 4. Exercise Alternatives ─────────────────────────────────────────────

    const alternativePairs: [string, string][] = [
        ['槓鈴臥推 Barbell Bench Press', '啞鈴臥推 Dumbbell Bench Press'],
        ['槓鈴臥推 Barbell Bench Press', '胸推機 Chest Press Machine'],
        ['槓鈴臥推 Barbell Bench Press', '伏地挺身 Push-up'],
        ['槓鈴臥推 Barbell Bench Press', '蝴蝶機夾胸 Pec Deck Fly'],
        ['啞鈴臥推 Dumbbell Bench Press', '胸推機 Chest Press Machine'],
        ['啞鈴臥推 Dumbbell Bench Press', '伏地挺身 Push-up'],
        ['引體向上 Pull-up', '滑輪下拉 Lat Pulldown'],
        ['引體向上 Pull-up', '坐姿划船 Seated Cable Row'],
        ['滑輪下拉 Lat Pulldown', '坐姿划船 Seated Cable Row'],
        ['槓鈴划船 Barbell Row', '坐姿划船 Seated Cable Row'],
        ['槓鈴深蹲 Barbell Back Squat', '腿推機 Leg Press'],
        ['槓鈴深蹲 Barbell Back Squat', '哈克深蹲 Hack Squat'],
        ['腿推機 Leg Press', '哈克深蹲 Hack Squat'],
        ['槓鈴肩推 Overhead Barbell Press', '肩推機 Shoulder Press Machine'],
        ['硬舉 Deadlift', '羅馬尼亞硬舉 Romanian Deadlift'],
        ['槓鈴彎舉 Barbell Bicep Curl', '啞鈴錘式彎舉 Dumbbell Hammer Curl'],
        ['上斜槓鈴臥推 Incline Barbell Bench Press', '啞鈴飛鳥 Dumbbell Fly'],
        ['雙槓撐體 Dips', '纜繩三頭下壓 Cable Tricep Pushdown'],
        ['雙槓撐體 Dips', '臥式三頭屈伸 Skull Crusher'],
    ]

    let altCount = 0
    for (const [a, b] of alternativePairs) {
        const idA = exerciseIds[a]
        const idB = exerciseIds[b]
        if (!idA || !idB) continue

        // Insert both directions
        await prisma.exerciseAlternative.createMany({
            data: [
                { exerciseId: idA, alternativeExerciseId: idB },
                { exerciseId: idB, alternativeExerciseId: idA },
            ],
            skipDuplicates: true,
        })
        altCount += 2
    }
    console.log(`  ✓ Created ${altCount} alternative exercise relationships`)

    console.log('')
    console.log('✅ Seed complete!')
    console.log('   Equipment:', equipmentDefs.length)
    console.log('   Muscle Groups:', muscleGroupDefs.length)
    console.log('   Exercises:', exerciseDefs.length)
}

main()
    .then(async () => { await prisma.$disconnect() })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
