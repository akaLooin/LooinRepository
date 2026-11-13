package com.looin.finance.ui

import android.graphics.Bitmap
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.performClick
import com.looin.finance.LooinApp
import com.looin.finance.MainActivity
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.AccountType
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.recurring.Frequency
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.coroutines.runBlocking
import kotlinx.datetime.DatePeriod
import kotlinx.datetime.LocalDate
import kotlinx.datetime.minus
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * 스토어 등록용 스크린샷(1080×1920, 다크). 테스트 안에서만 "예시 데이터"를 넣어 캡처한다.
 * 앱 자체는 샘플 데이터를 만들지 않는다. 결과: app/build/store-screenshots/
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [34], qualifiers = "w360dp-h640dp-night-xxhdpi")
class StoreScreenshotTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()

    private fun shot(name: String) {
        rule.waitForIdle()
        val dir = File("build/store-screenshots").apply { mkdirs() }
        val view = rule.activity.window.decorView
        val bmp = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        rule.runOnUiThread { view.draw(android.graphics.Canvas(bmp)) }
        File(dir, "$name.png").outputStream().use { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }
    }

    private fun seed() = runBlocking {
        val repo = (rule.activity.application as LooinApp).repository
        repo.ensureInitialized()
        val today = repo.today()
        val cat = repo.snapshot().categories.associateBy { it.name }
        val main = repo.saveAccount(Account(name = "주거래 통장", type = AccountType.CHECKING, openingBalance = 2_850_000, includeInAvailable = true))
        val wallet = repo.saveAccount(Account(name = "지갑", type = AccountType.CASH, openingBalance = 82_000, includeInAvailable = true))
        val saving = repo.saveAccount(Account(name = "비상금 저축", type = AccountType.SAVINGS, openingBalance = 5_000_000))
        val card = repo.saveAccount(Account(name = "신용카드", type = AccountType.LIABILITY, openingBalance = -340_000))
        val monthStart = LocalDate(today.year, today.month, 1)
        fun day(back: Int) = today.minus(DatePeriod(days = back)).let { if (it < monthStart) monthStart else it }
        suspend fun spend(amount: Long, memo: String, c: String, back: Int, from: Long = main) = repo.saveTransaction(Transaction(
            type = TransactionType.EXPENSE, status = TransactionStatus.COMPLETED, amount = amount, date = day(back), completedDate = day(back),
            fromAccountId = from, categoryId = cat[c]!!.id, memo = memo))
        spend(9_500, "점심", "식비", 0)
        spend(4_800, "아메리카노", "카페·간식", 0, wallet)
        spend(63_200, "장보기", "식비", 1, card)
        spend(1_450, "버스", "교통", 1, wallet)
        spend(32_000, "영화", "문화·여가", 3, card)
        spend(18_900, "생활용품", "생활용품", 5)
        spend(12_000, "저녁", "식비", 6)
        repo.saveTransaction(Transaction(type = TransactionType.TRANSFER, status = TransactionStatus.COMPLETED, amount = 300_000,
            date = day(2), completedDate = day(2), fromAccountId = main, toAccountId = saving, memo = "저축"))
        val p = PeriodCalculator.periodContaining(today, repo.snapshot().settings.primaryBasis, repo.snapshot().settings.paydayDay)
        listOf("식비" to 450_000L, "카페·간식" to 80_000L, "교통" to 100_000L, "문화·여가" to 120_000L, "주거·관리비" to 600_000L, "통신" to 80_000L).forEach { (n, a) ->
            repo.saveBudget(Budget(basis = p.basis, periodStart = p.start, periodEndExclusive = p.endExclusive, categoryId = cat[n]!!.id, amount = a))
        }
        repo.saveRule(RecurringRule(name = "월세", type = TransactionType.EXPENSE, amount = 550_000, fromAccountId = main,
            categoryId = cat["주거·관리비"]!!.id, frequency = Frequency.MONTHLY, dayOfMonth = 31, startDate = monthStart))
        repo.saveRule(RecurringRule(name = "통신비", type = TransactionType.EXPENSE, amount = 69_000, fromAccountId = card,
            categoryId = cat["통신"]!!.id, frequency = Frequency.MONTHLY, dayOfMonth = 28, startDate = monthStart))
        repo.saveRule(RecurringRule(name = "급여", type = TransactionType.INCOME, amount = 3_200_000, toAccountId = main,
            categoryId = cat["급여"]!!.id, frequency = Frequency.MONTHLY, dayOfMonth = 25, startDate = monthStart))
    }

    @Test fun captureStoreScreenshots() {
        rule.waitUntilAtLeastOneExists(hasText("첫 계좌 등록"), 10_000)
        seed()
        rule.waitUntilAtLeastOneExists(hasText("생활비로 사용 가능한 금액", substring = true), 10_000)
        shot("1_home")
        rule.onAllNodesWithText("캘린더").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasText("오늘"), 10_000)
        shot("2_calendar")
        rule.onAllNodesWithText("돈 관리").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasText("예정 지출까지 확보하고 남는 예산", substring = true), 10_000)
        shot("3_plan")
        rule.onAllNodesWithText("자산").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasText("순자산"), 10_000)
        shot("4_assets")
        rule.onAllNodesWithText("분석").onFirst().performClick()
        rule.waitUntilAtLeastOneExists(hasText("카테고리별 소비"), 10_000)
        shot("5_analysis")
        rule.onNodeWithContentDescription("거래 검색").performClick()
        rule.waitUntilAtLeastOneExists(hasText("메모, 카테고리, 계좌, 금액"), 10_000)
        shot("6_search")
    }
}
