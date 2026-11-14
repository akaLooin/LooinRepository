package com.looin.finance.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.looin.finance.core.model.Account
import com.looin.finance.core.model.Budget
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.period.Period
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.core.validation.ValidationResult
import com.looin.finance.data.FinanceData
import com.looin.finance.data.FinanceException
import com.looin.finance.data.FinanceRepository
import com.looin.finance.core.recurring.RecurringRule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDate
import com.looin.finance.core.csv.ImportPreview

data class UiState(
    val data: FinanceData = FinanceData(),
    val today: LocalDate,
) {
    val settings: FinanceSettings get() = data.settings
    fun periodOf(date: LocalDate, basis: PeriodBasis = settings.primaryBasis): Period =
        PeriodCalculator.periodContaining(date, basis, settings.paydayDay)
    val currentPeriod: Period get() = periodOf(today)
}

/**
 * 앱 전체가 공유하는 상태. 저장된 원본 데이터만 들고 있고,
 * 잔고·예산·통계 등 모든 수치는 화면에서 :core 계산기로 계산한다.
 */
/** CSV 가져오기 미리보기: 읽은 파일, 분류 결과, 계좌 열이 없을 때 쓸 기본 계좌. */
data class CsvImportState(val text: String, val preview: ImportPreview, val accountId: Long?, val keepDuplicates: Set<Int> = emptySet())

class MainViewModel(private val repo: FinanceRepository) : ViewModel() {

