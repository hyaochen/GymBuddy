--
-- PostgreSQL database dump
--

\restrict zk9kl73chsYmdofQH4uVgfbjOe8NGxHZblUaB6aBpi8Nni2imZ0cPFnLn7FdBUD

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: BodyRegion; Type: TYPE; Schema: public; Owner: workout
--

CREATE TYPE public."BodyRegion" AS ENUM (
    'CHEST',
    'BACK',
    'SHOULDERS',
    'ARMS',
    'LEGS',
    'CORE',
    'FULL_BODY',
    'CARDIO'
);


ALTER TYPE public."BodyRegion" OWNER TO workout;

--
-- Name: Difficulty; Type: TYPE; Schema: public; Owner: workout
--

CREATE TYPE public."Difficulty" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED'
);


ALTER TYPE public."Difficulty" OWNER TO workout;

--
-- Name: EquipmentCategory; Type: TYPE; Schema: public; Owner: workout
--

CREATE TYPE public."EquipmentCategory" AS ENUM (
    'FREE_WEIGHTS',
    'MACHINES',
    'CABLES',
    'CARDIO',
    'BODYWEIGHT',
    'STATIONS'
);


ALTER TYPE public."EquipmentCategory" OWNER TO workout;

--
-- Name: ExerciseType; Type: TYPE; Schema: public; Owner: workout
--

CREATE TYPE public."ExerciseType" AS ENUM (
    'COMPOUND',
    'ISOLATION',
    'CARDIO',
    'STRETCH'
);


ALTER TYPE public."ExerciseType" OWNER TO workout;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: equipment; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.equipment (
    id text NOT NULL,
    name text NOT NULL,
    category public."EquipmentCategory" NOT NULL,
    description text,
    "imageUrl" text
);


ALTER TABLE public.equipment OWNER TO workout;

--
-- Name: exercise_alternatives; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.exercise_alternatives (
    "exerciseId" text NOT NULL,
    "alternativeExerciseId" text NOT NULL
);


ALTER TABLE public.exercise_alternatives OWNER TO workout;

--
-- Name: exercise_equipment; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.exercise_equipment (
    "exerciseId" text NOT NULL,
    "equipmentId" text NOT NULL
);


ALTER TABLE public.exercise_equipment OWNER TO workout;

--
-- Name: exercise_muscles; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.exercise_muscles (
    "exerciseId" text NOT NULL,
    "muscleGroupId" text NOT NULL,
    "isPrimary" boolean DEFAULT true NOT NULL
);


ALTER TABLE public.exercise_muscles OWNER TO workout;

