/**
 * Query Router — classifies user questions to determine handling strategy.
 *
 * - direct:          SQL-only, no LLM (PR lookup, frequency, counts)
 * - analysis:        DB data + LLM (trends, progress, comparisons)
 * - recommendation:  DB data + LLM (training suggestions, muscle balance)
 * - book-knowledge:  Existing RAG pipeline (fitness book Q&A)
 */

export type QueryType = 'direct' | 'analysis' | 'recommendation' | 'book-knowledge'

interface ClassificationResult {
    type: QueryType
    /** Human-readable label shown as badge in UI */
    label: string
}

// ── Keyword lists ────────────────────────────────────────────────────────────

/**
 * A question is about the user's own training only when it says so. Generic
 * "how do I / what do you recommend" questions are book knowledge, even though
 * they contain words like 推薦 or 計畫.
 */
const PERSONAL_MARKERS = [
    '我', '本人', '自己的',
    '最近', '這週', '本週', '這個月', '本月', '上週', '上個月', '今天練', '昨天',
    '多久沒練', '上次',
]

const DIRECT_KEYWORDS = [
    '紀錄', '最高', '幾次', '頻率', '最大', '最重',
    '幾組', '總共', '上次', '最近一次', '做了多少', '多久沒練',
]
// Latin abbreviations need word boundaries so "program" / "press" do not match "pr".
const DIRECT_PATTERNS = [/\bpr\b/i, /\be?1rm\b/i]

const ANALYSIS_KEYWORDS = [
    '進步', '趨勢', '變化', '比較', '成長', '退步', '對比',
    '週報', '月報', '統計', '分析', '平均', '走勢',
]

const RECOMMENDATION_KEYWORDS = [
    '推薦', '建議', '該練', '安排', '菜單',
    '課表', '計畫', '排程', '平衡', '弱點', '不足',
    '今天練什麼', '下一步', '該加重', '該減量',
]

// ── Classifier ───────────────────────────────────────────────────────────────

function matchScore(text: string, keywords: string[]): number {
    let score = 0
    for (const kw of keywords) {
        if (text.includes(kw)) score++
    }
    return score
}

export interface ClassifyOptions {
    /** A book was picked in the UI: the user explicitly wants book knowledge. */
    bookFilter?: string | null
}

export function classifyQuery(question: string, options: ClassifyOptions = {}): ClassificationResult {
    const q = question.trim()
    const bookResult: ClassificationResult = { type: 'book-knowledge', label: '書籍知識' }

    if (options.bookFilter) return bookResult
    if (matchScore(q, PERSONAL_MARKERS) === 0) return bookResult

    const directScore = matchScore(q, DIRECT_KEYWORDS) + DIRECT_PATTERNS.filter(re => re.test(q)).length
    const analysisScore = matchScore(q, ANALYSIS_KEYWORDS)
    const recommendationScore = matchScore(q, RECOMMENDATION_KEYWORDS)

    // Pick highest score; ties break in order: direct > analysis > recommendation
    const maxScore = Math.max(directScore, analysisScore, recommendationScore)

    if (maxScore === 0) return bookResult

    if (directScore === maxScore) {
        return { type: 'direct', label: '直接查詢' }
    }
    if (analysisScore === maxScore) {
        return { type: 'analysis', label: '分析' }
    }
    return { type: 'recommendation', label: '推薦' }
}