    private val today = MutableStateFlow(repo.today())
    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 4)
    val messages: SharedFlow<String> = _messages

    val state: StateFlow<UiState> = combine(repo.data, today) { d, t -> UiState(d, t) }
        .stateIn(viewModelScope, SharingStarted.Eagerly, UiState(today = repo.today()))

    init {
        viewModelScope.launch { repo.ensureInitialized() }
    }

    /** 앱 복귀 시 날짜가 바뀌었으면 갱신(자정 넘김 대비). */
    fun refreshToday() {
        today.value = repo.today()
        // 날짜가 지나면 다음 기간의 반복 거래 예정분을 채운다(중복 없음)
        // 자동이체 규칙은 발생일이 되면 자동 완료하고 알려 준다
        viewModelScope.launch {
            runCatching {
                repo.generateRecurring()
                val n = repo.completeDueAutoPay()
                if (n > 0) _messages.tryEmit("자동이체 ${n}건을 완료 처리했어요")
            }
        }
    }

    private fun run(success: String?, onSuccess: () -> Unit = {}, block: suspend () -> Unit) {
        viewModelScope.launch {
            try {
                block()
                success?.let { _messages.tryEmit(it) }
                onSuccess()
            } catch (e: FinanceException) {
                _messages.tryEmit(e.message ?: "처리할 수 없습니다.")
            }
        }
    }

    /** 화면에서 바로 안내 문구를 띄운다. */
    fun say(message: String) { _messages.tryEmit(message) }

    fun validate(tx: Transaction, onResult: (ValidationResult) -> Unit) {
        viewModelScope.launch { onResult(repo.validate(tx)) }
    }

    fun saveTransaction(tx: Transaction, onSuccess: () -> Unit) =
        run(if (tx.id == 0L) "저장했습니다" else "수정했습니다", onSuccess) { repo.saveTransaction(tx) }

    fun deleteTransaction(id: Long, onSuccess: () -> Unit = {}) = run("삭제했습니다", onSuccess) { repo.deleteTransaction(id) }
    fun completeTransaction(id: Long, date: LocalDate, amount: Long?) = run("완료 처리했습니다") { repo.completeTransaction(id, date, amount) }
    fun cancelTransaction(id: Long) = run("취소 처리했습니다") { repo.cancelTransaction(id) }
    fun reopenTransaction(id: Long) = run("예정으로 되돌렸습니다") { repo.reopenTransaction(id) }

    fun saveAccount(account: Account, onSuccess: () -> Unit) = run("계좌를 저장했습니다", onSuccess) { repo.saveAccount(account) }
    fun setArchived(id: Long, archived: Boolean, onSuccess: () -> Unit = {}) =
        run(if (archived) "보관했습니다" else "보관을 해제했습니다", onSuccess) { repo.setArchived(id, archived) }

    fun adjustBalance(id: Long, target: Long, date: LocalDate, memo: String) = run(null) {
        val adj = repo.adjustBalance(id, target, date, memo)
        _messages.tryEmit(if (adj == null) "잔고가 같아 조정하지 않았습니다" else "잔고를 조정했습니다")
    }

    fun saveBudget(budget: Budget, onSuccess: () -> Unit = {}) = run("예산을 저장했습니다", onSuccess) { repo.saveBudget(budget) }
    fun deleteBudget(id: Long) = run("예산을 삭제했습니다") { repo.deleteBudget(id) }
    fun copyBudgets(from: Period, to: Period) = run(null) {
        val n = repo.copyBudgets(from, to)
        _messages.tryEmit(if (n == 0) "복사할 예산이 없습니다" else "예산 ${n}개를 복사했습니다")
    }

    fun updateSettings(settings: FinanceSettings) = run("설정을 저장했습니다") { repo.updateSettings(settings) }

    fun saveCategory(category: com.looin.finance.core.model.Category, onSuccess: () -> Unit) =
        run(if (category.id == 0L) "카테고리를 추가했습니다" else "카테고리를 저장했습니다", onSuccess) { repo.saveCategory(category) }

    fun saveGoal(goal: com.looin.finance.core.savings.SavingsGoal, onSuccess: () -> Unit) =
        run(if (goal.id == 0L) "저축 목표를 만들었습니다" else "저축 목표를 저장했습니다", onSuccess) { repo.saveGoal(goal) }

    fun allocate(goalId: Long, amount: Long, date: LocalDate, memo: String, onSuccess: () -> Unit = {}) =
        run(if (amount > 0) "목표에 떼어 뒀습니다" else "배정을 해제했습니다", onSuccess) { repo.allocate(goalId, amount, date, memo) }

    fun setGoalArchived(goalId: Long, archived: Boolean) =
        run(if (archived) "목표를 보관하고 배정을 풀었습니다" else "목표를 다시 사용합니다") { repo.setGoalArchived(goalId, archived) }

    fun saveRule(rule: RecurringRule, onSuccess: () -> Unit) =
        run(if (rule.id == 0L) "반복 거래를 만들었습니다" else "반복 거래를 수정했습니다", onSuccess) { repo.saveRule(rule) }

    fun deleteRule(id: Long, onSuccess: () -> Unit) = run("반복 거래를 삭제했습니다", onSuccess) { repo.deleteRule(id) }

    /** 백업 파일 쓰기. [write] 는 IO 스레드에서 호출된다. */
    fun exportBackup(appVersion: String, write: (String) -> Unit) = run("백업 파일을 저장했습니다") {
        val json = repo.exportBackup(appVersion)
        try {
            withContext(Dispatchers.IO) { write(json) }
        } catch (e: Exception) {
            throw FinanceException("백업 파일을 저장하지 못했습니다: ${e.message}")
        }
        com.looin.finance.ui.theme.ThemePrefs.recordBackup(repo.today().toEpochDays()) // 백업 알림 기준일
    }

    /** 백업 파일 읽기 → 검증 → 전체 교체. */
    fun restoreBackup(read: () -> String) = run(null) {
        val text = try { withContext(Dispatchers.IO) { read() } } catch (e: Exception) {
            throw FinanceException("백업 파일을 읽지 못했습니다: ${e.message}")
        }
        val s = repo.restoreBackup(text)
        _messages.tryEmit("복원했습니다 · 계좌 ${s.accounts}개, 거래 ${s.transactions}건, 예산 ${s.budgets}개, 반복 ${s.rules}개")
    }

    // ── CSV ──────────────────────────────────────────────

    private val _csvImport = MutableStateFlow<CsvImportState?>(null)
    val csvImport: StateFlow<CsvImportState?> = _csvImport

    fun exportCsv(write: (String) -> Unit) = run("CSV 파일을 저장했습니다") {
        val csv = repo.exportCsv()
        try { withContext(Dispatchers.IO) { write(csv) } } catch (e: Exception) {
            throw FinanceException("CSV 파일을 저장하지 못했습니다: ${e.message}")
        }
    }

    /** 파일을 읽어 미리보기를 만든다(아직 저장하지 않음). 기본 계좌: 생활비 계좌 중 첫 번째. */
    fun loadCsv(read: () -> String, onLoaded: () -> Unit) = run(null) {
        val text = try { withContext(Dispatchers.IO) { read() } } catch (e: Exception) {
            throw FinanceException("CSV 파일을 읽지 못했습니다: ${e.message}")
        }
        val accounts = state.value.data.accounts.filter { !it.archived }
        val accountId = (accounts.firstOrNull { it.includeInAvailable } ?: accounts.firstOrNull())?.id
        _csvImport.value = CsvImportState(text, repo.previewCsv(text, accountId), accountId)
        onLoaded()
    }

    fun setCsvAccount(id: Long) {
        val cur = _csvImport.value ?: return
        // 계좌가 바뀌면 중복 판정도 바뀌므로 "중복 아님" 확인은 다시 받는다
        viewModelScope.launch { _csvImport.value = cur.copy(preview = repo.previewCsv(cur.text, id), accountId = id, keepDuplicates = emptySet()) }
    }

    fun confirmCsvImport(onDone: () -> Unit) {
        val cur = _csvImport.value ?: return
        run(null, onDone) {
            val n = repo.importCsv(cur.text, cur.accountId, cur.keepDuplicates)
            _csvImport.value = null
            _messages.tryEmit("거래 ${n}건을 가져왔습니다")
        }
    }

    fun cancelCsvImport() { _csvImport.value = null }

    /** 중복으로 보이는 줄을 "중복 아님 → 가져오기"로 표시하거나 해제한다. */
    fun toggleKeepDuplicate(line: Int) {
        val cur = _csvImport.value ?: return
        _csvImport.value = cur.copy(keepDuplicates = if (line in cur.keepDuplicates) cur.keepDuplicates - line else cur.keepDuplicates + line)
    }

    fun setKeepAllDuplicates(keep: Boolean) {
        val cur = _csvImport.value ?: return
        _csvImport.value = cur.copy(keepDuplicates = if (keep) cur.preview.items.filter { it.status == com.looin.finance.core.csv.ImportStatus.DUPLICATE }.map { it.line }.toSet() else emptySet())
    }

    // ── 카테고리 삭제 ─────────────────────────────────────

    fun categoryUsage(id: Long, onResult: (FinanceRepository.CategoryUsage) -> Unit) {
        viewModelScope.launch { onResult(repo.categoryUsage(id)) }
    }

    fun deleteCategory(id: Long, onSuccess: () -> Unit = {}) = run(null, onSuccess) {
        val u = repo.deleteCategory(id)
        _messages.tryEmit(if (u.transactions + u.rules > 0) "카테고리를 삭제했습니다 · 거래 ${u.transactions + u.rules}건은 미분류로 남아요" else "카테고리를 삭제했습니다")
    }

    /** 카테고리를 만들고 새 id 를 돌려준다(거래 입력 중 바로 추가). */
    fun addCategory(category: com.looin.finance.core.model.Category, onCreated: (Long) -> Unit) = run("카테고리를 추가했습니다") {
        val id = repo.saveCategory(category)
        onCreated(id)
    }

    /** 계좌를 만들고 새 id 를 돌려준다(거래 입력 중 입금·출금 계좌 바로 추가). */
    fun addAccount(account: Account, onCreated: (Long) -> Unit) = run("계좌를 추가했습니다") {
        val id = repo.saveAccount(account)
        onCreated(id)
    }
}
