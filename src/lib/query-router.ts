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

const DIRECT_KEYWORDS = [
    'PR', 'pr', '紀錄', '最高', '幾次', '頻率', '最大', '最重',
    '幾組', '總共', '上次', '最近一次', '做了多少', '多久沒練',
    '1rm', '1RM', 'e1rm',
]

const ANALYSIS_KEYWORDS = [
    '進步', '趨勢', '變化', '比較', '成長', '退步', '對比',
    '週報', '月報', '統計', '分析', '平均', '走勢',
]

const RECOMMENDATION_KEYWORDS = [
    '推薦', '建議', '該練', '怎麼', '如何', '安排', '菜單',
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

export function classifyQuery(question: string): ClassificationResult {
    const q = question.trim()

    const directScore = matchScore(q, DIRECT_KEYWORDS)
    const analysisScore = matchScore(q, ANALYSIS_KEYWORDS)
    const recommendationScore = matchScore(q, RECOMMENDATION_KEYWORDS)

    // Pick highest score; ties break in order: direct > analysis > recommendation
    const maxScore = Math.max(directScore, analysisScore, recommendationScore)

    if (maxScore === 0) {
        return { type: 'book-knowledge', label: '書籍知識' }
    }

    if (directScore === maxScore) {
        return { type: 'direct', label: '直接查詢' }
    }
    if (analysisScore === maxScore) {
        return { type: 'analysis', label: '分析' }
    }
    return { type: 'recommendation', label: '推薦' }
}