--
-- Name: exercises; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.exercises (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "stepInstructions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    difficulty public."Difficulty" DEFAULT 'INTERMEDIATE'::public."Difficulty" NOT NULL,
    "exerciseType" public."ExerciseType" DEFAULT 'COMPOUND'::public."ExerciseType" NOT NULL,
    "gifUrl" text,
    "videoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.exercises OWNER TO workout;

--
-- Name: muscle_groups; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.muscle_groups (
    id text NOT NULL,
    name text NOT NULL,
    "bodyRegion" public."BodyRegion" NOT NULL
);


ALTER TABLE public.muscle_groups OWNER TO workout;

--
-- Name: personal_records; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.personal_records (
    id text NOT NULL,
    "userId" text NOT NULL,
    "exerciseId" text NOT NULL,
    "weightKg" numeric(6,2) NOT NULL,
    reps integer NOT NULL,
    estimated1rm numeric(6,2) NOT NULL,
    "achievedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.personal_records OWNER TO workout;

--
-- Name: session_exercises; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.session_exercises (
    id text NOT NULL,
    "sessionId" text NOT NULL,
    "exerciseId" text NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "substituteForId" text
);


ALTER TABLE public.session_exercises OWNER TO workout;

--
-- Name: session_sets; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.session_sets (
    id text NOT NULL,
    "sessionExerciseId" text NOT NULL,
    "setNumber" integer NOT NULL,
    "repsPerformed" integer NOT NULL,
    "weightKg" numeric(6,2) NOT NULL,
    "restAfterSeconds" integer,
    "completedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.session_sets OWNER TO workout;

--
-- Name: users; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "passwordHash" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.users OWNER TO workout;

--
-- Name: workout_plan_days; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.workout_plan_days (
    id text NOT NULL,
    "planId" text NOT NULL,
    "dayName" text NOT NULL,
    "dayOfWeek" integer,
    "orderIndex" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.workout_plan_days OWNER TO workout;

--
-- Name: workout_plan_exercises; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.workout_plan_exercises (
    id text NOT NULL,
    "dayId" text NOT NULL,
    "exerciseId" text NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "defaultSets" integer DEFAULT 3 NOT NULL,
    "defaultRepsMin" integer DEFAULT 8 NOT NULL,
    "defaultRepsMax" integer DEFAULT 12 NOT NULL,
    "defaultWeightKg" numeric(6,2),
    "restSeconds" integer DEFAULT 90 NOT NULL,
    notes text
);


ALTER TABLE public.workout_plan_exercises OWNER TO workout;

--
-- Name: workout_plans; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.workout_plans (
    id text NOT NULL,
    "userId" text NOT NULL,
    name text NOT NULL,
    description text,
    "daysPerWeek" integer DEFAULT 3 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.workout_plans OWNER TO workout;

--
-- Name: workout_sessions; Type: TABLE; Schema: public; Owner: workout
--

CREATE TABLE public.workout_sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "planId" text,
    "dayId" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "durationMin" integer,
    notes text
);


ALTER TABLE public.workout_sessions OWNER TO workout;

--
-- Data for Name: equipment; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.equipment (id, name, category, description, "imageUrl") FROM stdin;
cmlzdca83000411jly6zsxcbi	Chest Press Machine / 胸推機	MACHINES	坐姿胸部推壓機器，適合初學者	\N
cmlzdca88000711jlvm0oupf6	Seated Row Machine / 坐姿划船機	MACHINES	坐姿划船，訓練背部厚度	\N
cmlzdca8e000c11jl0q6b7cd8	Pec Deck / Butterfly Machine / 蝴蝶機	MACHINES	坐姿夾胸，胸部孤立訓練	\N
cmlzdca8g000d11jl30ijkjv8	Preacher Curl Machine / 牧師椅彎舉機	MACHINES	固定上臂角度的彎舉機器	\N
cmlzdca8i000f11jl07v60kr9	Hip Thrust Machine / 臀推機	MACHINES	坐姿臀部推壓訓練	\N
cmlzdca8t000n11jlt0evy8s9	Treadmill / 跑步機	CARDIO	電動跑步機	\N
cmlzdca8u000o11jl7bp47qam	Elliptical / 橢圓機	CARDIO	低衝擊有氧訓練	\N
cmlzdca8v000p11jl2mmemv0j	Stationary Bike / 固定式腳踏車	CARDIO	直立式或臥姿腳踏車	\N
cmlzdca8x000q11jlbooyr2a1	Bodyweight / 自體重量	BODYWEIGHT	不需器材的自身體重訓練	\N
cmlzdca7w000011jln64nuh8z	Olympic Barbell / 奧林匹克槓鈴	FREE_WEIGHTS	標準 20kg 直槓，用於大部分自由重量訓練	https://upload.wikimedia.org/wikipedia/commons/8/85/Olympic_barbell.jpg
cmlzdca7z000111jlg3bb5f2c	EZ Bar / EZ槓	FREE_WEIGHTS	彎曲槓桿，適合彎舉和臥推	https://upload.wikimedia.org/wikipedia/commons/5/5e/Ez-bar-curl-1.gif
cmlzdca80000211jlowx6r935	Dumbbells / 啞鈴	FREE_WEIGHTS	2kg - 50kg 啞鈴組，靈活多用途	https://upload.wikimedia.org/wikipedia/commons/b/be/Dumbbell.JPG
cmlzdca82000311jl4vi8juwl	Weight Plates / 槓片	FREE_WEIGHTS	1.25kg / 2.5kg / 5kg / 10kg / 20kg	https://upload.wikimedia.org/wikipedia/commons/a/a2/Weight_plate.jpg
cmlzdca85000511jlhqfjyb1k	Shoulder Press Machine / 肩推機	MACHINES	坐姿肩部推壓機器	https://upload.wikimedia.org/wikipedia/commons/1/1f/ShoulderPressMachineExercise.JPG
cmlzdca86000611jlktk9s0am	Lat Pulldown Machine / 滑輪下拉機	MACHINES	背部訓練，模擬引體向上動作	https://upload.wikimedia.org/wikipedia/commons/f/f8/PulldownMachineExercise.JPG
cmlzdca89000811jl16vcjq9i	Leg Press Machine / 腿推機	MACHINES	坐姿腿部推壓，安全的下肢訓練	https://upload.wikimedia.org/wikipedia/commons/c/c5/Leg_press.jpg
cmlzdca8a000911jlj94r1emm	Leg Curl Machine / 腿彎舉機	MACHINES	俯臥或坐姿訓練腘繩肌	https://upload.wikimedia.org/wikipedia/commons/c/c6/LyingLegCurlMachineExercise.JPG
cmlzdca8c000a11jlszl6p099	Leg Extension Machine / 腿屈伸機	MACHINES	坐姿訓練股四頭肌	https://upload.wikimedia.org/wikipedia/commons/3/36/LegExtensionMachineExercise.JPG
cmlzdca8d000b11jlt9uzb4uv	Hack Squat Machine / 哈克深蹲機	MACHINES	斜板式深蹲機，股四頭訓練	https://upload.wikimedia.org/wikipedia/commons/d/dd/HackSquatMachineExercise.JPG
cmlzdca8h000e11jldeu03zct	Smith Machine / 史密斯機	MACHINES	固定軌道的槓鈴機，安全槓	https://upload.wikimedia.org/wikipedia/commons/e/eb/Smith_machine.GIF
cmlzdca8k000g11jl1dl8nkd8	Cable Machine / 纜繩機	CABLES	可調高度纜繩機，多方向訓練	https://upload.wikimedia.org/wikipedia/commons/8/8f/Personal_Training_at_a_Gym_-_Cable_Crossover.JPG
cmlzdca8l000h11jlxnxmkcxj	Cable Crossover / 纜繩交叉機	CABLES	雙邊高位纜繩，胸部訓練	https://upload.wikimedia.org/wikipedia/commons/8/8f/Personal_Training_at_a_Gym_-_Cable_Crossover.JPG
cmlzdca8m000i11jl9kb8bp0t	Power Rack / Squat Rack / 深蹲架	STATIONS	全功能深蹲架，支援深蹲/臥推/硬舉	https://upload.wikimedia.org/wikipedia/commons/9/9f/Power_Rack.JPG
cmlzdca8o000j11jlz8t9iu2s	Flat Bench / 平板凳	STATIONS	平板啞鈴/臥推凳	https://upload.wikimedia.org/wikipedia/commons/5/57/Bench_press.jpg
cmlzdca8p000k11jlnfyua5m0	Incline Bench / 上斜凳	STATIONS	可調30-45度上斜角	https://upload.wikimedia.org/wikipedia/commons/1/14/Incline-bench-press-2.png
cmlzdca8q000l11jlu8sy8ttv	Decline Bench / 下斜凳	STATIONS	下斜角臥推凳	https://upload.wikimedia.org/wikipedia/commons/5/57/Bench_press.jpg
cmlzdca8r000m11jl8mz2ntz0	Dip / Pull-up Station / 雙槓引體向上架	STATIONS	雙槓撐體和引體向上	https://upload.wikimedia.org/wikipedia/commons/8/89/Dips.jpg
\.


--
-- Data for Name: exercise_alternatives; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.exercise_alternatives ("exerciseId", "alternativeExerciseId") FROM stdin;
cmlzdca9o001a11jl6e68w6k8	cmlzdcaac001c11jl4snhn7mc
cmlzdcaac001c11jl4snhn7mc	cmlzdca9o001a11jl6e68w6k8
cmlzdca9o001a11jl6e68w6k8	cmlzdcaas001e11jl7f77g87w
cmlzdcaas001e11jl7f77g87w	cmlzdca9o001a11jl6e68w6k8
cmlzdca9o001a11jl6e68w6k8	cmlzdcaay001f11jllfppnro4
cmlzdcaay001f11jllfppnro4	cmlzdca9o001a11jl6e68w6k8
cmlzdca9o001a11jl6e68w6k8	cmlzdcab6001g11jlh3ckucxp
cmlzdcab6001g11jlh3ckucxp	cmlzdca9o001a11jl6e68w6k8
cmlzdcaac001c11jl4snhn7mc	cmlzdcaas001e11jl7f77g87w
cmlzdcaas001e11jl7f77g87w	cmlzdcaac001c11jl4snhn7mc
cmlzdcaac001c11jl4snhn7mc	cmlzdcaay001f11jllfppnro4
cmlzdcaay001f11jllfppnro4	cmlzdcaac001c11jl4snhn7mc
cmlzdcacs001o11jl81sagr15	cmlzdcad0001p11jlpe0uoije
cmlzdcad0001p11jlpe0uoije	cmlzdcacs001o11jl81sagr15
cmlzdcacs001o11jl81sagr15	cmlzdcad7001q11jlz2tk17nx
cmlzdcad7001q11jlz2tk17nx	cmlzdcacs001o11jl81sagr15
cmlzdcad0001p11jlpe0uoije	cmlzdcad7001q11jlz2tk17nx
cmlzdcad7001q11jlz2tk17nx	cmlzdcad0001p11jlpe0uoije
cmlzdcadf001r11jlj17yojvy	cmlzdcad7001q11jlz2tk17nx
cmlzdcad7001q11jlz2tk17nx	cmlzdcadf001r11jlj17yojvy
cmlzdcae5001v11jlx20nwifb	cmlzdcaef001w11jlg3xvc1ld
cmlzdcaef001w11jlg3xvc1ld	cmlzdcae5001v11jlx20nwifb
cmlzdcae5001v11jlx20nwifb	cmlzdcaf0002011jljukrmp61
cmlzdcaf0002011jljukrmp61	cmlzdcae5001v11jlx20nwifb
cmlzdcaef001w11jlg3xvc1ld	cmlzdcaf0002011jljukrmp61
cmlzdcaf0002011jljukrmp61	cmlzdcaef001w11jlg3xvc1ld
cmlzdcaba001h11jlw4qesrqg	cmlzdcabq001j11jlu2kfdsj9
cmlzdcabq001j11jlu2kfdsj9	cmlzdcaba001h11jlw4qesrqg
cmlzdcacf001n11jl27x9zqhe	cmlzdcael001x11jlvcwa15nv
cmlzdcael001x11jlvcwa15nv	cmlzdcacf001n11jl27x9zqhe
cmlzdcadv001t11jle8emlqd5	cmlzdcadz001u11jljizol0p2
cmlzdcadz001u11jljizol0p2	cmlzdcadv001t11jle8emlqd5
cmlzdcaa2001b11jljh08hwvo	cmlzdcaal001d11jl5s826i3o
cmlzdcaal001d11jl5s826i3o	cmlzdcaa2001b11jljh08hwvo
cmlzdcac7001m11jlkv1hf7ga	cmlzdcabx001k11jlx8f4vj9f
cmlzdcabx001k11jlx8f4vj9f	cmlzdcac7001m11jlkv1hf7ga
cmlzdcac7001m11jlkv1hf7ga	cmlzdcac2001l11jlfcj3qhwn
cmlzdcac2001l11jlfcj3qhwn	cmlzdcac7001m11jlkv1hf7ga
cmlzdca9o001a11jl6e68w6k8	cmm023vpn0000oqut4jzpz9uk
cmm023vpn0000oqut4jzpz9uk	cmlzdca9o001a11jl6e68w6k8
cmlzdca9o001a11jl6e68w6k8	cmm023vr1000eoqutt1sh2uh9
cmm023vr1000eoqutt1sh2uh9	cmlzdca9o001a11jl6e68w6k8
cmlzdcaac001c11jl4snhn7mc	cmm023vpy0002oqutxabptg6e
cmm023vpy0002oqutxabptg6e	cmlzdcaac001c11jl4snhn7mc
cmlzdcaa2001b11jljh08hwvo	cmm023vpu0001oqut0t7ijffw
cmm023vpu0001oqut0t7ijffw	cmlzdcaa2001b11jljh08hwvo
cmlzdcaal001d11jl5s826i3o	cmlzdcab6001g11jlh3ckucxp
cmlzdcab6001g11jlh3ckucxp	cmlzdcaal001d11jl5s826i3o
cmlzdcaal001d11jl5s826i3o	cmm023vpy0002oqutxabptg6e
cmm023vpy0002oqutxabptg6e	cmlzdcaal001d11jl5s826i3o
cmlzdcab6001g11jlh3ckucxp	cmm023vpy0002oqutxabptg6e
cmm023vpy0002oqutxabptg6e	cmlzdcab6001g11jlh3ckucxp
cmlzdcacs001o11jl81sagr15	cmm023vq80005oqut77k4kbv5
cmm023vq80005oqut77k4kbv5	cmlzdcacs001o11jl81sagr15
cmlzdcacs001o11jl81sagr15	cmm023vq50004oqutaawnuqmb
cmm023vq50004oqutaawnuqmb	cmlzdcacs001o11jl81sagr15
cmlzdcadf001r11jlj17yojvy	cmm023vq20003oqutch89wzql
cmm023vq20003oqutch89wzql	cmlzdcadf001r11jlj17yojvy
cmlzdcadf001r11jlj17yojvy	cmm023vqc0006oquti1h3355g
cmm023vqc0006oquti1h3355g	cmlzdcadf001r11jlj17yojvy
cmlzdcad7001q11jlz2tk17nx	cmm023vq20003oqutch89wzql
cmm023vq20003oqutch89wzql	cmlzdcad7001q11jlz2tk17nx
cmlzdcad0001p11jlpe0uoije	cmm023vq50004oqutaawnuqmb
cmm023vq50004oqutaawnuqmb	cmlzdcad0001p11jlpe0uoije
cmlzdcaba001h11jlw4qesrqg	cmm023vqe0007oqut9hv4hylu
cmm023vqe0007oqut9hv4hylu	cmlzdcaba001h11jlw4qesrqg
cmm023vqe0007oqut9hv4hylu	cmm023vqj0008oqut09p4v06v
cmm023vqj0008oqut09p4v06v	cmm023vqe0007oqut9hv4hylu
cmm023vqe0007oqut9hv4hylu	cmlzdcabq001j11jlu2kfdsj9
cmlzdcabq001j11jlu2kfdsj9	cmm023vqe0007oqut9hv4hylu
cmlzdcabl001i11jluth1tf18	cmm023vqm0009oqut4vhaa9am
cmm023vqm0009oqut4vhaa9am	cmlzdcabl001i11jluth1tf18
cmlzdcabl001i11jluth1tf18	cmlzzvv9c0006pddr8e4gho6a
cmlzzvv9c0006pddr8e4gho6a	cmlzdcabl001i11jluth1tf18
cmm023vqm0009oqut4vhaa9am	cmlzzvv9c0006pddr8e4gho6a
cmlzzvv9c0006pddr8e4gho6a	cmm023vqm0009oqut4vhaa9am
cmlzdcadp001s11jledg98qnn	cmm023vqp000aoqutrdl6m58j
cmm023vqp000aoqutrdl6m58j	cmlzdcadp001s11jledg98qnn
cmlzzvv900002pddrut303r65	cmlzdcadv001t11jle8emlqd5
cmlzdcadv001t11jle8emlqd5	cmlzzvv900002pddrut303r65
cmlzzvv900002pddrut303r65	cmlzzvv990005pddrxvx21c5y
cmlzzvv990005pddrxvx21c5y	cmlzzvv900002pddrut303r65
cmlzzvv900002pddrut303r65	cmm023vqv000coquti2b09yqx
cmm023vqv000coquti2b09yqx	cmlzzvv900002pddrut303r65
cmlzdcadv001t11jle8emlqd5	cmm023vqs000boqut76fpmlw7
cmm023vqs000boqut76fpmlw7	cmlzdcadv001t11jle8emlqd5
cmlzdcadv001t11jle8emlqd5	cmlzzvv990005pddrxvx21c5y
cmlzzvv990005pddrxvx21c5y	cmlzdcadv001t11jle8emlqd5
cmlzdcadz001u11jljizol0p2	cmm023vqv000coquti2b09yqx
cmm023vqv000coquti2b09yqx	cmlzdcadz001u11jljizol0p2
cmlzdcabx001k11jlx8f4vj9f	cmm023vqy000doqutlnr0utk4
cmm023vqy000doqutlnr0utk4	cmlzdcabx001k11jlx8f4vj9f
cmlzdcabx001k11jlx8f4vj9f	cmlzdcac2001l11jlfcj3qhwn
cmlzdcac2001l11jlfcj3qhwn	cmlzdcabx001k11jlx8f4vj9f
cmlzdcac2001l11jlfcj3qhwn	cmm023vr1000eoqutt1sh2uh9
cmm023vr1000eoqutt1sh2uh9	cmlzdcac2001l11jlfcj3qhwn
cmlzdcac7001m11jlkv1hf7ga	cmm023vr1000eoqutt1sh2uh9
cmm023vr1000eoqutt1sh2uh9	cmlzdcac7001m11jlkv1hf7ga
cmlzdcac7001m11jlkv1hf7ga	cmm023vqy000doqutlnr0utk4
cmm023vqy000doqutlnr0utk4	cmlzdcac7001m11jlkv1hf7ga
cmlzdcae5001v11jlx20nwifb	cmm023vr7000goqutfjm806i2
cmm023vr7000goqutfjm806i2	cmlzdcae5001v11jlx20nwifb
cmlzdcae5001v11jlx20nwifb	cmm023vrk000koqut853zr9vv
cmm023vrk000koqut853zr9vv	cmlzdcae5001v11jlx20nwifb
cmlzdcaef001w11jlg3xvc1ld	cmm023vrk000koqut853zr9vv
cmm023vrk000koqut853zr9vv	cmlzdcaef001w11jlg3xvc1ld
cmlzzvv8s0000pddrjfqdn4ul	cmm023vr5000foqutg4ppycgz
cmm023vr5000foqutg4ppycgz	cmlzzvv8s0000pddrjfqdn4ul
cmlzzvv8s0000pddrjfqdn4ul	cmm023vrk000koqut853zr9vv
cmm023vrk000koqut853zr9vv	cmlzzvv8s0000pddrjfqdn4ul
cmlzdcael001x11jlvcwa15nv	cmlzzvv8x0001pddr37fi77sa
cmlzzvv8x0001pddr37fi77sa	cmlzdcael001x11jlvcwa15nv
cmlzdcael001x11jlvcwa15nv	cmm023vre000ioqutsrjemnr4
cmm023vre000ioqutsrjemnr4	cmlzdcael001x11jlvcwa15nv
cmlzzvv8x0001pddr37fi77sa	cmm023vrb000hoqutqv2m1oxg
cmm023vrb000hoqutqv2m1oxg	cmlzzvv8x0001pddr37fi77sa
cmlzzvv8x0001pddr37fi77sa	cmm023vrh000joqutlb9axi5w
cmm023vrh000joqutlb9axi5w	cmlzzvv8x0001pddr37fi77sa
cmlzdcaes001y11jl2exl4cfi	cmm023vre000ioqutsrjemnr4
cmm023vre000ioqutsrjemnr4	cmlzdcaes001y11jl2exl4cfi
cmlzdcacf001n11jl27x9zqhe	cmlzzvv930003pddrrtcxbkdn
cmlzzvv930003pddrrtcxbkdn	cmlzdcacf001n11jl27x9zqhe
cmlzdcafb002211jlia06estv	cmm023vrp000moqutbhaewxss
cmm023vrp000moqutbhaewxss	cmlzdcafb002211jlia06estv
cmlzdcafi002311jl8966mx1q	cmlzdcafm002411jl4wthmg2y
cmlzdcafm002411jl4wthmg2y	cmlzdcafi002311jl8966mx1q
cmlzdcafi002311jl8966mx1q	cmm023vrt000noqutheg3dkpg
cmm023vrt000noqutheg3dkpg	cmlzdcafi002311jl8966mx1q
cmlzdcafm002411jl4wthmg2y	cmm023vrn000loqutdqn2ezfk
cmm023vrn000loqutdqn2ezfk	cmlzdcafm002411jl4wthmg2y
cmlzdcafq002511jlv6jtambl	cmm023vrp000moqutbhaewxss
cmm023vrp000moqutbhaewxss	cmlzdcafq002511jlv6jtambl
cmlzdcaf6002111jl0bi4su3q	cmm023vrw000ooqutyzlloz88
cmm023vrw000ooqutyzlloz88	cmlzdcaf6002111jl0bi4su3q
\.


--
-- Data for Name: exercise_equipment; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.exercise_equipment ("exerciseId", "equipmentId") FROM stdin;
cmlzdca9o001a11jl6e68w6k8	cmlzdca7w000011jln64nuh8z
cmlzdca9o001a11jl6e68w6k8	cmlzdca8o000j11jlz8t9iu2s
cmlzdca9o001a11jl6e68w6k8	cmlzdca8m000i11jl9kb8bp0t
cmlzdcaa2001b11jljh08hwvo	cmlzdca7w000011jln64nuh8z
cmlzdcaa2001b11jljh08hwvo	cmlzdca8p000k11jlnfyua5m0
cmlzdcaa2001b11jljh08hwvo	cmlzdca8m000i11jl9kb8bp0t
cmlzdcaac001c11jl4snhn7mc	cmlzdca80000211jlowx6r935
cmlzdcaac001c11jl4snhn7mc	cmlzdca8o000j11jlz8t9iu2s
cmlzdcaal001d11jl5s826i3o	cmlzdca80000211jlowx6r935
cmlzdcaal001d11jl5s826i3o	cmlzdca8o000j11jlz8t9iu2s
cmlzdcaas001e11jl7f77g87w	cmlzdca83000411jly6zsxcbi
cmlzdcaay001f11jllfppnro4	cmlzdca8x000q11jlbooyr2a1
cmlzdcab6001g11jlh3ckucxp	cmlzdca8e000c11jl0q6b7cd8
cmlzdcaba001h11jlw4qesrqg	cmlzdca7w000011jln64nuh8z
cmlzdcaba001h11jlw4qesrqg	cmlzdca8m000i11jl9kb8bp0t
cmlzdcabl001i11jluth1tf18	cmlzdca80000211jlowx6r935
cmlzdcabq001j11jlu2kfdsj9	cmlzdca85000511jlhqfjyb1k
cmlzdcabx001k11jlx8f4vj9f	cmlzdca8k000g11jl1dl8nkd8
cmlzdcac2001l11jlfcj3qhwn	cmlzdca7z000111jlg3bb5f2c
cmlzdcac2001l11jlfcj3qhwn	cmlzdca8o000j11jlz8t9iu2s
cmlzdcac7001m11jlkv1hf7ga	cmlzdca8r000m11jl8mz2ntz0
cmlzdcac7001m11jlkv1hf7ga	cmlzdca8x000q11jlbooyr2a1
cmlzdcacf001n11jl27x9zqhe	cmlzdca7w000011jln64nuh8z
cmlzdcacf001n11jl27x9zqhe	cmlzdca82000311jl4vi8juwl
cmlzdcacs001o11jl81sagr15	cmlzdca8r000m11jl8mz2ntz0
cmlzdcacs001o11jl81sagr15	cmlzdca8x000q11jlbooyr2a1
cmlzdcad0001p11jlpe0uoije	cmlzdca86000611jlktk9s0am
cmlzdcad7001q11jlz2tk17nx	cmlzdca88000711jlvm0oupf6
cmlzdcadf001r11jlj17yojvy	cmlzdca7w000011jln64nuh8z
cmlzdcadp001s11jledg98qnn	cmlzdca8k000g11jl1dl8nkd8
cmlzdcadv001t11jle8emlqd5	cmlzdca7w000011jln64nuh8z
cmlzdcadz001u11jljizol0p2	cmlzdca80000211jlowx6r935
cmlzdcae5001v11jlx20nwifb	cmlzdca7w000011jln64nuh8z
cmlzdcae5001v11jlx20nwifb	cmlzdca8m000i11jl9kb8bp0t
cmlzdcaef001w11jlg3xvc1ld	cmlzdca89000811jl16vcjq9i
cmlzdcael001x11jlvcwa15nv	cmlzdca7w000011jln64nuh8z
cmlzdcaes001y11jl2exl4cfi	cmlzdca8a000911jlj94r1emm
cmlzdcaew001z11jl05mkwr06	cmlzdca8c000a11jlszl6p099
cmlzdcaf0002011jljukrmp61	cmlzdca8d000b11jlt9uzb4uv
cmlzdcaf6002111jl0bi4su3q	cmlzdca8x000q11jlbooyr2a1
cmlzdcaf6002111jl0bi4su3q	cmlzdca80000211jlowx6r935
cmlzdcafb002211jlia06estv	cmlzdca8x000q11jlbooyr2a1
cmlzdcafi002311jl8966mx1q	cmlzdca8x000q11jlbooyr2a1
cmlzdcafm002411jl4wthmg2y	cmlzdca8k000g11jl1dl8nkd8
cmlzdcafq002511jlv6jtambl	cmlzdca8x000q11jlbooyr2a1
cmm023vpn0000oqut4jzpz9uk	cmlzdca8q000l11jlu8sy8ttv
cmm023vpn0000oqut4jzpz9uk	cmlzdca7w000011jln64nuh8z
cmm023vpn0000oqut4jzpz9uk	cmlzdca82000311jl4vi8juwl
cmm023vpu0001oqut0t7ijffw	cmlzdca8p000k11jlnfyua5m0
cmm023vpu0001oqut0t7ijffw	cmlzdca80000211jlowx6r935
cmm023vpy0002oqutxabptg6e	cmlzdca8l000h11jlxnxmkcxj
cmm023vq20003oqutch89wzql	cmlzdca80000211jlowx6r935
cmm023vq20003oqutch89wzql	cmlzdca8o000j11jlz8t9iu2s
cmm023vq50004oqutaawnuqmb	cmlzdca8k000g11jl1dl8nkd8
cmm023vq80005oqut77k4kbv5	cmlzdca8r000m11jl8mz2ntz0
cmm023vqc0006oquti1h3355g	cmlzdca7w000011jln64nuh8z
cmm023vqc0006oquti1h3355g	cmlzdca82000311jl4vi8juwl
cmm023vqe0007oqut9hv4hylu	cmlzdca80000211jlowx6r935
cmm023vqe0007oqut9hv4hylu	cmlzdca8o000j11jlz8t9iu2s
cmm023vqj0008oqut09p4v06v	cmlzdca80000211jlowx6r935
cmm023vqm0009oqut4vhaa9am	cmlzdca8k000g11jl1dl8nkd8
cmm023vqp000aoqutrdl6m58j	cmlzdca80000211jlowx6r935
cmm023vqs000boqut76fpmlw7	cmlzdca8g000d11jl30ijkjv8
cmm023vqs000boqut76fpmlw7	cmlzdca7z000111jlg3bb5f2c
cmm023vqv000coquti2b09yqx	cmlzdca80000211jlowx6r935
cmm023vqy000doqutlnr0utk4	cmlzdca80000211jlowx6r935
cmm023vr1000eoqutt1sh2uh9	cmlzdca7w000011jln64nuh8z
cmm023vr1000eoqutt1sh2uh9	cmlzdca8o000j11jlz8t9iu2s
cmm023vr5000foqutg4ppycgz	cmlzdca80000211jlowx6r935
cmm023vr5000foqutg4ppycgz	cmlzdca8x000q11jlbooyr2a1
cmm023vr7000goqutfjm806i2	cmlzdca7w000011jln64nuh8z
cmm023vr7000goqutfjm806i2	cmlzdca8m000i11jl9kb8bp0t
cmm023vrb000hoqutqv2m1oxg	cmlzdca8x000q11jlbooyr2a1
cmm023vre000ioqutsrjemnr4	cmlzdca8a000911jlj94r1emm
cmm023vrh000joqutlb9axi5w	cmlzdca8k000g11jl1dl8nkd8
cmm023vrk000koqut853zr9vv	cmlzdca8d000b11jlt9uzb4uv
cmm023vrn000loqutdqn2ezfk	cmlzdca8r000m11jl8mz2ntz0
cmm023vrp000moqutbhaewxss	cmlzdca8x000q11jlbooyr2a1
cmm023vrt000noqutheg3dkpg	cmlzdca8x000q11jlbooyr2a1
cmm023vrw000ooqutyzlloz88	cmlzdca89000811jl16vcjq9i
\.


--
-- Data for Name: exercise_muscles; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.exercise_muscles ("exerciseId", "muscleGroupId", "isPrimary") FROM stdin;
cmlzdca9o001a11jl6e68w6k8	cmlzdca8y000r11jlwjmm82t4	t
cmlzdca9o001a11jl6e68w6k8	cmlzdca98000y11jlnqcnzqmp	f
cmlzdca9o001a11jl6e68w6k8	cmlzdca9c001111jl9matn1ld	f
cmlzdcaa2001b11jljh08hwvo	cmlzdca90000s11jl07tslweq	t
cmlzdcaa2001b11jljh08hwvo	cmlzdca98000y11jlnqcnzqmp	f
cmlzdcaa2001b11jljh08hwvo	cmlzdca9c001111jl9matn1ld	f
cmlzdcaac001c11jl4snhn7mc	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcaac001c11jl4snhn7mc	cmlzdca98000y11jlnqcnzqmp	f
cmlzdcaac001c11jl4snhn7mc	cmlzdca9c001111jl9matn1ld	f
cmlzdcaal001d11jl5s826i3o	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcaal001d11jl5s826i3o	cmlzdca98000y11jlnqcnzqmp	f
cmlzdcaas001e11jl7f77g87w	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcaas001e11jl7f77g87w	cmlzdca9c001111jl9matn1ld	f
cmlzdcaay001f11jllfppnro4	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcaay001f11jllfppnro4	cmlzdca98000y11jlnqcnzqmp	f
cmlzdcaay001f11jllfppnro4	cmlzdca9c001111jl9matn1ld	f
cmlzdcab6001g11jlh3ckucxp	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcaba001h11jlw4qesrqg	cmlzdca98000y11jlnqcnzqmp	t
cmlzdcaba001h11jlw4qesrqg	cmlzdca99000z11jlrh9smtvw	t
cmlzdcaba001h11jlw4qesrqg	cmlzdca9c001111jl9matn1ld	f
cmlzdcaba001h11jlw4qesrqg	cmlzdca94000v11jlifmevsus	f
cmlzdcabl001i11jluth1tf18	cmlzdca99000z11jlrh9smtvw	t
cmlzdcabq001j11jlu2kfdsj9	cmlzdca98000y11jlnqcnzqmp	t
cmlzdcabq001j11jlu2kfdsj9	cmlzdca99000z11jlrh9smtvw	t
cmlzdcabq001j11jlu2kfdsj9	cmlzdca9c001111jl9matn1ld	f
cmlzdcabx001k11jlx8f4vj9f	cmlzdca9c001111jl9matn1ld	t
cmlzdcac2001l11jlfcj3qhwn	cmlzdca9c001111jl9matn1ld	t
cmlzdcac7001m11jlkv1hf7ga	cmlzdca9c001111jl9matn1ld	t
cmlzdcac7001m11jlkv1hf7ga	cmlzdca8y000r11jlwjmm82t4	t
cmlzdcacf001n11jl27x9zqhe	cmlzdca97000x11jl65q9fkg5	t
cmlzdcacf001n11jl27x9zqhe	cmlzdca9h001511jlvduyiahb	t
cmlzdcacf001n11jl27x9zqhe	cmlzdca9g001411jluxl2qvyp	t
cmlzdcacf001n11jl27x9zqhe	cmlzdca94000v11jlifmevsus	f
cmlzdcacf001n11jl27x9zqhe	cmlzdca9d001211jlezlnzpzb	f
cmlzdcacf001n11jl27x9zqhe	cmlzdca9f001311jlotbdumke	f
cmlzdcacs001o11jl81sagr15	cmlzdca91000t11jlopv0hyy9	t
cmlzdcacs001o11jl81sagr15	cmlzdca9a001011jl5eedh5bc	f
cmlzdcacs001o11jl81sagr15	cmlzdca93000u11jlpb2nfjlj	f
cmlzdcad0001p11jlpe0uoije	cmlzdca91000t11jlopv0hyy9	t
cmlzdcad0001p11jlpe0uoije	cmlzdca9a001011jl5eedh5bc	f
cmlzdcad0001p11jlpe0uoije	cmlzdca93000u11jlpb2nfjlj	f
cmlzdcad7001q11jlz2tk17nx	cmlzdca93000u11jlpb2nfjlj	t
cmlzdcad7001q11jlz2tk17nx	cmlzdca91000t11jlopv0hyy9	t
cmlzdcad7001q11jlz2tk17nx	cmlzdca9a001011jl5eedh5bc	f
cmlzdcad7001q11jlz2tk17nx	cmlzdca95000w11jls9zw8kcl	f
cmlzdcadf001r11jlj17yojvy	cmlzdca91000t11jlopv0hyy9	t
cmlzdcadf001r11jlj17yojvy	cmlzdca93000u11jlpb2nfjlj	t
cmlzdcadf001r11jlj17yojvy	cmlzdca9a001011jl5eedh5bc	f
cmlzdcadf001r11jlj17yojvy	cmlzdca95000w11jls9zw8kcl	f
cmlzdcadf001r11jlj17yojvy	cmlzdca97000x11jl65q9fkg5	f
cmlzdcadp001s11jledg98qnn	cmlzdca95000w11jls9zw8kcl	t
cmlzdcadp001s11jledg98qnn	cmlzdca93000u11jlpb2nfjlj	f
cmlzdcadp001s11jledg98qnn	cmlzdca94000v11jlifmevsus	f
cmlzdcadv001t11jle8emlqd5	cmlzdca9a001011jl5eedh5bc	t
cmlzdcadz001u11jljizol0p2	cmlzdca9a001011jl5eedh5bc	t
cmlzdcadz001u11jljizol0p2	cmlzdca9d001211jlezlnzpzb	f
cmlzdcae5001v11jlx20nwifb	cmlzdca9f001311jlotbdumke	t
cmlzdcae5001v11jlx20nwifb	cmlzdca9h001511jlvduyiahb	t
cmlzdcae5001v11jlx20nwifb	cmlzdca9g001411jluxl2qvyp	f
cmlzdcae5001v11jlx20nwifb	cmlzdca97000x11jl65q9fkg5	f
cmlzdcaef001w11jlg3xvc1ld	cmlzdca9f001311jlotbdumke	t
cmlzdcaef001w11jlg3xvc1ld	cmlzdca9h001511jlvduyiahb	t
cmlzdcaef001w11jlg3xvc1ld	cmlzdca9g001411jluxl2qvyp	f
cmlzdcael001x11jlvcwa15nv	cmlzdca9g001411jluxl2qvyp	t
cmlzdcael001x11jlvcwa15nv	cmlzdca9h001511jlvduyiahb	t
cmlzdcael001x11jlvcwa15nv	cmlzdca97000x11jl65q9fkg5	f
cmlzdcaes001y11jl2exl4cfi	cmlzdca9g001411jluxl2qvyp	t
cmlzdcaew001z11jl05mkwr06	cmlzdca9f001311jlotbdumke	t
cmlzdcaf0002011jljukrmp61	cmlzdca9f001311jlotbdumke	t
cmlzdcaf0002011jljukrmp61	cmlzdca9h001511jlvduyiahb	f
cmlzdcaf6002111jl0bi4su3q	cmlzdca9i001611jl7q1lxh7d	t
cmlzdcafb002211jlia06estv	cmlzdca9k001711jlhijqumsi	t
cmlzdcafb002211jlia06estv	cmlzdca9l001811jlizh5wp8q	f
cmlzdcafb002211jlia06estv	cmlzdca97000x11jl65q9fkg5	f
cmlzdcafi002311jl8966mx1q	cmlzdca9k001711jlhijqumsi	t
cmlzdcafm002411jl4wthmg2y	cmlzdca9k001711jlhijqumsi	t
cmlzdcafq002511jlv6jtambl	cmlzdca9l001811jlizh5wp8q	t
cmlzzvv8s0000pddrjfqdn4ul	cmlzdca9f001311jlotbdumke	t
cmlzzvv8s0000pddrjfqdn4ul	cmlzdca9h001511jlvduyiahb	f
cmlzzvv8s0000pddrjfqdn4ul	cmlzdca9g001411jluxl2qvyp	f
cmlzzvv8x0001pddr37fi77sa	cmlzdca9h001511jlvduyiahb	t
cmlzzvv8x0001pddr37fi77sa	cmlzdca9g001411jluxl2qvyp	f
cmlzzvv900002pddrut303r65	cmlzdca9a001011jl5eedh5bc	t
cmlzzvv900002pddrut303r65	cmlzdca9d001211jlezlnzpzb	f
cmlzzvv930003pddrrtcxbkdn	cmlzdca97000x11jl65q9fkg5	t
cmlzzvv930003pddrrtcxbkdn	cmlzdca9h001511jlvduyiahb	f
cmlzzvv930003pddrrtcxbkdn	cmlzdca9g001411jluxl2qvyp	f
cmlzzvv960004pddrrmm37ftu	cmlzdca90000s11jl07tslweq	t
cmlzzvv960004pddrrmm37ftu	cmlzdca8y000r11jlwjmm82t4	f
cmlzzvv960004pddrrmm37ftu	cmlzdca98000y11jlnqcnzqmp	f
cmlzzvv990005pddrxvx21c5y	cmlzdca9a001011jl5eedh5bc	t
cmlzzvv990005pddrxvx21c5y	cmlzdca9d001211jlezlnzpzb	f
cmlzzvv9c0006pddr8e4gho6a	cmlzdca99000z11jlrh9smtvw	t
cmlzzvv9c0006pddr8e4gho6a	cmlzdca98000y11jlnqcnzqmp	f
cmm023vpn0000oqut4jzpz9uk	cmlzdca8y000r11jlwjmm82t4	t
cmm023vpn0000oqut4jzpz9uk	cmlzdca9c001111jl9matn1ld	f
cmm023vpn0000oqut4jzpz9uk	cmlzdca98000y11jlnqcnzqmp	f
cmm023vpu0001oqut0t7ijffw	cmlzdca90000s11jl07tslweq	t
cmm023vpu0001oqut0t7ijffw	cmlzdca8y000r11jlwjmm82t4	f
cmm023vpu0001oqut0t7ijffw	cmlzdca9c001111jl9matn1ld	f
cmm023vpu0001oqut0t7ijffw	cmlzdca98000y11jlnqcnzqmp	f
cmm023vpy0002oqutxabptg6e	cmlzdca8y000r11jlwjmm82t4	t
cmm023vpy0002oqutxabptg6e	cmlzdca90000s11jl07tslweq	f
cmm023vpy0002oqutxabptg6e	cmlzdca98000y11jlnqcnzqmp	f
cmm023vq20003oqutch89wzql	cmlzdca91000t11jlopv0hyy9	t
cmm023vq20003oqutch89wzql	cmlzdca93000u11jlpb2nfjlj	f
cmm023vq20003oqutch89wzql	cmlzdca95000w11jls9zw8kcl	f
cmm023vq20003oqutch89wzql	cmlzdca9a001011jl5eedh5bc	f
cmm023vq50004oqutaawnuqmb	cmlzdca91000t11jlopv0hyy9	t
cmm023vq50004oqutaawnuqmb	cmlzdca9c001111jl9matn1ld	f
cmm023vq50004oqutaawnuqmb	cmlzdca95000w11jls9zw8kcl	f
cmm023vq80005oqut77k4kbv5	cmlzdca91000t11jlopv0hyy9	t
cmm023vq80005oqut77k4kbv5	cmlzdca93000u11jlpb2nfjlj	f
cmm023vq80005oqut77k4kbv5	cmlzdca9a001011jl5eedh5bc	f
cmm023vq80005oqut77k4kbv5	cmlzdca95000w11jls9zw8kcl	f
cmm023vqc0006oquti1h3355g	cmlzdca93000u11jlpb2nfjlj	t
cmm023vqc0006oquti1h3355g	cmlzdca91000t11jlopv0hyy9	f
cmm023vqc0006oquti1h3355g	cmlzdca94000v11jlifmevsus	f
cmm023vqc0006oquti1h3355g	cmlzdca9a001011jl5eedh5bc	f
cmm023vqe0007oqut9hv4hylu	cmlzdca98000y11jlnqcnzqmp	t
cmm023vqe0007oqut9hv4hylu	cmlzdca99000z11jlrh9smtvw	f
cmm023vqe0007oqut9hv4hylu	cmlzdca9c001111jl9matn1ld	f
cmm023vqe0007oqut9hv4hylu	cmlzdca94000v11jlifmevsus	f
cmm023vqj0008oqut09p4v06v	cmlzdca98000y11jlnqcnzqmp	t
cmm023vqj0008oqut09p4v06v	cmlzdca99000z11jlrh9smtvw	f
cmm023vqj0008oqut09p4v06v	cmlzdca95000w11jls9zw8kcl	f
cmm023vqj0008oqut09p4v06v	cmlzdca9c001111jl9matn1ld	f
cmm023vqm0009oqut4vhaa9am	cmlzdca99000z11jlrh9smtvw	t
cmm023vqm0009oqut4vhaa9am	cmlzdca94000v11jlifmevsus	f
cmm023vqm0009oqut4vhaa9am	cmlzdca95000w11jls9zw8kcl	f
cmm023vqp000aoqutrdl6m58j	cmlzdca95000w11jls9zw8kcl	t
cmm023vqp000aoqutrdl6m58j	cmlzdca93000u11jlpb2nfjlj	f
cmm023vqp000aoqutrdl6m58j	cmlzdca94000v11jlifmevsus	f
cmm023vqs000boqut76fpmlw7	cmlzdca9a001011jl5eedh5bc	t
cmm023vqs000boqut76fpmlw7	cmlzdca9d001211jlezlnzpzb	f
cmm023vqv000coquti2b09yqx	cmlzdca9a001011jl5eedh5bc	t
cmm023vqv000coquti2b09yqx	cmlzdca9d001211jlezlnzpzb	f
cmm023vqy000doqutlnr0utk4	cmlzdca9c001111jl9matn1ld	t
cmm023vr1000eoqutt1sh2uh9	cmlzdca9c001111jl9matn1ld	t
cmm023vr1000eoqutt1sh2uh9	cmlzdca8y000r11jlwjmm82t4	f
cmm023vr1000eoqutt1sh2uh9	cmlzdca98000y11jlnqcnzqmp	f
cmm023vr5000foqutg4ppycgz	cmlzdca9f001311jlotbdumke	t
cmm023vr5000foqutg4ppycgz	cmlzdca9h001511jlvduyiahb	f
cmm023vr5000foqutg4ppycgz	cmlzdca9g001411jluxl2qvyp	f
cmm023vr7000goqutfjm806i2	cmlzdca9f001311jlotbdumke	t
cmm023vr7000goqutfjm806i2	cmlzdca9h001511jlvduyiahb	f
cmm023vr7000goqutfjm806i2	cmlzdca9k001711jlhijqumsi	f
cmm023vr7000goqutfjm806i2	cmlzdca97000x11jl65q9fkg5	f
cmm023vrb000hoqutqv2m1oxg	cmlzdca9h001511jlvduyiahb	t
cmm023vrb000hoqutqv2m1oxg	cmlzdca9g001411jluxl2qvyp	f
cmm023vre000ioqutsrjemnr4	cmlzdca9g001411jluxl2qvyp	t
cmm023vre000ioqutsrjemnr4	cmlzdca9i001611jl7q1lxh7d	f
cmm023vrh000joqutlb9axi5w	cmlzdca9h001511jlvduyiahb	t
cmm023vrh000joqutlb9axi5w	cmlzdca9g001411jluxl2qvyp	f
cmm023vrk000koqut853zr9vv	cmlzdca9f001311jlotbdumke	t
cmm023vrk000koqut853zr9vv	cmlzdca9h001511jlvduyiahb	f
cmm023vrk000koqut853zr9vv	cmlzdca9g001411jluxl2qvyp	f
cmm023vrn000loqutdqn2ezfk	cmlzdca9k001711jlhijqumsi	t
cmm023vrn000loqutdqn2ezfk	cmlzdca9n001911jl60q9rwpm	f
cmm023vrn000loqutdqn2ezfk	cmlzdca9l001811jlizh5wp8q	f
cmm023vrp000moqutbhaewxss	cmlzdca9l001811jlizh5wp8q	t
cmm023vrp000moqutbhaewxss	cmlzdca9k001711jlhijqumsi	f
cmm023vrt000noqutheg3dkpg	cmlzdca9k001711jlhijqumsi	t
cmm023vrt000noqutheg3dkpg	cmlzdca9n001911jl60q9rwpm	f
cmm023vrw000ooqutyzlloz88	cmlzdca9i001611jl7q1lxh7d	t
\.


--
-- Data for Name: exercises; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.exercises (id, name, description, "stepInstructions", difficulty, "exerciseType", "gifUrl", "videoUrl", "createdAt") FROM stdin;
cmlzdcaal001d11jl5s826i3o	啞鈴飛鳥 Dumbbell Fly	孤立胸大肌的展翅動作	["躺於平板凳，啞鈴舉於胸口上方，手肘微彎", "雙臂向兩側張開，呈弧形下降", "直到感受到胸肌充分伸展時停止（約與肩同高）", "收縮胸肌，沿原弧線將啞鈴合攏至起始位置", "全程保持手肘微彎，避免鎖死"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.549
cmlzdcaas001e11jl7f77g87w	胸推機 Chest Press Machine	機器式臥推，適合初學者建立基礎	["調整座椅高度，使把手位於胸口中間高度", "坐直，背部緊貼靠背，腳踩地板", "雙手握住把手，推出至手臂伸直", "緩慢收回，感受胸肌伸展", "機器提供穩定軌跡，適合練習胸肌發力感"]	BEGINNER	COMPOUND	\N	\N	2026-02-23 16:06:03.556
cmlzdcaay001f11jllfppnro4	伏地挺身 Push-up	經典自重訓練，不需任何器材	["俯臥，雙手置於胸口兩側，比肩略寬", "腳尖著地，身體成一直線", "彎曲手肘，下降至胸口接近地面", "推回起始位置，保持核心緊繃", "初學者可以膝蓋著地降低難度"]	BEGINNER	COMPOUND	\N	\N	2026-02-23 16:06:03.563
cmlzdcabq001j11jlu2kfdsj9	肩推機 Shoulder Press Machine	機器式肩推，軌跡固定更安全	["調整座椅使把手位於肩膀高度", "背部緊貼靠背，握住把手", "向上推至手臂伸直", "緩慢下放至起始位置"]	BEGINNER	COMPOUND	\N	\N	2026-02-23 16:06:03.59
cmlzdcac2001l11jlfcj3qhwn	臥式三頭屈伸 Skull Crusher	EZ槓臥式三頭訓練，也稱法式推舉	["躺於平板凳，雙手握EZ槓伸直至胸口上方", "固定上臂不動，彎曲手肘使槓鈴下降至頭部後方", "感受三頭肌伸展後，收縮三頭肌推回起始位置", "上臂全程保持垂直地面"]	INTERMEDIATE	ISOLATION	\N	\N	2026-02-23 16:06:03.602
cmlzdcac7001m11jlkv1hf7ga	雙槓撐體 Dips	自重訓練，可訓練胸部或三頭肌（依身體傾斜角度）	["雙手握住雙槓，身體懸空", "彎曲手肘緩慢下沉", "訓練三頭肌：身體保持直立，下降約90度", "訓練胸部：身體前傾，下降至感受胸肌伸展", "推回起始位置"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-23 16:06:03.608
cmlzdcadv001t11jle8emlqd5	槓鈴彎舉 Barbell Bicep Curl	二頭肌訓練的基礎動作	["站立，正握槓鈴（掌心向上），手臂伸直", "上臂緊靠身體兩側固定不動", "彎曲手肘，將槓鈴捲起至肩膀前方", "頂端稍作停頓，感受二頭肌收縮", "緩慢下放，不要完全放鬆"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.668
cmlzdcadf001r11jlj17yojvy	槓鈴划船 Barbell Row	自由重量背部訓練，訓練背部厚度	["髖折疊、背部與地約平行", "槓拉向下胸/腹上", "肘沿身體兩側後拉", "動作底端完全伸展", "── 常見錯誤 ──", "⚠️ 借力甩槓", "⚠️ 聳肩拉", "⚠️ 槓路忽前忽後"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/110/Reverse-grip-bent-over-rows-1.png	https://www.youtube.com/watch?v=axoeDmW0oAY	2026-02-23 16:06:03.652
cmlzdcabx001k11jlx8f4vj9f	纜繩三頭下壓 Cable Tricep Pushdown	纜繩機三頭下壓，孤立三頭肌訓練	["上臂貼近軀幹、肘做鉸鏈", "向下伸直到完全伸展但不鎖死", "離心3秒控制", "── 常見錯誤 ──", "⚠️ 身體過度前傾借力", "⚠️ 手腕內折"]	BEGINNER	ISOLATION	https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png	https://www.youtube.com/watch?v=6Fzep104f0s	2026-02-23 16:06:03.598
cmlzdcacf001n11jl27x9zqhe	硬舉 Deadlift	全身性複合動作，是力量訓練之王	["槓置腳中線上方", "髖後移、脊柱中立", "脛貼槓、上背緊", "腳推地、槓貼腿上滑至鎖定", "── 常見錯誤 ──", "⚠️ 拉起前槓離身", "⚠️ 下背圓曲", "⚠️ 起始髖太低或太高導致槓路偏離"]	ADVANCED	COMPOUND	https://wger.de/media/exercise-images/161/Dead-lifts-2.png	https://www.youtube.com/watch?v=NYN3UGCYisk	2026-02-23 16:06:03.616
cmlzdcad0001p11jlpe0uoije	滑輪下拉 Lat Pulldown	使用機器模擬引體向上，適合初學者	["肩胛先下沉內收", "拉至胸靠近把手", "控制離心", "握距中等", "── 常見錯誤 ──", "⚠️ 只用手臂拉、忽略肩胛運動", "⚠️ 半程", "⚠️ 身體大幅擺動"]	BEGINNER	COMPOUND	\N	https://www.youtube.com/watch?v=O94yEoGXtBY	2026-02-23 16:06:03.637
cmlzdcacs001o11jl81sagr15	引體向上 Pull-up	背部訓練之王，全面訓練背闊肌	["肩胛先下沉內收", "拉至胸靠近槓/把手", "控制離心", "握距中等", "── 常見錯誤 ──", "⚠️ 只用手臂拉、忽略肩胛運動", "⚠️ 半程", "⚠️ 身體大幅擺動"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/181/Chin-ups-2.png	https://www.youtube.com/watch?v=O94yEoGXtBY	2026-02-23 16:06:03.628
cmlzdcab6001g11jlh3ckucxp	蝴蝶機夾胸 Pec Deck Fly	使用蝴蝶機的孤立胸肌訓練	["上胸型：把手低到高收合", "中胸型：平行路徑", "全程手肘微彎固定、胸骨抬高", "── 常見錯誤 ──", "⚠️ 前臂彎伸變成推胸", "⚠️ 動作過快失去峰縮"]	BEGINNER	ISOLATION	\N	https://www.youtube.com/watch?v=JUDTGZh4rhg	2026-02-23 16:06:03.57
cmlzdcaac001c11jl4snhn7mc	啞鈴臥推 Dumbbell Bench Press	使用啞鈴的臥推，活動範圍更大	["躺平後，將啞鈴舉在胸部正上方", "緩慢下放啞鈴至胸部兩側，手肘與身體呈45-60度", "利用胸部力量將啞鈴推回起始位置", "── 常見錯誤 ──", "⚠️ 下放太快失去控制", "⚠️ 手肘過度外張"]	BEGINNER	COMPOUND	\N	https://www.youtube.com/watch?v=cbHSvdIR0Kk	2026-02-23 16:06:03.541
cmlzdcad7001q11jlz2tk17nx	坐姿划船 Seated Cable Row	訓練背部厚度的划船動作	["坐在器材上，胸口靠著墊子", "利用背部肌群的力量將把手向後拉，同時收緊肩胛骨", "緩慢地放回，感受背部的伸展", "── 常見錯誤 ──", "⚠️ 借力甩動", "⚠️ 上背圓曲"]	BEGINNER	COMPOUND	\N	https://www.youtube.com/watch?v=ciEXVQ76_zc	2026-02-23 16:06:03.644
cmlzdcabl001i11jluth1tf18	啞鈴側平舉 Dumbbell Lateral Raise	孤立側三角肌的經典動作	["肩外展為主、肘約15°彎", "手肘領先手腕", "頂點短暫停留", "── 常見錯誤 ──", "⚠️ 聳肩代償", "⚠️ 下放無控制", "⚠️ 幅度過高影響肩夾擠"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.586
cmlzdcadp001s11jledg98qnn	臉拉 Face Pull	訓練後三角肌和菱形肌，預防肩部傷害	["把手拉向眉/額高度，肘領先、肩胛外展轉內收", "終點前臂與地面平行", "── 常見錯誤 ──", "⚠️ 手腕內旋導致肩夾擠", "⚠️ 肘過低成肱三下壓"]	BEGINNER	ISOLATION	https://wger.de/media/exercise-images/1732/d13b9adb-968e-4f73-95e6-b16690bcf616.jpg	https://www.youtube.com/watch?v=eIq5CB9JfKE	2026-02-23 16:06:03.661
cmlzdcadz001u11jljizol0p2	啞鈴錘式彎舉 Dumbbell Hammer Curl	中性握法彎舉，同時訓練二頭肌和前臂	["站立，雙手各握一啞鈴，中性握（大拇指朝上）", "上臂固定，交替或同時彎舉", "將啞鈴捲起至肩膀高度", "緩慢下放，感受前臂肱橈肌伸展"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.672
cmlzdcafb002211jlia06estv	棒式 Plank	靜態核心訓練，全面強化腹部和背部	["俯臥，前臂和腳尖支撐，身體離地", "身體成一直線，從頭到腳踝", "收緊腹部和臀部，不要讓腰部下沉或翹起", "保持正常呼吸，維持指定時間"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.719
cmlzdcafi002311jl8966mx1q	仰臥起坐 Crunches	訓練腹直肌的基礎動作	["仰臥，膝蓋彎曲，腳踩地板", "雙手交叉放在胸前或輕扶耳朵兩側", "收縮腹肌，抬起肩膀和頭部離地", "到達頂點後緩慢下放，不完全躺回地面"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.726
cmlzdcafm002411jl4wthmg2y	纜繩捲腹 Cable Crunch	使用纜繩機的加重捲腹訓練	["跪在高位纜繩機前，握住繩索把手放在頭部兩側", "上身微向前傾，以腹肌為軸心向下捲腹", "感受腹部充分收縮後緩慢回位", "全程保持臀部固定，不要用臀部擺動借力"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.73
cmlzdcafq002511jlv6jtambl	俄羅斯轉體 Russian Twist	旋轉動作訓練腹斜肌	["坐在地板上，膝蓋彎曲，腳跟離地或輕觸地", "上身後仰約45度，雙手合握於胸前", "左右旋轉上半身，手觸地面增加難度", "可手持啞鈴增加阻力"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.734
cmlzdcaew001z11jl05mkwr06	腿屈伸 Leg Extension	孤立訓練股四頭肌的機器動作	["軸心對準膝關節、腳尖微內收", "上舉至完全伸展、停1秒", "離心控制", "── 常見錯誤 ──", "⚠️ 勾腳／踢腿太快", "⚠️ 上半身晃動"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.704
cmlzdcaes001y11jl2exl4cfi	腿彎舉 Leg Curl	孤立訓練腘繩肌的機器動作	["膝關節與機械軸對齊", "腳跟勾向臀部", "頂點停1秒", "── 常見錯誤 ──", "⚠️ 腰椎代償", "⚠️ 幅度過淺"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.7
cmlzdcaf6002111jl0bi4su3q	提踵 Calf Raise	訓練小腿肌群的基本動作	["全腳掌穩定、下放至腳跟低於平台、頂部停1秒", "膝伸直（站姿）或彎曲（坐姿）調整腓腸/比目魚比例", "── 常見錯誤 ──", "⚠️ 彈震借力", "⚠️ 半程"]	BEGINNER	ISOLATION	\N	\N	2026-02-23 16:06:03.714
cmlzzvv930003pddrrtcxbkdn	背伸展 Back Extension	\N	["髖折疊發力，上下背保持中立", "上到水平即可，不過度仰", "── 常見錯誤 ──", "⚠️ 以腰椎過伸代償", "⚠️ 下降過深"]	BEGINNER	ISOLATION	\N	https://www.youtube.com/watch?v=D98GnSHyGzA	2026-02-24 02:37:08.727
cmlzzvv960004pddrrmm37ftu	上斜繩索飛鳥 Incline Cable Fly	\N	["將長凳調整至上斜30-45度", "兩側滑輪調整至最低位置", "雙手各持把手，手臂向兩側打開手肘微彎", "利用上胸的力量以弧形軌跡向上向內夾", "── 常見錯誤 ──", "⚠️ 前臂彎伸變成推胸", "⚠️ 動作過快失去峰縮"]	INTERMEDIATE	ISOLATION	\N	https://www.youtube.com/watch?v=Vezzqyjgd0k	2026-02-24 02:37:08.73
cmlzzvv8x0001pddr37fi77sa	臀推 Hip Thrust	\N	["肩胛置於凳緣、脛垂直", "起身時骨盆後傾、頂峰收縮2秒", "軌跡近水平", "── 常見錯誤 ──", "⚠️ 腰椎代償過度伸展", "⚠️ 腳距太遠/太近導致發力點錯誤", "⚠️ 下放失控"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/1614/7f3cfae2-e062-4211-9a6b-5a10851ce7f4.jpg	https://www.youtube.com/watch?v=LM8XHLYJoYs	2026-02-24 02:37:08.721
cmlzzvv900002pddrut303r65	啞鈴彎舉 Dumbbell Curl	\N	["上臂穩定、肘靠近身體", "離心控制2–3秒", "頂峰短暫停留再下放", "── 常見錯誤 ──", "⚠️ 後仰/甩動", "⚠️ 肘前移變成前臂抬舉"]	BEGINNER	ISOLATION	https://wger.de/media/exercise-images/81/Biceps-curl-1.png	\N	2026-02-24 02:37:08.724
cmlzdcaef001w11jlg3xvc1ld	腿推機 Leg Press	機器式下肢訓練，比深蹲更容易上手	["腳放平台中上部、全腳掌發力", "下放至大腿與軀幹約90°或更深但不骨盆後傾", "推起不鎖死膝", "── 常見錯誤 ──", "⚠️ 腳尖內扣或外翻過度", "⚠️ 膝內扣", "⚠️ 只做半程"]	BEGINNER	COMPOUND	\N	https://www.youtube.com/watch?v=IZxyjW7MPJQ	2026-02-23 16:06:03.687
cmlzdcaf0002011jljukrmp61	哈克深蹲 Hack Squat	斜板式深蹲，強調股四頭肌訓練	["胸骨抬高、肘高撐起", "下蹲時膝前移、軀幹更直", "保持全腳掌受力", "── 常見錯誤 ──", "⚠️ 胸垮、肘掉", "⚠️ 腳跟離地"]	INTERMEDIATE	COMPOUND	\N	https://www.youtube.com/watch?v=BYJH0ig63HY	2026-02-23 16:06:03.709
cmlzzvv990005pddrxvx21c5y	繩索彎舉 Cable Curl	\N	["將滑輪調整至最低位置", "站在繩索機前，反握握把", "保持上手臂固定，利用二頭肌的力量將握把向上彎舉", "── 常見錯誤 ──", "⚠️ 手腕折曲", "⚠️ 上臂前後甩動"]	BEGINNER	ISOLATION	\N	https://www.youtube.com/watch?v=k7lQMIRe_vM	2026-02-24 02:37:08.733
cmlzdcae5001v11jlx20nwifb	槓鈴深蹲 Barbell Back Squat	腿部訓練之王，全面發展下肢力量	["槓放斜方肌上方（高杠）", "吸氣撐腹、膝蓋朝腳尖方向外推", "下蹲至大腿至少平行", "起身帶動為髖與膝同時伸展", "── 常見錯誤 ──", "⚠️ 膝內扣", "⚠️ 塌腰或過度骨盆前傾", "⚠️ 腳跟離地", "⚠️ 胸腔塌陷"]	ADVANCED	COMPOUND	https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg	https://www.youtube.com/watch?v=CWl0apMgshk	2026-02-23 16:06:03.678
cmlzdcael001x11jlvcwa15nv	羅馬尼亞硬舉 Romanian Deadlift	針對腘繩肌和臀部的硬舉變化式	["從站姿開始、膝微彎、髖折疊後移", "槓沿大腿下降至腿後有明顯拉伸感", "全程脊柱中立", "頂部完全鎖定", "── 常見錯誤 ──", "⚠️ 向下時彎背或下放過深導致失去髖折疊", "⚠️ 膝過度彎曲變成硬舉"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/161/Dead-lifts-2.png	https://www.youtube.com/watch?v=H_871e6OqLY	2026-02-23 16:06:03.694
cmlzdcaa2001b11jljh08hwvo	上斜槓鈴臥推 Incline Barbell Bench Press	強調上胸的臥推變化式	["肩胛內收下沉、肩膀遠離耳朵", "小拱背、胸骨抬高", "前臂垂直推槓，腳穩固踩地", "握距略寬於肩", "── 常見錯誤 ──", "⚠️ 手肘過度外張90°", "⚠️ 臀部離凳", "⚠️ 槓路忽上忽下", "⚠️ 未全程控制"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/41/Incline-bench-press-1.png	https://www.youtube.com/watch?v=vcBig73ojpE	2026-02-23 16:06:03.53
cmlzzvv9c0006pddr8e4gho6a	側平舉機 Machine Lateral Raise	\N	["肩外展為主、肘約15°彎", "手肘領先手腕", "頂點短暫停留", "── 常見錯誤 ──", "⚠️ 聳肩代償", "⚠️ 下放無控制", "⚠️ 幅度過高影響肩夾擠"]	BEGINNER	ISOLATION	\N	\N	2026-02-24 02:37:08.736
cmlzdca9o001a11jl6e68w6k8	槓鈴臥推 Barbell Bench Press	複合動作，訓練胸大肌、前三角肌和三頭肌的經典動作	["肩胛內收下沉、肩膀遠離耳朵", "小拱背、胸骨抬高", "前臂垂直推槓，腳穩固踩地", "握距略寬於肩", "── 常見錯誤 ──", "⚠️ 手肘過度外張90°", "⚠️ 臀部離凳", "⚠️ 槓路忽上忽下", "⚠️ 未全程控制"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/192/Bench-press-1.png	https://www.youtube.com/watch?v=vcBig73ojpE	2026-02-23 16:06:03.517
cmlzdcaba001h11jlw4qesrqg	槓鈴肩推 Overhead Barbell Press	站姿或坐姿槓鈴肩推，訓練整體三角肌	["握距略寬於肩", "吸氣收緊核心與臀", "槓沿臉前直線上推，過額後頭微收回至槓下", "── 常見錯誤 ──", "⚠️ 上推時過度後仰", "⚠️ 肘外翻失去前臂垂直", "⚠️ 聳肩代償"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/119/seated-barbell-shoulder-press-large-1.png	https://www.youtube.com/watch?v=_RlRDWO2jfg	2026-02-23 16:06:03.575
cmlzzvv8s0000pddrjfqdn4ul	保加利亞分腿蹲 Bulgarian Split Squat	\N	["前腳全腳掌受力，後腳腳背放凳", "下蹲時軀幹微前傾、膝蓋朝腳尖", "前膝約在腳尖上方不內扣", "── 常見錯誤 ──", "⚠️ 重心跑到後腳", "⚠️ 前腳腳跟離地", "⚠️ 髖失衡左右晃"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/1593/9815fcd6-cf40-4ddd-9b38-2eac25973de1.gif	https://www.youtube.com/watch?v=hPlKPjohFS0	2026-02-24 02:37:08.716
cmm023vpn0000oqut4jzpz9uk	下斜槓鈴臥推 Decline Barbell Bench Press	在下斜凳上進行槓鈴臥推，重點刺激下胸肌	["在下斜凳上固定雙腿，仰躺，背部貼緊凳面", "雙手握槓，比肩略寬，從架上取下槓鈴", "緩慢下放至下胸附近，感受胸肌拉伸", "有力推起，恢復初始位置", "全程核心收緊，保持穩定"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/1583/2dc7de5d-9d26-42aa-93c6-b07f6cff1888.jpg	\N	2026-02-24 03:39:21.804
cmm023vpu0001oqut0t7ijffw	上斜啞鈴臥推 Incline Dumbbell Press	在上斜凳上進行啞鈴推胸，強調上胸與前三角肌	["上斜凳調整至30-45度，仰躺並雙手持啞鈴", "啞鈴置於肩膀上方，掌心朝前", "緩慢下放至上胸兩側，感受拉伸", "用力推起，於頂部不要鎖死手肘", "全程控制動作節奏"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Dumbbell-Incline-press-1.png	\N	2026-02-24 03:39:21.81
cmm023vpy0002oqutxabptg6e	繩索飛鳥 Cable Crossover Fly	使用纜繩交叉機進行胸部飛鳥，全程張力恆定	["站於纜繩交叉機中間，雙手各持一端握把", "微微前傾，雙臂向兩側展開，保持微彎", "雙臂向前方夾合，感受胸部收縮", "緩慢還原，感受拉伸", "可調整高低滑輪以刺激不同胸部區域"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Cable-crossover-1.png	\N	2026-02-24 03:39:21.815
cmm023vq20003oqutch89wzql	單臂啞鈴划船 Single-arm Dumbbell Row	以平板凳支撐進行單側啞鈴划船，有效孤立背闊肌	["一手一腳支撐於平板凳上，身體平行地面", "另一手持啞鈴自然下垂", "肘關節引導，將啞鈴拉向髖部側方", "頂峰收縮背闊肌，緩慢放下", "兩側各完成指定組數"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Dumbbell-one-arm-bent-over-row-1.png	\N	2026-02-24 03:39:21.818
cmm023vq50004oqutaawnuqmb	直臂下拉 Straight-arm Lat Pulldown	使用繩索機，雙臂伸直下拉，孤立背闊肌	["站於高位滑輪前，雙手持寬握把，手臂幾乎伸直", "輕微前傾，核心收緊", "保持手臂伸直，將握把向下拉至大腿前方", "頂峰收縮背闊肌，緩慢還原", "全程手臂保持伸直，避免彎肘"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.822
cmm023vq80005oqut77k4kbv5	寬距引體向上 Wide-grip Pull-up	寬握距引體向上，更強調背闊肌的拉伸與收縮	["雙手握槓，比肩更寬，正握（掌心朝外）", "手臂完全伸展，雙腳離地", "核心收緊，以背闊肌的力量拉起身體", "拉至下巴過槓或鎖骨觸槓", "緩慢下放至手臂完全伸展"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/181/Chin-ups-2.png	\N	2026-02-24 03:39:21.825
cmm023vqc0006oquti1h3355g	T槓划船 T-bar Row	使用T槓或槓鈴角落固定進行划船，有效增厚背部	["槓鈴一端插入角落固定，另一端套上槓片", "雙腿跨槓而站，俯身約45度，雙手握槓末端", "以肘關節引導，將槓向腹部拉起", "頂峰收縮背部，感受菱形肌與背闊肌擠壓", "緩慢放下，保持背部平直"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.828
cmm023vqe0007oqut9hv4hylu	啞鈴肩推 Dumbbell Shoulder Press	坐姿或站姿啞鈴肩推，允許更自由的動作軌跡	["坐於有靠背的凳子上，雙手持啞鈴置於肩膀高度", "掌心朝前，上臂平行地面", "向上推起，於頭頂上方不完全鎖死手肘", "緩慢下放至起始位置", "全程保持核心收緊，避免腰部過度挺起"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Dumbbell-shoulder-press-1.png	\N	2026-02-24 03:39:21.831
cmm023vqj0008oqut09p4v06v	阿諾德推舉 Arnold Press	結合旋轉動作的啞鈴肩推，全面刺激三角肌各頭	["坐姿，雙手持啞鈴，掌心朝向自己置於肩膀高度", "推起時同時旋轉手腕，使掌心最終朝向前方", "在頂部啞鈴接近但不碰觸", "下放時同樣旋轉還原至掌心朝向自己", "動作全程流暢，不要猛力推舉"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.835
cmm023vqm0009oqut4vhaa9am	繩索側平舉 Cable Lateral Raise	使用低位繩索進行側平舉，提供持續張力	["站於低位繩索機側方，對側手抓握繩索", "另一手扶住機器保持穩定", "身體保持直立，手臂微彎", "將繩索側向拉至與肩同高，感受側三角肌收縮", "緩慢下放，全程控制張力"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.838
cmm023vqp000aoqutrdl6m58j	俯身啞鈴飛鳥 Bent-over Rear Delt Fly	俯身姿態進行啞鈴飛鳥，主要訓練後三角肌	["坐於凳邊或站姿，前傾至幾乎平行地面", "雙手持輕啞鈴，手臂微彎垂於地面", "雙臂向兩側展開，引導後三角肌收縮", "雙臂抬至與肩同高，保持短暫收縮", "緩慢下放，感受後三角肌拉伸"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.841
cmm023vqs000boqut76fpmlw7	斜板彎舉 Preacher Curl	使用牧師椅固定上臂，孤立訓練二頭肌	["坐於牧師椅，上臂緊靠斜板，雙手握EZ槓或啞鈴", "手臂完全伸展為起始位置", "以二頭肌力量將槓鈴彎舉至最高點", "頂峰收縮後緩慢放下至完全伸展", "避免讓手臂自由落下，全程控制"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.844
cmm023vqv000coquti2b09yqx	集中彎舉 Concentration Curl	坐姿以肘靠腿固定，極度孤立二頭肌	["坐於凳上，雙腿分開，持啞鈴一手肘靠於大腿內側", "上臂固定不動，以二頭肌將啞鈴彎起", "彎至最高點時旋轉手腕（小指朝外），增加峰值收縮", "緩慢下放至完全伸展", "兩側分別完成全部組數"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.848
cmm023vqy000doqutlnr0utk4	頭頂三頭伸展 Overhead Tricep Extension	在頭頂上方進行三頭伸展，有效拉伸長頭	["坐姿或站姿，雙手捧住一個啞鈴置於頭頂後方", "上臂緊貼耳朵保持固定，只移動前臂", "伸展手臂，將啞鈴推至頭頂上方", "緩慢彎曲手臂下放，感受三頭長頭拉伸", "也可使用繩索高位進行單手版本"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Seated-dumbbell-overhead-extension-1.png	\N	2026-02-24 03:39:21.851
cmm023vr1000eoqutt1sh2uh9	窄距臥推 Close-grip Bench Press	窄握距槓鈴臥推，將重心轉移至三頭肌	["仰躺於平板凳，雙手握槓比肩窄（約與肩同寬或略窄）", "從架上取下槓鈴，緩慢下放至下胸", "保持手肘靠近身體兩側", "有力推起，感受三頭肌收縮", "全程保持手腕中立，避免向外扭轉"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.854
cmm023vr5000foqutg4ppycgz	跨步蹲 Lunges	前跨步蹲，同時訓練股四頭肌、臀大肌與腘繩肌	["站立，雙手持啞鈴或空手", "一腳大步向前跨出，前膝彎曲至約90度", "後膝幾乎觸地但不著地", "以前腳發力推起，回到起始位置", "交替雙腳或完成單腿所有組數後換邊"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.857
cmm023vr7000goqutfjm806i2	前蹲 Front Squat	槓鈴置於前方的深蹲變體，更強調股四頭肌與核心	["槓鈴置於深蹲架，調至鎖骨高度", "雙手交叉或正握槓，使槓置於前三角肌上方", "腳與肩同寬，腳尖微外，下蹲保持軀幹直立", "蹲至大腿平行地面或更低", "以腳掌全力蹬地站起，全程保持背脊中立"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.86
cmm023vrb000hoqutqv2m1oxg	臀橋 Glute Bridge	仰躺進行臀部抬起，有效訓練臀大肌	["仰躺，雙膝彎曲腳踩地，雙臂置於身體兩側", "可在大腿根部放槓鈴增加重量", "以臀部發力將臀部抬起，使身體從肩到膝成一直線", "頂端收縮臀部2秒", "緩慢下放但不完全著地，接續下一下"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.863
cmm023vre000ioqutsrjemnr4	坐姿腿彎舉 Seated Leg Curl	坐姿腿彎舉機，更好地拉伸腘繩肌近端	["坐於坐姿腿彎舉機，調整墊子位置至腳踝後方", "大腿緊壓座墊，背部直立", "以腘繩肌力量將重量向下彎曲", "彎至最大限度，收縮1秒", "緩慢還原，全程控制重量"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.866
cmm023vrh000joqutlb9axi5w	繩索臀踢腿 Cable Kickback	以繩索進行後踢腿，孤立訓練臀大肌	["在低位繩索上套腳踝固定器，套於欲訓練腿的腳踝", "面向機器站立，雙手扶握把保持穩定", "核心收緊，以臀大肌發力將腿向後伸", "後伸至臀部完全收縮，停頓1秒", "緩慢還原，不要用甩的方式完成動作"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.869
cmm023vrk000koqut853zr9vv	哈克深蹲 Hack Squat Machine	使用哈克深蹲機進行固定軌跡深蹲，強調股四頭肌	["站於哈克深蹲機踏板，背靠墊，肩膀置於墊下", "雙腳與肩同寬，腳尖微外，解除安全鎖", "緩慢彎膝下蹲，至大腿平行或更低", "以腳掌全力推起，不要鎖死膝蓋", "完成組數後重新上鎖安全機構"]	INTERMEDIATE	COMPOUND	https://wger.de/media/exercise-images/23/Hack-squat-1.png	\N	2026-02-24 03:39:21.872
cmm023vrn000loqutdqn2ezfk	懸掛舉腿 Hanging Leg Raise	懸掛於引體向上架進行舉腿，高效訓練下腹與髖屈肌	["雙手抓握引體向上架，身體懸空", "核心收緊，避免身體搖擺", "以腹部發力將雙腿抬起至與地面平行或更高", "頂峰保持1秒，感受腹部收縮", "緩慢放下，不要讓身體借力搖擺"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.875
cmm023vrp000moqutbhaewxss	側棒式 Side Plank	側向支撐棒式，重點訓練腹斜肌與核心穩定性	["側躺，以一側前臂撐地，手肘在肩膀正下方", "雙腳疊放，身體從頭到腳呈一直線", "臀部抬起，保持身體平直", "可在臀部上方放重量或抬起上方腿增加難度", "兩側各保持指定時間"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.878
cmm023vrt000noqutheg3dkpg	反向捲腹 Reverse Crunch	仰躺進行下腹捲腹，強調下腹部收縮	["仰躺，雙手置於身體兩側，掌心向下", "雙腿彎曲抬起至大腿與地面垂直", "以腹部發力，將臀部從地面捲起，膝蓋向胸部靠近", "頂端收縮腹部，緩慢下放", "避免用腿部甩動的力量完成動作"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.881
cmm023vrw000ooqutyzlloz88	坐姿提踵 Seated Calf Raise	坐姿進行小腿抬起，更有效地訓練比目魚肌	["坐於腿推機或將槓鈴置於膝蓋上，腳掌前端踩於墊子上", "以最大範圍下放腳跟（充分拉伸小腿）", "以小腿肌肉發力，將腳跟抬至最高點", "頂端保持1秒，緩慢下放", "全程保持動作節奏，感受比目魚肌的工作"]	INTERMEDIATE	COMPOUND	\N	\N	2026-02-24 03:39:21.884
stretch_chest_doorway	胸部門框伸展 Doorway Chest Stretch	站在門框旁，雙臂彎曲扶住門框兩側，身體微微前傾，感受胸部的伸展。每次保持 30 秒，重複 2–3 次。	["站在門框中央，雙腳略比肩寬", "雙臂彎曲 90 度，小臂貼住門框兩側", "身體緩慢前傾，直到胸部有明顯張力感", "保持 30 秒，深呼吸，讓胸肌放鬆", "緩慢退回，重複 2–3 組"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.184
stretch_shoulder_cross	肩部交叉伸展 Cross-body Shoulder Stretch	將一隻手臂橫跨胸前，用另一隻手將其固定拉近身體，感受肩後三角肌與旋轉肌的伸展。	["站直，將右手臂伸直橫過胸前", "左手從右手臂下方托住，輕輕往左胸方向拉", "感受右肩後側的伸展，保持 30 秒", "換邊重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.189
stretch_tricep_overhead	三頭肌頭頂伸展 Overhead Tricep Stretch	將一隻手臂舉過頭頂，肘關節彎曲讓手指觸及背部，另一隻手輕壓肘部加深伸展。	["右手臂舉過頭頂，手肘彎曲，手指向下指向背部", "左手輕放右手肘，緩慢往頭後方向施壓", "感受右側三頭肌的拉伸，保持 30 秒", "換手重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.192
stretch_bicep_wall	二頭肌牆壁伸展 Bicep Wall Stretch	將手掌貼牆，手指朝後，緩慢轉動身體讓手臂伸直，感受前臂與二頭肌的伸展。	["站在牆邊，右手張開貼牆，手指朝向後方（或側面）", "保持手臂伸直，緩慢將身體轉向左側", "感受右側二頭肌與前臂的拉伸", "保持 30 秒後換邊"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.194
stretch_cat_cow	貓牛式 Cat-Cow Stretch	四足跪地交替進行脊椎彎曲（貓式）和伸展（牛式），放鬆整條脊椎及背部深層肌群。	["四足跪地，手腕在肩膀正下方，膝蓋在臀部正下方", "吸氣時：頭部上揚、腰部下沉（牛式）", "吐氣時：低頭、背部向上拱起（貓式）", "緩慢交替，每次保持 2–3 秒，重複 10 次"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.197
stretch_child_pose	嬰兒式 Child's Pose	跪坐後身體前傾雙手向前延伸，充分放鬆下背、臀部與肩膀，是訓練後最佳的全身放鬆姿勢。	["跪坐在墊子上，雙腳大拇指相碰，膝蓋分開", "身體緩慢前傾，雙手向前延伸，額頭輕觸地面", "臀部往腳跟方向沉，感受下背與臀部的拉伸", "深呼吸，每次吐氣讓身體更放鬆，保持 60 秒"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.199
stretch_hip_flexor	髖屈肌弓步伸展 Hip Flexor Lunge Stretch	弓步跪姿下沉髖部，伸展前側股直肌與髂腰肌，改善因久坐或大重量訓練造成的髖部緊繃。	["右腳向前踏出成弓步，左膝跪地", "雙手放在右膝上，身體保持直立", "臀部緩慢向前下方推，感受左側髖前方的拉伸", "保持 30–45 秒後換邊"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.202
stretch_quad_standing	站立股四頭肌伸展 Standing Quad Stretch	單腳站立，另一腳向後彎曲以手握住腳踝，感受大腿前側股四頭肌的充分伸展。	["單腳站立，可以手扶牆保持平衡", "另一腳向後彎曲，以同側手抓住腳踝", "膝蓋併攏，髖部微微前推", "感受大腿前側的拉伸，保持 30 秒，換腿重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.205
stretch_hamstring_seated	坐姿腘繩肌伸展 Seated Hamstring Stretch	坐在地板上，雙腳伸直向前，身體前傾雙手觸碰腳趾，充分伸展腿後側腘繩肌群。	["坐在地板上，雙腳伸直向前合攏", "吸一口氣，吐氣時身體緩慢前傾，雙手沿腿向下滑", "盡可能伸向腳趾，保持背部相對直立", "感受腿後側的拉伸，保持 30–45 秒"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.207
stretch_glute_pigeon	臀部梨狀肌伸展 Figure-4 Glute Stretch	仰臥位將一隻腳踝放在另一腿膝蓋上，呈數字 4 的形狀，有效伸展臀大肌與梨狀肌。	["仰臥，雙腳彎曲踩地", "右腳踝放在左膝上，呈數字 4 形", "雙手抱住左大腿，緩慢將左腿拉向胸口", "感受右側臀部深層的拉伸，保持 30–45 秒，換邊重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.209
stretch_calf_standing	站立小腿伸展 Standing Calf Stretch	面向牆壁，一腳向後踩穩，腳跟壓地，伸展腓腸肌與比目魚肌，緩解小腿訓練後的緊繃感。	["面向牆壁，雙手輕扶牆面", "右腳向後踩出，腳跟踩實地面", "身體微微前傾，感受右小腿後側的拉伸", "保持 30 秒，換腿重複", "彎曲後腿膝蓋可伸展比目魚肌（更深處）"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.211
stretch_butterfly	蝴蝶式大腿內側伸展 Butterfly Stretch	坐地將腳底相對，雙手按住膝蓋向地面輕壓，充分伸展大腿內收肌群，改善腿部訓練後的內側緊繃。	["坐在地上，雙腳腳底相對，膝蓋向外展開", "雙手輕放在膝蓋上方或腳踝處", "保持背部直立，緩慢用雙肘向下輕壓膝蓋", "感受大腿內側的拉伸，保持 30–45 秒"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.213
stretch_spinal_twist	仰臥脊椎旋轉 Supine Spinal Twist	仰臥將一隻腿跨過身體扭轉，旋轉脊椎和放鬆腰背及臀部肌肉，消除訓練後的腰部疲勞。	["仰臥，雙手向兩側伸展成十字形", "右膝彎曲，右腳跨到身體左側，腳放在地上", "頭部轉向右側，感受腰部與臀部的旋轉拉伸", "雙肩盡量貼地，保持 30–45 秒後換邊"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.216
stretch_lat_side_bend	背闊肌側彎伸展 Lat Side Bend Stretch	站立一手高舉後向反側彎腰，充分伸展背闊肌與側腹，緩解划船、引體向上後的背部緊繃。	["站直，右手高舉過頭", "身體緩慢向左彎，右手臂跟著側彎", "感受右側背闊肌與側腹部的拉伸", "保持 30 秒，換邊重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.218
stretch_neck_side	頸部側邊伸展 Neck Side Stretch	頭部緩慢向一側傾斜，用手輕加壓力，放鬆頸部兩側肌肉，減輕肩推、划船訓練後的頸部張力。	["坐直或站立，頸部放鬆", "頭部緩慢向右傾斜，右耳靠近右肩", "右手輕放在頭部左側，輕微施加壓力加深伸展", "保持 30 秒，緩慢換邊重複"]	BEGINNER	STRETCH	\N	\N	2026-02-24 08:21:58.22
\.


--
-- Data for Name: muscle_groups; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.muscle_groups (id, name, "bodyRegion") FROM stdin;
cmlzdca8y000r11jlwjmm82t4	胸大肌 Pectorals	CHEST
cmlzdca90000s11jl07tslweq	上胸 Upper Chest	CHEST
cmlzdca91000t11jlopv0hyy9	背闊肌 Latissimus Dorsi	BACK
cmlzdca93000u11jlpb2nfjlj	菱形肌 Rhomboids	BACK
cmlzdca94000v11jlifmevsus	斜方肌 Trapezius	BACK
cmlzdca95000w11jls9zw8kcl	後三角肌 Rear Deltoid	BACK
cmlzdca97000x11jl65q9fkg5	豎脊肌 Erector Spinae	BACK
cmlzdca98000y11jlnqcnzqmp	前三角肌 Anterior Deltoid	SHOULDERS
cmlzdca99000z11jlrh9smtvw	側三角肌 Lateral Deltoid	SHOULDERS
cmlzdca9a001011jl5eedh5bc	二頭肌 Biceps Brachii	ARMS
cmlzdca9c001111jl9matn1ld	三頭肌 Triceps Brachii	ARMS
cmlzdca9d001211jlezlnzpzb	前臂 Forearms	ARMS
cmlzdca9f001311jlotbdumke	股四頭肌 Quadriceps	LEGS
cmlzdca9g001411jluxl2qvyp	腘繩肌 Hamstrings	LEGS
cmlzdca9h001511jlvduyiahb	臀大肌 Glutes	LEGS
cmlzdca9i001611jl7q1lxh7d	小腿 Calves	LEGS
cmlzdca9k001711jlhijqumsi	腹直肌 Rectus Abdominis	CORE
cmlzdca9l001811jlizh5wp8q	腹斜肌 Obliques	CORE
cmlzdca9n001911jl60q9rwpm	髖屈肌 Hip Flexors	LEGS
\.


--
-- Data for Name: personal_records; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.personal_records (id, "userId", "exerciseId", "weightKg", reps, estimated1rm, "achievedAt") FROM stdin;
cmm032a1p000c8udjzup4o2gt	cmlzdo1i00000hvqcfqgsaene	cmlzdca9o001a11jl6e68w6k8	40.00	6	48.00	2026-02-24 04:06:06.685
cmm04ce5u001s11scww59n2y0	cmlzdo1i00000hvqcfqgsaene	cmlzdcaa2001b11jljh08hwvo	30.00	8	38.00	2026-02-24 04:41:58.194
cmm0b8dgg001znbajixeho4yd	cmlzdo1i00000hvqcfqgsaene	cmlzdcae5001v11jlx20nwifb	20.00	8	25.25	2026-02-24 07:54:47.968
cmm0b8kr60027nbajsmcqtu4w	cmlzdo1i00000hvqcfqgsaene	cmlzzvv8s0000pddrjfqdn4ul	20.00	8	25.25	2026-02-24 07:54:57.426
cmm0b8qhk002fnbaj08r457df	cmlzdo1i00000hvqcfqgsaene	cmlzdcaes001y11jl2exl4cfi	20.00	8	25.25	2026-02-24 07:55:04.855
cmm0b8vgw002nnbaj8k9f44c7	cmlzdo1i00000hvqcfqgsaene	cmlzdcafb002211jlia06estv	20.00	8	25.25	2026-02-24 07:55:11.311
\.


--
-- Data for Name: session_exercises; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.session_exercises (id, "sessionId", "exerciseId", "orderIndex", "substituteForId") FROM stdin;
cmm01eg5a0003me72oeso5yr0	cmm01eg5a0001me72hg1z6dnf	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm01eg5a0004me72qa5pek27	cmm01eg5a0001me72hg1z6dnf	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm01eg5a0005me72o2go4n2i	cmm01eg5a0001me72hg1z6dnf	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm01eg5a0006me72h6n978f5	cmm01eg5a0001me72hg1z6dnf	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm01eg5a0007me72fhyl02mn	cmm01eg5a0001me72hg1z6dnf	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm01eg5a0008me72mjh0rgyz	cmm01eg5a0001me72hg1z6dnf	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm0325ts00038udjczturl5r	cmm0325ts00018udj8hdtw3z9	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm0325ts00048udjqm7k588w	cmm0325ts00018udj8hdtw3z9	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm0325ts00058udj5utgsqp5	cmm0325ts00018udj8hdtw3z9	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm0325ts00068udj7fmigy9l	cmm0325ts00018udj8hdtw3z9	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm0325ts00078udjttx0ybw8	cmm0325ts00018udj8hdtw3z9	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm0325ts00088udj9d5z1wpm	cmm0325ts00018udj8hdtw3z9	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm032udi000g8udjer9c9rq9	cmm032udi000e8udj8ocbf23f	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm032udi000h8udjvn3016yh	cmm032udi000e8udj8ocbf23f	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm032udi000i8udjtlvujmfa	cmm032udi000e8udj8ocbf23f	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm032udi000j8udjzvnwgy9l	cmm032udi000e8udj8ocbf23f	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm032udi000k8udjpy4dg3vc	cmm032udi000e8udj8ocbf23f	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm032udi000l8udjp103t1mk	cmm032udi000e8udj8ocbf23f	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm034cex000p8udjwvexo295	cmm034cex000n8udj3hze42ck	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm034cex000q8udj4mqp7zpi	cmm034cex000n8udj3hze42ck	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm034cex000r8udjlxcqlhwk	cmm034cex000n8udj3hze42ck	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm034cex000s8udju9v8asno	cmm034cex000n8udj3hze42ck	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm034cex000t8udj17x0htz3	cmm034cex000n8udj3hze42ck	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm034cex000u8udjuwnfrjdm	cmm034cex000n8udj3hze42ck	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm0364oh000y8udjb4epcacq	cmm0364oh000w8udj9hz2o1u2	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm0364oh000z8udj1rw2z1sp	cmm0364oh000w8udj9hz2o1u2	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm0364oh00108udjqpwr4scv	cmm0364oh000w8udj9hz2o1u2	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm0364oh00118udjyyqirhri	cmm0364oh000w8udj9hz2o1u2	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm0364oi00128udj1uvhit1m	cmm0364oh000w8udj9hz2o1u2	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm0364oi00138udjpwg7el4x	cmm0364oh000w8udj9hz2o1u2	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm03rrui000311scbxijn2eo	cmm03rrui000111scj9qeinci	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm03rrui000411scuwhnm21y	cmm03rrui000111scj9qeinci	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm03rrui000511sc5jhzm92m	cmm03rrui000111scj9qeinci	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm03rrui000611scj1aquxeb	cmm03rrui000111scj9qeinci	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm03rrui000711scb27ysr05	cmm03rrui000111scj9qeinci	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm03rrui000811scjp3vit84	cmm03rrui000111scj9qeinci	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm03s0z5000c11scovxsmxk3	cmm03s0z5000a11scvegtybi7	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm03s0z5000d11scdsg38z0w	cmm03s0z5000a11scvegtybi7	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm03s0z5000e11scskckc913	cmm03s0z5000a11scvegtybi7	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm03s0z5000f11scbckwuqjh	cmm03s0z5000a11scvegtybi7	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm03s0z5000g11scunpqj339	cmm03s0z5000a11scvegtybi7	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm03s0z5000h11sc4afvupmc	cmm03s0z5000a11scvegtybi7	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm04079r000p11sczk2shatr	cmm04079r000n11scddl7rkcp	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm04079r000q11sclsvf9fmi	cmm04079r000n11scddl7rkcp	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm04079r000r11sc3czcsmnl	cmm04079r000n11scddl7rkcp	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm04079r000s11scmm213oxm	cmm04079r000n11scddl7rkcp	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm04079r000t11scqu9x7iit	cmm04079r000n11scddl7rkcp	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm04079r000u11sccskszivf	cmm04079r000n11scddl7rkcp	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm047rw2001011scqe15bq6t	cmm047rw2000y11scao3o5hbd	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm047rw2001111scokrf6k31	cmm047rw2000y11scao3o5hbd	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm047rw2001211sc89iswrdn	cmm047rw2000y11scao3o5hbd	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm047rw2001311sc7jrwkktc	cmm047rw2000y11scao3o5hbd	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm047rw2001411scxjgs05jp	cmm047rw2000y11scao3o5hbd	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm047rw2001511sc71f6xfd2	cmm047rw2000y11scao3o5hbd	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm04c3xf001b11scx4793ber	cmm04c3xf001911scekcmaqe5	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm04c3xf001c11scz540lkcq	cmm04c3xf001911scekcmaqe5	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm04c3xf001d11scvqe59h09	cmm04c3xf001911scekcmaqe5	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm04c3xf001e11sc37348q9u	cmm04c3xf001911scekcmaqe5	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm04c3xf001f11scfzeujfm7	cmm04c3xf001911scekcmaqe5	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm04c3xf001g11scdeuh4hj7	cmm04c3xf001911scekcmaqe5	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm0589ra0003nbajw6f9fobr	cmm0589ra0001nbajpev26abx	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm0589ra0004nbajzxmx8e0s	cmm0589ra0001nbajpev26abx	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm0589ra0005nbajbm8xgofn	cmm0589ra0001nbajpev26abx	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm0589ra0006nbajd73txox3	cmm0589ra0001nbajpev26abx	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm0589ra0007nbajwmalcguh	cmm0589ra0001nbajpev26abx	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm0589ra0008nbaj74es53ae	cmm0589ra0001nbajpev26abx	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm0593w4000enbaj6lb6zaix	cmm0593w4000cnbajz3t02hvh	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm0593w4000fnbaj0x9mdfm0	cmm0593w4000cnbajz3t02hvh	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm0593w4000gnbaj4gbpwvbw	cmm0593w4000cnbajz3t02hvh	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm0593w4000hnbajb64bnjzj	cmm0593w4000cnbajz3t02hvh	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm0593w4000inbajfqsfoap5	cmm0593w4000cnbajz3t02hvh	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm0593w4000jnbajek3fuj4i	cmm0593w4000cnbajz3t02hvh	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm05ic84000tnbajybt2qniv	cmm05ic84000rnbajraxt32m4	cmlzdca9o001a11jl6e68w6k8	0	\N
cmm05ic84000unbajv1dksa7e	cmm05ic84000rnbajraxt32m4	cmlzdcaa2001b11jljh08hwvo	1	\N
cmm05ic84000vnbajbfrzx8wt	cmm05ic84000rnbajraxt32m4	cmlzdcaba001h11jlw4qesrqg	2	\N
cmm05ic84000wnbajhdep3jyk	cmm05ic84000rnbajraxt32m4	cmlzdcab6001g11jlh3ckucxp	3	\N
cmm05ic84000xnbajy7sb2clq	cmm05ic84000rnbajraxt32m4	cmlzdcabx001k11jlx8f4vj9f	4	\N
cmm05ic84000ynbajj7ehkcxd	cmm05ic84000rnbajraxt32m4	cmlzdcac2001l11jlfcj3qhwn	5	\N
cmm0b8cg8001snbajhv8yq27p	cmm0b8cg8001qnbajyotqr616	cmlzdcae5001v11jlx20nwifb	0	\N
cmm0b8cg8001tnbajcrly5eih	cmm0b8cg8001qnbajyotqr616	cmlzzvv8s0000pddrjfqdn4ul	1	\N
cmm0b8cg8001unbajekju4x4m	cmm0b8cg8001qnbajyotqr616	cmlzdcaes001y11jl2exl4cfi	2	\N
cmm0b8cg8001vnbajn7e81obh	cmm0b8cg8001qnbajyotqr616	cmlzdcafb002211jlia06estv	3	\N
\.


--
-- Data for Name: session_sets; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.session_sets (id, "sessionExerciseId", "setNumber", "repsPerformed", "weightKg", "restAfterSeconds", "completedAt") FROM stdin;
cmm032a1k000a8udj9vgwrj5w	cmm0325ts00038udjczturl5r	1	6	40.00	150	2026-02-24 04:06:06.68
cmm0367qv00158udjbbnjoaju	cmm0364oh000y8udjb4epcacq	1	6	40.00	150	2026-02-24 04:09:10.327
cmm03s9ri000j11scvm36rztj	cmm03s0z5000c11scovxsmxk3	1	10	20.00	150	2026-02-24 04:26:19.374
cmm03vzqo000l11sc11rd64by	cmm03s0z5000c11scovxsmxk3	2	10	20.00	150	2026-02-24 04:29:13.008
cmm040d5h000w11sc1favks71	cmm04079r000p11sczk2shatr	1	6	40.00	150	2026-02-24 04:32:37.013
cmm047tzc001711sctgeafhxe	cmm047rw2001011scqe15bq6t	1	6	40.00	150	2026-02-24 04:38:25.416
cmm04c57e001i11scde66hanw	cmm04c3xf001b11scx4793ber	1	6	40.00	150	2026-02-24 04:41:46.585
cmm04c6pe001k11scg51ffk5r	cmm04c3xf001b11scx4793ber	2	6	40.00	150	2026-02-24 04:41:48.53
cmm04c7ya001m11scccvekt4i	cmm04c3xf001b11scx4793ber	3	6	40.00	150	2026-02-24 04:41:50.145
cmm04cajm001o11sc4itec0rj	cmm04c3xf001b11scx4793ber	4	6	40.00	150	2026-02-24 04:41:53.506
cmm04ce5r001q11sczp9wex8f	cmm04c3xf001c11scz540lkcq	1	8	30.00	90	2026-02-24 04:41:58.191
cmm058h31000anbajwpzf9vxr	cmm0589ra0004nbajzxmx8e0s	1	8	30.00	90	2026-02-24 05:06:54.973
cmm0599sn000lnbajw8m2lkif	cmm0593w4000fnbaj0x9mdfm0	1	8	30.00	90	2026-02-24 05:07:32.183
cmm05be3v000nnbajbyy97bfc	cmm0593w4000fnbaj0x9mdfm0	2	8	30.00	90	2026-02-24 05:09:11.083
cmm05fwdp000pnbaj11lp3nbh	cmm0593w4000fnbaj0x9mdfm0	3	8	30.00	90	2026-02-24 05:12:41.388
cmm0b8dg9001xnbajul3etsxz	cmm0b8cg8001snbajhv8yq27p	1	8	20.00	90	2026-02-24 07:54:47.96
cmm0b8hfl0021nbajjtwl2maq	cmm0b8cg8001snbajhv8yq27p	2	8	20.00	90	2026-02-24 07:54:53.12
cmm0b8iqp0023nbaj0mgiz5y2	cmm0b8cg8001snbajhv8yq27p	3	8	20.00	90	2026-02-24 07:54:54.817
cmm0b8kr30025nbajk4pavcmr	cmm0b8cg8001tnbajcrly5eih	1	8	20.00	90	2026-02-24 07:54:57.423
cmm0b8lzi0029nbaj6vypbdkn	cmm0b8cg8001tnbajcrly5eih	2	8	20.00	90	2026-02-24 07:54:59.021
cmm0b8n9g002bnbaj5d3ls5bb	cmm0b8cg8001tnbajcrly5eih	3	8	20.00	90	2026-02-24 07:55:00.675
cmm0b8qhe002dnbajwex4gfg0	cmm0b8cg8001unbajekju4x4m	1	8	20.00	90	2026-02-24 07:55:04.85
cmm0b8rrr002hnbaj3qe2ecaa	cmm0b8cg8001unbajekju4x4m	2	8	20.00	90	2026-02-24 07:55:06.518
cmm0b8t7h002jnbajv898yakv	cmm0b8cg8001unbajekju4x4m	3	8	20.00	90	2026-02-24 07:55:08.381
cmm0b8vgq002lnbaj3ll7bc30	cmm0b8cg8001vnbajn7e81obh	1	8	20.00	90	2026-02-24 07:55:11.306
cmm0b8wgt002pnbajjaiyjcrn	cmm0b8cg8001vnbajn7e81obh	2	8	20.00	90	2026-02-24 07:55:12.605
cmm0b8xki002rnbajjv78qnuj	cmm0b8cg8001vnbajn7e81obh	3	8	20.00	90	2026-02-24 07:55:14.034
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.users (id, email, name, "passwordHash", "createdAt", "updatedAt") FROM stdin;
cmlzdo1i00000hvqcfqgsaene	a@a	CHEN	$argon2id$v=19$m=65536,t=3,p=4$F8+BnpcXbVW0ntFl9tbw9w$LK4kOsComQ6W9l6/q6/vv5beihZGAS6Nn0ZYB2bRT9A	2026-02-23 16:15:12.025	2026-02-23 16:15:12.025
cmm0c7j4i0000fmxr2onmb64v	test@gymbuddy.local	test	$argon2id$v=19$m=65536,t=3,p=4$Tx9LNYaWKP+OhtRjGCAWvg$SwheISoNB4aNAsYDI+vgGw+cAQeODp52LFWEnrjc3OE	2026-02-24 08:22:08.275	2026-02-24 08:22:08.275
\.


--
-- Data for Name: workout_plan_days; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.workout_plan_days (id, "planId", "dayName", "dayOfWeek", "orderIndex") FROM stdin;
cmm018dq90002ei9e8amdv7jh	cmm018dq90001ei9ezahypwyi	D1 推（胸肩三頭）	\N	1
cmm018dq9000aei9e981ihkyh	cmm018dq90001ei9ezahypwyi	D2 拉（背二頭）	\N	2
cmm018dq9000iei9ekkr1554d	cmm018dq90001ei9ezahypwyi	D3 腿（股四主）	\N	3
cmm018dq9000qei9ezzabtqfu	cmm018dq90001ei9ezahypwyi	D4 上肢綜合	\N	4
cmm018dq9000yei9eovlw8lqq	cmm018dq90001ei9ezahypwyi	D5 下肢後鏈	\N	5
cmm0b2xh40011nbajcyrk9ti4	cmm0b2xh40010nbajogleicdb	D1 腿 (最後做 髖外展/內收 )	\N	0
cmm0b2xh40017nbajbzq8tdr9	cmm0b2xh40010nbajogleicdb	D2	\N	1
cmm0b2xh4001dnbaj9atcbr7d	cmm0b2xh40010nbajogleicdb	D3 純有氧 (休息復原)	\N	2
cmm0b2xh4001enbajjjdtsivb	cmm0b2xh40010nbajogleicdb	D4 背	\N	3
cmm0b2xh4001knbaj6ol1nv3u	cmm0b2xh40010nbajogleicdb	D5 肩 (飛鳥是 後三角飛鳥)  最後看胸跟背哪個可以補一個動作	\N	4
cmm0c7bde000395y9hjsximm9	cmm0c7bdc000195y994ggkn2m	R1 推日放鬆（胸肩三頭）	\N	0
cmm0c7bdo000f95y93td01va7	cmm0c7bdc000195y994ggkn2m	R2 拉日放鬆（背二頭）	\N	1
cmm0c7bdx000t95y9jbn4l5ct	cmm0c7bdc000195y994ggkn2m	R3 腿日放鬆（腿臀後鏈）	\N	2
cmm0c7beb001b95y9ed3brwhy	cmm0c7be9001995y9vyivaq3y	B1 推（胸肩三頭）	\N	0
cmm0c7bej001n95y9ynel9qyt	cmm0c7be9001995y9vyivaq3y	B2 拉（背二頭）	\N	1
cmm0c7ber001z95y97ujqjrf7	cmm0c7be9001995y9vyivaq3y	B3 腿（股四腘繩）	\N	2
cmm0c7j4u0004fmxre2nhsrxw	cmm0c7j4s0002fmxrybjix3qu	D1 推（胸肩三頭）	\N	1
cmm0c7j55000ifmxrxw3q8srt	cmm0c7j4s0002fmxrybjix3qu	D2 拉（背二頭）	\N	2
cmm0c7j5e000wfmxrvuf5s899	cmm0c7j4s0002fmxrybjix3qu	D3 腿（股四主）	\N	3
cmm0c7j5o001afmxrt07c12gy	cmm0c7j4s0002fmxrybjix3qu	D4 上肢綜合	\N	4
cmm0c7j5y001ofmxrotrx8mxw	cmm0c7j4s0002fmxrybjix3qu	D5 下肢後鏈	\N	5
cmm0c7j670022fmxrq71cz7td	cmm0c7j660020fmxrtnt1haaz	D1 腿 (最後做 髖外展/內收 )	\N	0
cmm0c7j6e002cfmxrq9zr087f	cmm0c7j660020fmxrtnt1haaz	D2	\N	1
cmm0c7j6l002mfmxr7wnntuko	cmm0c7j660020fmxrtnt1haaz	D3 純有氧 (休息復原)	\N	2
cmm0c7j6m002ofmxrorj0jpyq	cmm0c7j660020fmxrtnt1haaz	D4 背	\N	3
cmm0c7j6t002yfmxrbaf2gily	cmm0c7j660020fmxrtnt1haaz	D5 肩 (飛鳥是 後三角飛鳥)  最後看胸跟背哪個可以補一個動作	\N	4
cmm0c7j6z0038fmxrel5ruqt4	cmm0c7j6y0036fmxr21fndqz6	R1 推日放鬆（胸肩三頭）	\N	0
cmm0c7j77003kfmxrb0knv4my	cmm0c7j6y0036fmxr21fndqz6	R2 拉日放鬆（背二頭）	\N	1
cmm0c7j7g003yfmxrjlmururs	cmm0c7j6y0036fmxr21fndqz6	R3 腿日放鬆（腿臀後鏈）	\N	2
cmm0c7j7t004gfmxr12syohdi	cmm0c7j7r004efmxr8zqadf37	B1 推（胸肩三頭）	\N	0
cmm0c7j81004sfmxrfjlp33rj	cmm0c7j7r004efmxr8zqadf37	B2 拉（背二頭）	\N	1
cmm0c7j890054fmxrawxklwxw	cmm0c7j7r004efmxr8zqadf37	B3 腿（股四腘繩）	\N	2
\.


--
-- Data for Name: workout_plan_exercises; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.workout_plan_exercises (id, "dayId", "exerciseId", "orderIndex", "defaultSets", "defaultRepsMin", "defaultRepsMax", "defaultWeightKg", "restSeconds", notes) FROM stdin;
cmm018dq9000lei9e1doimnoh	cmm018dq9000iei9ekkr1554d	cmlzzvv8s0000pddrjfqdn4ul	2	3	8	12	12.00	120	\N
cmm018dq9000mei9e6ujnsfrn	cmm018dq9000iei9ekkr1554d	cmlzdcaef001w11jlg3xvc1ld	3	3	10	15	60.00	120	\N
cmm018dq9000nei9eso9i30mc	cmm018dq9000iei9ekkr1554d	cmlzdcaew001z11jl05mkwr06	4	3	12	15	20.00	60	\N
cmm018dq9000oei9erw9cvgql	cmm018dq9000iei9ekkr1554d	cmlzdcaes001y11jl2exl4cfi	5	3	10	15	20.00	60	\N
cmm018dq9000pei9exld5ku7i	cmm018dq9000iei9ekkr1554d	cmlzdcaf6002111jl0bi4su3q	6	4	8	12	30.00	60	\N
cmm018dq9000sei9e41weah4d	cmm018dq9000qei9ezzabtqfu	cmlzdcaac001c11jl4snhn7mc	1	3	8	12	16.00	120	\N
cmm018dq9000tei9ewjhu5p9x	cmm018dq9000qei9ezzabtqfu	cmlzdcad7001q11jlz2tk17nx	2	3	8	12	27.50	120	\N
cmm018dq9000uei9ef546qsoj	cmm018dq9000qei9ezzabtqfu	cmlzzvv960004pddrrmm37ftu	3	3	12	15	6.00	60	\N
cmm018dq9000vei9eogyvlo4a	cmm018dq9000qei9ezzabtqfu	cmlzzvv9c0006pddr8e4gho6a	4	4	12	15	6.00	45	\N
cmm018dq9000wei9e0znfoeqa	cmm018dq9000qei9ezzabtqfu	cmlzzvv990005pddrxvx21c5y	5	3	10	12	7.50	60	\N
cmm018dq9000xei9egofyqced	cmm018dq9000qei9ezzabtqfu	cmlzdcabx001k11jlx8f4vj9f	6	3	10	12	10.00	60	\N
cmm018dq90010ei9ed4e5l8cr	cmm018dq9000yei9eovlw8lqq	cmlzdcael001x11jlvcwa15nv	1	4	6	10	40.00	150	\N
cmm018dq90011ei9eo8nli8k4	cmm018dq9000yei9eovlw8lqq	cmlzzvv8x0001pddr37fi77sa	2	3	8	12	40.00	120	\N
cmm018dq90004ei9eyz0f6yjo	cmm018dq90002ei9e8amdv7jh	cmlzdca9o001a11jl6e68w6k8	1	4	6	10	40.00	150	\N
cmm018dq90005ei9eqnnktk2l	cmm018dq90002ei9e8amdv7jh	cmlzdcaa2001b11jljh08hwvo	2	3	8	12	30.00	90	\N
cmm018dq90006ei9e4ufi9ub3	cmm018dq90002ei9e8amdv7jh	cmlzdcaba001h11jlw4qesrqg	3	3	6	10	25.00	150	\N
cmm018dq90007ei9e58g25ept	cmm018dq90002ei9e8amdv7jh	cmlzdcab6001g11jlh3ckucxp	4	3	10	15	20.00	60	\N
cmm018dq90008ei9e235kv7tf	cmm018dq90002ei9e8amdv7jh	cmlzdcabx001k11jlx8f4vj9f	5	3	10	12	10.00	60	\N
cmm018dq90009ei9e1o8ms2kz	cmm018dq90002ei9e8amdv7jh	cmlzdcac2001l11jlfcj3qhwn	6	3	8	12	12.00	90	\N
cmm018dq9000cei9epw43w4fp	cmm018dq9000aei9e981ihkyh	cmlzdcacf001n11jl27x9zqhe	1	3	3	6	55.00	180	\N
cmm018dq9000dei9ejf7p4u36	cmm018dq9000aei9e981ihkyh	cmlzdcacs001o11jl81sagr15	2	4	6	10	0.00	120	\N
cmm018dq9000eei9eoabce3nt	cmm018dq9000aei9e981ihkyh	cmlzdcadf001r11jlj17yojvy	3	3	6	10	40.00	120	\N
cmm018dq9000fei9ej0zxnipr	cmm018dq9000aei9e981ihkyh	cmlzdcad7001q11jlz2tk17nx	4	3	10	12	27.50	90	\N
cmm018dq9000gei9e9f1e37pd	cmm018dq9000aei9e981ihkyh	cmlzdcadp001s11jledg98qnn	5	3	12	15	7.50	60	\N
cmm018dq9000hei9esl1z7ebl	cmm018dq9000aei9e981ihkyh	cmlzzvv900002pddrut303r65	6	3	8	12	8.00	60	\N
cmm018dq9000kei9ep34j7qps	cmm018dq9000iei9ekkr1554d	cmlzdcae5001v11jlx20nwifb	1	4	6	10	50.00	180	\N
cmm018dq90012ei9ewaoho6hc	cmm018dq9000yei9eovlw8lqq	cmlzdcaes001y11jl2exl4cfi	3	3	10	15	20.00	60	\N
cmm018dq90013ei9em4wvg5wg	cmm018dq9000yei9eovlw8lqq	cmlzdcaf0002011jljukrmp61	4	3	6	10	40.00	150	\N
cmm018dq90014ei9e1e2855d3	cmm018dq9000yei9eovlw8lqq	cmlzzvv930003pddrrtcxbkdn	5	3	10	15	0.00	90	\N
cmm0b2xh40013nbajwy46jzdk	cmm0b2xh40011nbajcyrk9ti4	cmlzdcae5001v11jlx20nwifb	0	3	8	12	\N	90	\N
cmm0b2xh40014nbajkgctzxnn	cmm0b2xh40011nbajcyrk9ti4	cmlzzvv8s0000pddrjfqdn4ul	1	3	8	12	\N	90	\N
cmm0b2xh40015nbajtm83xoxf	cmm0b2xh40011nbajcyrk9ti4	cmlzdcaes001y11jl2exl4cfi	2	3	8	12	\N	90	\N
cmm0b2xh40016nbajimpr0w47	cmm0b2xh40011nbajcyrk9ti4	cmlzdcafb002211jlia06estv	3	3	8	12	\N	90	\N
cmm0b2xh40019nbaj6rmln65n	cmm0b2xh40017nbajbzq8tdr9	cmlzdcaac001c11jl4snhn7mc	0	3	8	12	\N	90	\N
cmm0b2xh4001anbajc01quyba	cmm0b2xh40017nbajbzq8tdr9	cmm023vpu0001oqut0t7ijffw	1	3	8	12	\N	90	\N
cmm0b2xh4001bnbajidyaw10u	cmm0b2xh40017nbajbzq8tdr9	cmlzdcab6001g11jlh3ckucxp	2	3	8	12	\N	90	\N
cmm0b2xh4001cnbajstf8ual5	cmm0b2xh40017nbajbzq8tdr9	cmlzdcabx001k11jlx8f4vj9f	3	3	8	12	\N	90	\N
cmm0b2xh4001gnbaj5unlm72d	cmm0b2xh4001enbajjjdtsivb	cmlzdcacs001o11jl81sagr15	0	3	8	12	\N	90	\N
cmm0b2xh4001hnbajv7usf6rj	cmm0b2xh4001enbajjjdtsivb	cmlzdcad7001q11jlz2tk17nx	1	3	8	12	\N	90	\N
cmm0b2xh4001inbaj1wa6ok7d	cmm0b2xh4001enbajjjdtsivb	cmm023vq20003oqutch89wzql	2	3	8	12	\N	90	\N
cmm0b2xh4001jnbaj1498c1qb	cmm0b2xh4001enbajjjdtsivb	cmlzzvv900002pddrut303r65	3	3	8	12	\N	90	\N
cmm0b2xh4001mnbajxm0vojoi	cmm0b2xh4001knbaj6ol1nv3u	cmm023vqe0007oqut9hv4hylu	0	3	8	12	\N	90	\N
cmm0b2xh4001nnbajji6nxb4t	cmm0b2xh4001knbaj6ol1nv3u	cmlzdcabl001i11jluth1tf18	1	3	8	12	\N	90	\N
cmm0b2xh4001onbajv2vr9u4v	cmm0b2xh4001knbaj6ol1nv3u	cmlzdcaal001d11jl5s826i3o	2	3	8	12	\N	90	\N
cmm0c7bdg000595y9q06mhzxz	cmm0c7bde000395y9hjsximm9	stretch_chest_doorway	0	2	1	1	0.00	30	\N
cmm0c7bdi000795y9r2a21b78	cmm0c7bde000395y9hjsximm9	stretch_shoulder_cross	1	2	1	1	0.00	30	\N
cmm0c7bdj000995y9kr1edq1r	cmm0c7bde000395y9hjsximm9	stretch_tricep_overhead	2	2	1	1	0.00	30	\N
cmm0c7bdl000b95y9cb2t9ad4	cmm0c7bde000395y9hjsximm9	stretch_neck_side	3	2	1	1	0.00	30	\N
cmm0c7bdm000d95y90azjd0gd	cmm0c7bde000395y9hjsximm9	stretch_child_pose	4	1	1	1	0.00	60	\N
cmm0c7bdp000h95y9jygpuaks	cmm0c7bdo000f95y93td01va7	stretch_lat_side_bend	0	2	1	1	0.00	30	\N
cmm0c7bdr000j95y9bcvnl3b8	cmm0c7bdo000f95y93td01va7	stretch_shoulder_cross	1	2	1	1	0.00	30	\N
cmm0c7bds000l95y9dpei72lt	cmm0c7bdo000f95y93td01va7	stretch_bicep_wall	2	2	1	1	0.00	30	\N
cmm0c7bdt000n95y9ubnepzny	cmm0c7bdo000f95y93td01va7	stretch_spinal_twist	3	2	1	1	0.00	45	\N
cmm0c7bdv000p95y91mtjrr5b	cmm0c7bdo000f95y93td01va7	stretch_cat_cow	4	2	1	1	0.00	30	\N
cmm0c7bdw000r95y90o9u22tj	cmm0c7bdo000f95y93td01va7	stretch_child_pose	5	1	1	1	0.00	60	\N
cmm0c7bdz000v95y9dzb6qry8	cmm0c7bdx000t95y9jbn4l5ct	stretch_hip_flexor	0	2	1	1	0.00	45	\N
cmm0c7be0000x95y9b6trovv1	cmm0c7bdx000t95y9jbn4l5ct	stretch_quad_standing	1	2	1	1	0.00	30	\N
cmm0c7be2000z95y9hg1vhlah	cmm0c7bdx000t95y9jbn4l5ct	stretch_hamstring_seated	2	2	1	1	0.00	45	\N
cmm0c7be3001195y98zsuk8jr	cmm0c7bdx000t95y9jbn4l5ct	stretch_glute_pigeon	3	2	1	1	0.00	45	\N
cmm0c7be4001395y9ijq2s0sz	cmm0c7bdx000t95y9jbn4l5ct	stretch_butterfly	4	2	1	1	0.00	45	\N
cmm0c7be6001595y99vagojwv	cmm0c7bdx000t95y9jbn4l5ct	stretch_calf_standing	5	2	1	1	0.00	30	\N
cmm0c7be7001795y9qall62cl	cmm0c7bdx000t95y9jbn4l5ct	stretch_spinal_twist	6	2	1	1	0.00	45	\N
cmm0c7bec001d95y90u340jm4	cmm0c7beb001b95y9ed3brwhy	cmlzdca9o001a11jl6e68w6k8	0	3	8	12	20.00	120	\N
cmm0c7bed001f95y98ejp2oic	cmm0c7beb001b95y9ed3brwhy	cmm023vpu0001oqut0t7ijffw	1	3	10	15	10.00	90	\N
cmm0c7bef001h95y9916rp2r6	cmm0c7beb001b95y9ed3brwhy	cmm023vqe0007oqut9hv4hylu	2	3	10	15	8.00	90	\N
cmm0c7beg001j95y998qx9xsk	cmm0c7beb001b95y9ed3brwhy	cmlzdcabx001k11jlx8f4vj9f	3	3	12	15	8.00	60	\N
cmm0c7beh001l95y9xg37anza	cmm0c7beb001b95y9ed3brwhy	cmlzdcab6001g11jlh3ckucxp	4	3	12	15	15.00	60	\N
cmm0c7bek001p95y9cb5pkggo	cmm0c7bej001n95y9ynel9qyt	cmlzdcad0001p11jlpe0uoije	0	3	10	15	30.00	90	\N
cmm0c7bel001r95y9nyzdor0g	cmm0c7bej001n95y9ynel9qyt	cmlzdcad7001q11jlz2tk17nx	1	3	10	15	20.00	90	\N
cmm0c7ben001t95y99v248ebm	cmm0c7bej001n95y9ynel9qyt	cmm023vq20003oqutch89wzql	2	3	10	15	12.00	90	\N
cmm0c7beo001v95y90wu3bdy6	cmm0c7bej001n95y9ynel9qyt	cmlzzvv900002pddrut303r65	3	3	12	15	7.00	60	\N
cmm0c7beq001x95y9jy144as8	cmm0c7bej001n95y9ynel9qyt	cmlzdcadp001s11jledg98qnn	4	3	15	20	5.00	60	\N
cmm0c7bet002195y9gbfd0bb3	cmm0c7ber001z95y97ujqjrf7	cmlzdcae5001v11jlx20nwifb	0	3	8	12	30.00	120	\N
cmm0c7beu002395y9p7c1zv2l	cmm0c7ber001z95y97ujqjrf7	cmlzdcaef001w11jlg3xvc1ld	1	3	12	15	40.00	90	\N
cmm0c7bev002595y9ehtxydh3	cmm0c7ber001z95y97ujqjrf7	cmlzdcaew001z11jl05mkwr06	2	3	12	15	15.00	60	\N
cmm0c7bex002795y9i56340t3	cmm0c7ber001z95y97ujqjrf7	cmlzdcaes001y11jl2exl4cfi	3	3	12	15	12.00	60	\N
cmm0c7bey002995y9h3f9dc3o	cmm0c7ber001z95y97ujqjrf7	cmlzdcaf6002111jl0bi4su3q	4	3	15	20	20.00	45	\N
cmm0c7j4w0006fmxrg0n5n25w	cmm0c7j4u0004fmxre2nhsrxw	cmlzdca9o001a11jl6e68w6k8	1	4	6	10	40.00	150	\N
cmm0c7j4y0008fmxrgzv3oeee	cmm0c7j4u0004fmxre2nhsrxw	cmlzdcaa2001b11jljh08hwvo	2	3	8	12	30.00	90	\N
cmm0c7j4z000afmxr0c6m04tw	cmm0c7j4u0004fmxre2nhsrxw	cmlzdcaba001h11jlw4qesrqg	3	3	6	10	25.00	150	\N
cmm0c7j51000cfmxrvqxvb7h7	cmm0c7j4u0004fmxre2nhsrxw	cmlzdcab6001g11jlh3ckucxp	4	3	10	15	20.00	60	\N
cmm0c7j52000efmxr7vqx86gj	cmm0c7j4u0004fmxre2nhsrxw	cmlzdcabx001k11jlx8f4vj9f	5	3	10	12	10.00	60	\N
cmm0c7j54000gfmxrlbyuvq49	cmm0c7j4u0004fmxre2nhsrxw	cmlzdcac2001l11jlfcj3qhwn	6	3	8	12	12.00	90	\N
cmm0c7j56000kfmxrw50vfb9q	cmm0c7j55000ifmxrxw3q8srt	cmlzdcacf001n11jl27x9zqhe	1	3	3	6	55.00	180	\N
cmm0c7j58000mfmxr37272ts8	cmm0c7j55000ifmxrxw3q8srt	cmlzdcacs001o11jl81sagr15	2	4	6	10	0.00	120	\N
cmm0c7j59000ofmxrouly395u	cmm0c7j55000ifmxrxw3q8srt	cmlzdcadf001r11jlj17yojvy	3	3	6	10	40.00	120	\N
cmm0c7j5a000qfmxrl1sga25u	cmm0c7j55000ifmxrxw3q8srt	cmlzdcad7001q11jlz2tk17nx	4	3	10	12	27.50	90	\N
cmm0c7j5c000sfmxrvx3mdbzq	cmm0c7j55000ifmxrxw3q8srt	cmlzdcadp001s11jledg98qnn	5	3	12	15	7.50	60	\N
cmm0c7j5d000ufmxrurxi81b5	cmm0c7j55000ifmxrxw3q8srt	cmlzzvv900002pddrut303r65	6	3	8	12	8.00	60	\N
cmm0c7j5g000yfmxr4ghktvgr	cmm0c7j5e000wfmxrvuf5s899	cmlzdcae5001v11jlx20nwifb	1	4	6	10	50.00	180	\N
cmm0c7j5h0010fmxr7sicjezb	cmm0c7j5e000wfmxrvuf5s899	cmlzzvv8s0000pddrjfqdn4ul	2	3	8	12	12.00	120	\N
cmm0c7j5j0012fmxrueisffnq	cmm0c7j5e000wfmxrvuf5s899	cmlzdcaef001w11jlg3xvc1ld	3	3	10	15	60.00	120	\N
cmm0c7j5k0014fmxru0e5wh5o	cmm0c7j5e000wfmxrvuf5s899	cmlzdcaew001z11jl05mkwr06	4	3	12	15	20.00	60	\N
cmm0c7j5l0016fmxry1j985gq	cmm0c7j5e000wfmxrvuf5s899	cmlzdcaes001y11jl2exl4cfi	5	3	10	15	20.00	60	\N
cmm0c7j5n0018fmxrd15lx4z5	cmm0c7j5e000wfmxrvuf5s899	cmlzdcaf6002111jl0bi4su3q	6	4	8	12	30.00	60	\N
cmm0c7j5q001cfmxru06u9rnd	cmm0c7j5o001afmxrt07c12gy	cmlzdcaac001c11jl4snhn7mc	1	3	8	12	16.00	120	\N
cmm0c7j5r001efmxr72ediy6j	cmm0c7j5o001afmxrt07c12gy	cmlzdcad7001q11jlz2tk17nx	2	3	8	12	27.50	120	\N
cmm0c7j5t001gfmxrgt1y99nk	cmm0c7j5o001afmxrt07c12gy	cmlzzvv960004pddrrmm37ftu	3	3	12	15	6.00	60	\N
cmm0c7j5u001ifmxrg7j3y66z	cmm0c7j5o001afmxrt07c12gy	cmlzzvv9c0006pddr8e4gho6a	4	4	12	15	6.00	45	\N
cmm0c7j5v001kfmxrstkoqmph	cmm0c7j5o001afmxrt07c12gy	cmlzzvv990005pddrxvx21c5y	5	3	10	12	7.50	60	\N
cmm0c7j5x001mfmxr2q99w9nh	cmm0c7j5o001afmxrt07c12gy	cmlzdcabx001k11jlx8f4vj9f	6	3	10	12	10.00	60	\N
cmm0c7j5z001qfmxrswkcyv50	cmm0c7j5y001ofmxrotrx8mxw	cmlzdcael001x11jlvcwa15nv	1	4	6	10	40.00	150	\N
cmm0c7j61001sfmxry9vimq4o	cmm0c7j5y001ofmxrotrx8mxw	cmlzzvv8x0001pddr37fi77sa	2	3	8	12	40.00	120	\N
cmm0c7j62001ufmxr3rsijeo2	cmm0c7j5y001ofmxrotrx8mxw	cmlzdcaes001y11jl2exl4cfi	3	3	10	15	20.00	60	\N
cmm0c7j63001wfmxrwo4v6qpt	cmm0c7j5y001ofmxrotrx8mxw	cmlzdcaf0002011jljukrmp61	4	3	6	10	40.00	150	\N
cmm0c7j65001yfmxrndcqbpeg	cmm0c7j5y001ofmxrotrx8mxw	cmlzzvv930003pddrrtcxbkdn	5	3	10	15	0.00	90	\N
cmm0c7j690024fmxr0cs9zs0i	cmm0c7j670022fmxrq71cz7td	cmlzdcae5001v11jlx20nwifb	0	3	8	12	\N	90	\N
cmm0c7j6a0026fmxrbmtzz4vp	cmm0c7j670022fmxrq71cz7td	cmlzzvv8s0000pddrjfqdn4ul	1	3	8	12	\N	90	\N
cmm0c7j6c0028fmxrbizdl3da	cmm0c7j670022fmxrq71cz7td	cmlzdcaes001y11jl2exl4cfi	2	3	8	12	\N	90	\N
cmm0c7j6d002afmxrklqz3y5q	cmm0c7j670022fmxrq71cz7td	cmlzdcafb002211jlia06estv	3	3	8	12	\N	90	\N
cmm0c7j6f002efmxr3uuuuwhv	cmm0c7j6e002cfmxrq9zr087f	cmlzdcaac001c11jl4snhn7mc	0	3	8	12	\N	90	\N
cmm0c7j6h002gfmxrz53oy6t7	cmm0c7j6e002cfmxrq9zr087f	cmm023vpu0001oqut0t7ijffw	1	3	8	12	\N	90	\N
cmm0c7j6i002ifmxrb1wcflad	cmm0c7j6e002cfmxrq9zr087f	cmlzdcab6001g11jlh3ckucxp	2	3	8	12	\N	90	\N
cmm0c7j6j002kfmxriyuq5phd	cmm0c7j6e002cfmxrq9zr087f	cmlzdcabx001k11jlx8f4vj9f	3	3	8	12	\N	90	\N
cmm0c7j6n002qfmxrn88pel5d	cmm0c7j6m002ofmxrorj0jpyq	cmlzdcacs001o11jl81sagr15	0	3	8	12	\N	90	\N
cmm0c7j6p002sfmxrya2bpr25	cmm0c7j6m002ofmxrorj0jpyq	cmlzdcad7001q11jlz2tk17nx	1	3	8	12	\N	90	\N
cmm0c7j6q002ufmxrszuwuj8r	cmm0c7j6m002ofmxrorj0jpyq	cmm023vq20003oqutch89wzql	2	3	8	12	\N	90	\N
cmm0c7j6r002wfmxrs51rztz5	cmm0c7j6m002ofmxrorj0jpyq	cmlzzvv900002pddrut303r65	3	3	8	12	\N	90	\N
cmm0c7j6u0030fmxrrylojpbg	cmm0c7j6t002yfmxrbaf2gily	cmm023vqe0007oqut9hv4hylu	0	3	8	12	\N	90	\N
cmm0c7j6v0032fmxri4qkldd4	cmm0c7j6t002yfmxrbaf2gily	cmlzdcabl001i11jluth1tf18	1	3	8	12	\N	90	\N
cmm0c7j6x0034fmxr1cgms963	cmm0c7j6t002yfmxrbaf2gily	cmlzdcaal001d11jl5s826i3o	2	3	8	12	\N	90	\N
cmm0c7j71003afmxrd6ewsm07	cmm0c7j6z0038fmxrel5ruqt4	stretch_chest_doorway	0	2	1	1	0.00	30	\N
cmm0c7j72003cfmxreqjcb26u	cmm0c7j6z0038fmxrel5ruqt4	stretch_shoulder_cross	1	2	1	1	0.00	30	\N
cmm0c7j73003efmxr767nvh1c	cmm0c7j6z0038fmxrel5ruqt4	stretch_tricep_overhead	2	2	1	1	0.00	30	\N
cmm0c7j75003gfmxr8exzyxbk	cmm0c7j6z0038fmxrel5ruqt4	stretch_neck_side	3	2	1	1	0.00	30	\N
cmm0c7j76003ifmxrw8lxt35n	cmm0c7j6z0038fmxrel5ruqt4	stretch_child_pose	4	1	1	1	0.00	60	\N
cmm0c7j79003mfmxrq5o5dlne	cmm0c7j77003kfmxrb0knv4my	stretch_lat_side_bend	0	2	1	1	0.00	30	\N
cmm0c7j7a003ofmxr3gcxun24	cmm0c7j77003kfmxrb0knv4my	stretch_shoulder_cross	1	2	1	1	0.00	30	\N
cmm0c7j7b003qfmxrmbgx6n6s	cmm0c7j77003kfmxrb0knv4my	stretch_bicep_wall	2	2	1	1	0.00	30	\N
cmm0c7j7d003sfmxrbx5f81fe	cmm0c7j77003kfmxrb0knv4my	stretch_spinal_twist	3	2	1	1	0.00	45	\N
cmm0c7j7e003ufmxr85dtw344	cmm0c7j77003kfmxrb0knv4my	stretch_cat_cow	4	2	1	1	0.00	30	\N
cmm0c7j7f003wfmxrht9xboqv	cmm0c7j77003kfmxrb0knv4my	stretch_child_pose	5	1	1	1	0.00	60	\N
cmm0c7j7i0040fmxrsxfega5z	cmm0c7j7g003yfmxrjlmururs	stretch_hip_flexor	0	2	1	1	0.00	45	\N
cmm0c7j7j0042fmxrss0moh7i	cmm0c7j7g003yfmxrjlmururs	stretch_quad_standing	1	2	1	1	0.00	30	\N
cmm0c7j7k0044fmxrdr41i2fn	cmm0c7j7g003yfmxrjlmururs	stretch_hamstring_seated	2	2	1	1	0.00	45	\N
cmm0c7j7m0046fmxr0uk9yuyh	cmm0c7j7g003yfmxrjlmururs	stretch_glute_pigeon	3	2	1	1	0.00	45	\N
cmm0c7j7n0048fmxre2l7fixy	cmm0c7j7g003yfmxrjlmururs	stretch_butterfly	4	2	1	1	0.00	45	\N
cmm0c7j7o004afmxrcimh77n7	cmm0c7j7g003yfmxrjlmururs	stretch_calf_standing	5	2	1	1	0.00	30	\N
cmm0c7j7q004cfmxrp01ctd1y	cmm0c7j7g003yfmxrjlmururs	stretch_spinal_twist	6	2	1	1	0.00	45	\N
cmm0c7j7u004ifmxrz9dvkmd5	cmm0c7j7t004gfmxr12syohdi	cmlzdca9o001a11jl6e68w6k8	0	3	8	12	20.00	120	\N
cmm0c7j7w004kfmxrhbkt484r	cmm0c7j7t004gfmxr12syohdi	cmm023vpu0001oqut0t7ijffw	1	3	10	15	10.00	90	\N
cmm0c7j7x004mfmxrjrp2uztm	cmm0c7j7t004gfmxr12syohdi	cmm023vqe0007oqut9hv4hylu	2	3	10	15	8.00	90	\N
cmm0c7j7y004ofmxrb39t46cv	cmm0c7j7t004gfmxr12syohdi	cmlzdcabx001k11jlx8f4vj9f	3	3	12	15	8.00	60	\N
cmm0c7j80004qfmxr20ayrlap	cmm0c7j7t004gfmxr12syohdi	cmlzdcab6001g11jlh3ckucxp	4	3	12	15	15.00	60	\N
cmm0c7j82004ufmxrwlswnua7	cmm0c7j81004sfmxrfjlp33rj	cmlzdcad0001p11jlpe0uoije	0	3	10	15	30.00	90	\N
cmm0c7j84004wfmxrzkwpfsbk	cmm0c7j81004sfmxrfjlp33rj	cmlzdcad7001q11jlz2tk17nx	1	3	10	15	20.00	90	\N
cmm0c7j85004yfmxr5lsjf0i6	cmm0c7j81004sfmxrfjlp33rj	cmm023vq20003oqutch89wzql	2	3	10	15	12.00	90	\N
cmm0c7j860050fmxr27op2isu	cmm0c7j81004sfmxrfjlp33rj	cmlzzvv900002pddrut303r65	3	3	12	15	7.00	60	\N
cmm0c7j880052fmxr5glmm4ua	cmm0c7j81004sfmxrfjlp33rj	cmlzdcadp001s11jledg98qnn	4	3	15	20	5.00	60	\N
cmm0c7j8a0056fmxr5z7wy39t	cmm0c7j890054fmxrawxklwxw	cmlzdcae5001v11jlx20nwifb	0	3	8	12	30.00	120	\N
cmm0c7j8c0058fmxrlc9khfe4	cmm0c7j890054fmxrawxklwxw	cmlzdcaef001w11jlg3xvc1ld	1	3	12	15	40.00	90	\N
cmm0c7j8d005afmxrcwdj8rkq	cmm0c7j890054fmxrawxklwxw	cmlzdcaew001z11jl05mkwr06	2	3	12	15	15.00	60	\N
cmm0c7j8e005cfmxrpowgid68	cmm0c7j890054fmxrawxklwxw	cmlzdcaes001y11jl2exl4cfi	3	3	12	15	12.00	60	\N
cmm0c7j8g005efmxrhtathcir	cmm0c7j890054fmxrawxklwxw	cmlzdcaf6002111jl0bi4su3q	4	3	15	20	20.00	45	\N
\.


--
-- Data for Name: workout_plans; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.workout_plans (id, "userId", name, description, "daysPerWeek", "isActive", "createdAt", "updatedAt") FROM stdin;
cmm018dq90001ei9ezahypwyi	cmlzdo1i00000hvqcfqgsaene	5日PPL進階計劃	每週5日訓練，同肌群每週2次。D1推力(胸肩三頭)→D2拉力(背二頭)→D3腿部(股四主)→D4上肢補充→D5下肢後鏈	3	t	2026-02-24 03:14:52.161	2026-02-24 03:14:52.161
cmm0b2xh40010nbajogleicdb	cmlzdo1i00000hvqcfqgsaene	5天分化訓練		5	t	2026-02-24 07:50:33.976	2026-02-24 07:50:33.976
cmm0c7bdc000195y994ggkn2m	cmlzdo1i00000hvqcfqgsaene	5日PPL放鬆計劃	配合5日PPL進階計劃的收操放鬆計畫，以靜態伸展為主，每次約15–20分鐘。訓練後立即進行效果最佳。	3	t	2026-02-24 08:21:58.224	2026-02-24 08:21:58.224
cmm0c7be9001995y9vyivaq3y	cmlzdo1i00000hvqcfqgsaene	3日PPL新手計劃	適合健身新手的3日推拉腿分化計劃，以中等重量的複合動作為主。每週訓練3天，各肌群有充足恢復時間。建議重量為體重的30–40%開始，掌握動作後再漸進增重。	3	t	2026-02-24 08:21:58.257	2026-02-24 08:21:58.257
cmm0c7j4s0002fmxrybjix3qu	cmm0c7j4i0000fmxr2onmb64v	5日PPL進階計劃	每週5日訓練，同肌群每週2次。D1推力(胸肩三頭)→D2拉力(背二頭)→D3腿部(股四主)→D4上肢補充→D5下肢後鏈	3	t	2026-02-24 08:22:08.284	2026-02-24 08:22:08.284
cmm0c7j660020fmxrtnt1haaz	cmm0c7j4i0000fmxr2onmb64v	5天分化訓練		3	t	2026-02-24 08:22:08.334	2026-02-24 08:22:08.334
cmm0c7j6y0036fmxr21fndqz6	cmm0c7j4i0000fmxr2onmb64v	5日PPL放鬆計劃	配合5日PPL進階計劃的收操放鬆計畫，以靜態伸展為主，每次約15–20分鐘。訓練後立即進行效果最佳。	3	t	2026-02-24 08:22:08.362	2026-02-24 08:22:08.362
cmm0c7j7r004efmxr8zqadf37	cmm0c7j4i0000fmxr2onmb64v	3日PPL新手計劃	適合健身新手的3日推拉腿分化計劃，以中等重量的複合動作為主。每週訓練3天，各肌群有充足恢復時間。建議重量為體重的30–40%開始，掌握動作後再漸進增重。	3	t	2026-02-24 08:22:08.392	2026-02-24 08:22:08.392
\.


--
-- Data for Name: workout_sessions; Type: TABLE DATA; Schema: public; Owner: workout
--

COPY public.workout_sessions (id, "userId", "planId", "dayId", "startedAt", "completedAt", "durationMin", notes) FROM stdin;
cmm01eg5a0001me72hg1z6dnf	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 03:19:35.23	\N	\N	\N
cmm0325ts00018udj8hdtw3z9	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:06:01.217	\N	\N	\N
cmm032udi000e8udj8ocbf23f	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:06:33.03	\N	\N	\N
cmm034cex000n8udj3hze42ck	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:07:43.065	\N	\N	\N
cmm0364oh000w8udj9hz2o1u2	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:09:06.354	\N	\N	\N
cmm03rrui000111scj9qeinci	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:25:56.155	\N	\N	\N
cmm03s0z5000a11scvegtybi7	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:26:07.985	\N	\N	\N
cmm04079r000n11scddl7rkcp	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:32:29.391	\N	\N	\N
cmm047rw2000y11scao3o5hbd	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:38:22.706	\N	\N	\N
cmm04c3xf001911scekcmaqe5	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 04:41:44.931	\N	\N	\N
cmm0589ra0001nbajpev26abx	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 05:06:45.479	\N	\N	\N
cmm0593w4000cnbajz3t02hvh	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 05:07:24.533	\N	\N	\N
cmm05ic84000rnbajraxt32m4	cmlzdo1i00000hvqcfqgsaene	cmm018dq90001ei9ezahypwyi	cmm018dq90002ei9e8amdv7jh	2026-02-24 05:14:35.236	\N	\N	\N
cmm0b8cg8001qnbajyotqr616	cmlzdo1i00000hvqcfqgsaene	cmm0b2xh40010nbajogleicdb	cmm0b2xh40011nbajcyrk9ti4	2026-02-24 07:54:46.665	2026-02-24 07:55:15.603	0	\N
\.


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: exercise_alternatives exercise_alternatives_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_alternatives
    ADD CONSTRAINT exercise_alternatives_pkey PRIMARY KEY ("exerciseId", "alternativeExerciseId");


--
-- Name: exercise_equipment exercise_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_equipment
    ADD CONSTRAINT exercise_equipment_pkey PRIMARY KEY ("exerciseId", "equipmentId");


--
-- Name: exercise_muscles exercise_muscles_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_muscles
    ADD CONSTRAINT exercise_muscles_pkey PRIMARY KEY ("exerciseId", "muscleGroupId");


--
-- Name: exercises exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);


--
-- Name: muscle_groups muscle_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.muscle_groups
    ADD CONSTRAINT muscle_groups_pkey PRIMARY KEY (id);


--
-- Name: personal_records personal_records_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT personal_records_pkey PRIMARY KEY (id);


--
-- Name: session_exercises session_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.session_exercises
    ADD CONSTRAINT session_exercises_pkey PRIMARY KEY (id);


--
-- Name: session_sets session_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.session_sets
    ADD CONSTRAINT session_sets_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: workout_plan_days workout_plan_days_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plan_days
    ADD CONSTRAINT workout_plan_days_pkey PRIMARY KEY (id);


--
-- Name: workout_plan_exercises workout_plan_exercises_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT workout_plan_exercises_pkey PRIMARY KEY (id);


--
-- Name: workout_plans workout_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT workout_plans_pkey PRIMARY KEY (id);


--
-- Name: workout_sessions workout_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_pkey PRIMARY KEY (id);


--
-- Name: equipment_name_key; Type: INDEX; Schema: public; Owner: workout
--

CREATE UNIQUE INDEX equipment_name_key ON public.equipment USING btree (name);


--
-- Name: exercise_alternatives_exerciseId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "exercise_alternatives_exerciseId_idx" ON public.exercise_alternatives USING btree ("exerciseId");


--
-- Name: exercise_equipment_equipmentId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "exercise_equipment_equipmentId_idx" ON public.exercise_equipment USING btree ("equipmentId");


--
-- Name: exercise_muscles_isPrimary_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "exercise_muscles_isPrimary_idx" ON public.exercise_muscles USING btree ("isPrimary");


--
-- Name: exercise_muscles_muscleGroupId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "exercise_muscles_muscleGroupId_idx" ON public.exercise_muscles USING btree ("muscleGroupId");


--
-- Name: exercises_difficulty_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX exercises_difficulty_idx ON public.exercises USING btree (difficulty);


--
-- Name: exercises_exerciseType_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "exercises_exerciseType_idx" ON public.exercises USING btree ("exerciseType");


--
-- Name: exercises_name_key; Type: INDEX; Schema: public; Owner: workout
--

CREATE UNIQUE INDEX exercises_name_key ON public.exercises USING btree (name);


--
-- Name: muscle_groups_name_key; Type: INDEX; Schema: public; Owner: workout
--

CREATE UNIQUE INDEX muscle_groups_name_key ON public.muscle_groups USING btree (name);


--
-- Name: personal_records_userId_exerciseId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "personal_records_userId_exerciseId_idx" ON public.personal_records USING btree ("userId", "exerciseId");


--
-- Name: personal_records_userId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "personal_records_userId_idx" ON public.personal_records USING btree ("userId");


--
-- Name: session_exercises_exerciseId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "session_exercises_exerciseId_idx" ON public.session_exercises USING btree ("exerciseId");


--
-- Name: session_exercises_sessionId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "session_exercises_sessionId_idx" ON public.session_exercises USING btree ("sessionId");


--
-- Name: session_sets_sessionExerciseId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "session_sets_sessionExerciseId_idx" ON public.session_sets USING btree ("sessionExerciseId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: workout
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: workout_plan_days_planId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_plan_days_planId_idx" ON public.workout_plan_days USING btree ("planId");


--
-- Name: workout_plan_exercises_dayId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_plan_exercises_dayId_idx" ON public.workout_plan_exercises USING btree ("dayId");


--
-- Name: workout_plan_exercises_exerciseId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_plan_exercises_exerciseId_idx" ON public.workout_plan_exercises USING btree ("exerciseId");


--
-- Name: workout_plans_userId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_plans_userId_idx" ON public.workout_plans USING btree ("userId");


--
-- Name: workout_plans_userId_isActive_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_plans_userId_isActive_idx" ON public.workout_plans USING btree ("userId", "isActive");


--
-- Name: workout_sessions_planId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_sessions_planId_idx" ON public.workout_sessions USING btree ("planId");


--
-- Name: workout_sessions_userId_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_sessions_userId_idx" ON public.workout_sessions USING btree ("userId");


--
-- Name: workout_sessions_userId_startedAt_idx; Type: INDEX; Schema: public; Owner: workout
--

CREATE INDEX "workout_sessions_userId_startedAt_idx" ON public.workout_sessions USING btree ("userId", "startedAt");


--
-- Name: exercise_alternatives exercise_alternatives_alternativeExerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_alternatives
    ADD CONSTRAINT "exercise_alternatives_alternativeExerciseId_fkey" FOREIGN KEY ("alternativeExerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_alternatives exercise_alternatives_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_alternatives
    ADD CONSTRAINT "exercise_alternatives_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_equipment exercise_equipment_equipmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_equipment
    ADD CONSTRAINT "exercise_equipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES public.equipment(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_equipment exercise_equipment_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_equipment
    ADD CONSTRAINT "exercise_equipment_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_muscles exercise_muscles_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_muscles
    ADD CONSTRAINT "exercise_muscles_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: exercise_muscles exercise_muscles_muscleGroupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.exercise_muscles
    ADD CONSTRAINT "exercise_muscles_muscleGroupId_fkey" FOREIGN KEY ("muscleGroupId") REFERENCES public.muscle_groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_records personal_records_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT "personal_records_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: personal_records personal_records_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.personal_records
    ADD CONSTRAINT "personal_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session_exercises session_exercises_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.session_exercises
    ADD CONSTRAINT "session_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: session_exercises session_exercises_sessionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.session_exercises
    ADD CONSTRAINT "session_exercises_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES public.workout_sessions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: session_sets session_sets_sessionExerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.session_sets
    ADD CONSTRAINT "session_sets_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES public.session_exercises(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workout_plan_days workout_plan_days_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plan_days
    ADD CONSTRAINT "workout_plan_days_planId_fkey" FOREIGN KEY ("planId") REFERENCES public.workout_plans(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workout_plan_exercises workout_plan_exercises_dayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT "workout_plan_exercises_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES public.workout_plan_days(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workout_plan_exercises workout_plan_exercises_exerciseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plan_exercises
    ADD CONSTRAINT "workout_plan_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES public.exercises(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: workout_plans workout_plans_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_plans
    ADD CONSTRAINT "workout_plans_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: workout_sessions workout_sessions_dayId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT "workout_sessions_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES public.workout_plan_days(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workout_sessions workout_sessions_planId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT "workout_sessions_planId_fkey" FOREIGN KEY ("planId") REFERENCES public.workout_plans(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: workout_sessions workout_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: workout
--

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT "workout_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict zk9kl73chsYmdofQH4uVgfbjOe8NGxHZblUaB6aBpi8Nni2imZ0cPFnLn7FdBUD

