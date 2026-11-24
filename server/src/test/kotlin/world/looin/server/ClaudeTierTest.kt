package world.looin.server

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.runBlocking
import world.looin.server.ai.Brain
import world.looin.server.ai.BrainRequest
import world.looin.server.ai.BrainUnavailable
import world.looin.server.ai.ClaudeBudget
import world.looin.server.ai.Price
import world.looin.server.ai.TieredBrain
import world.looin.server.ai.Turn
import world.looin.shared.BrainInfo
import world.looin.shared.ChatRole
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ClaudeTierTest {
    private class Premium(val available: Boolean) : Brain {
        var calls = 0
        override val info = BrainInfo("premium", "p", true)
        override val premiumOnly = true
        override fun stream(req: BrainRequest): Flow<String> = flow {
            calls++
            if (!available) throw BrainUnavailable("budget")
            req.onProvider?.invoke("claude:test")
            emit("좋은 답")
        }
    }

    private class Free : Brain {
        override val info = BrainInfo("free", "f", true)
        override fun stream(req: BrainRequest): Flow<String> { req.onProvider?.invoke("groq:x"); return flowOf("무료 답") }
    }

    private fun req(premium: Boolean = true, on: (String) -> Unit = {}) =
        BrainRequest("sys", turns = listOf(Turn(ChatRole.USER, "hi")), premium = premium, onProvider = on)

    @Test
    fun usesPremiumFirstThenFallsBack() = runBlocking {
        var used = ""
        assertEquals("좋은 답", TieredBrain(listOf(Premium(true), Free())).stream(req { used = it }).toList().joinToString(""))
        assertEquals("claude:test", used)
        assertEquals("무료 답", TieredBrain(listOf(Premium(false), Free())).stream(req { used = it }).toList().joinToString(""))
        assertEquals("groq:x", used)
    }

    @Test
    fun backgroundWorkSkipsPremium() = runBlocking {
        val p = Premium(true)
        assertEquals("무료 답", TieredBrain(listOf(p, Free())).stream(req(premium = false)).toList().joinToString(""))
        assertEquals(0, p.calls)
    }

    @Test
    fun budgetPacing() {
        // 결제 주기 시작일 10일, 11월(10일~12월 10일 = 30일) 중 15일째 → 6일 경과 → 100 * 6/30 = 20
        val b = ClaudeBudget(100.0, 10, pacing = true, today = { LocalDate.of(2026, 11, 15) })
        assertEquals(LocalDate.of(2026, 11, 10), b.cycleStart())
        assertEquals(20.0, b.allowedSoFar(), 0.001)
        // 주기 시작일 이전이면 지난달 주기
        assertEquals(LocalDate.of(2026, 10, 10), ClaudeBudget(100.0, 10, true, today = { LocalDate.of(2026, 11, 3) }).cycleStart())
        assertEquals(100.0, ClaudeBudget(100.0, 1, pacing = false).allowedSoFar(), 0.001)
        // Opus 5.5: 입력 3000(캐시 읽기 2000) + 출력 800 토큰 ≈ $0.0204
        assertTrue(Price.forModel("claude-opus-5-5").cost(1000, 800, 2000, 0) in 0.0203..0.0205)
    }
}
