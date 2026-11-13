package com.looin.finance.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.remember
import com.looin.finance.ui.components.ConfirmDialog
import com.looin.finance.ui.components.ValueRow
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.FieldDivider
import com.looin.finance.ui.components.FieldGroup
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.components.PrimaryButton
import com.looin.finance.ui.components.ScreenHeader
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.UnderlineField
import com.looin.finance.ui.components.korean
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import com.looin.finance.ui.theme.ThemeMode
import com.looin.finance.ui.theme.ThemePrefs
import com.looin.finance.ui.platform.LocalAppInfo
import com.looin.finance.ui.platform.LocalFileActions

@Composable
fun SettingsScreen(state: UiState, vm: MainViewModel, onBack: () -> Unit, onOpenCategories: () -> Unit = {}) {
    val c = Looin.colors
    val files = LocalFileActions.current
    val appInfo = LocalAppInfo.current
    val s = state.settings
    var dayText by rememberSaveable(s.paydayDay) { mutableStateOf(s.paydayDay.toString()) }
    var basis by rememberSaveable(s.primaryBasis) { mutableStateOf(s.primaryBasis) }
    val day = dayText.toIntOrNull()?.takeIf { it in 1..31 }
    // 복원은 파일을 고른 뒤 한 번 더 확인받는다.
    var pendingRestore by remember { mutableStateOf<(() -> String)?>(null) }
    pendingRestore?.let { read ->
        ConfirmDialog("백업에서 복원", "지금 기기의 계좌·거래·예산·반복 거래가 모두 백업 파일 내용으로 바뀌어요. 계속할까요?", "복원",
            { pendingRestore = null }, danger = true) {
            vm.restoreBackup(read)
        }
    }
    Column(Modifier.fillMaxSize().background(c.bg).statusBarsPadding().navigationBarsPadding()) {
        ScreenHeader("설정", onBack)
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = GUTTER), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Title("회계 기간")
            SmallLabel("예산은 주 기준 하나로만 관리해요. 다른 기준은 분석 탭에서 비교해 볼 수 있어요.")
            FieldGroup {
                PeriodBasis.entries.forEachIndexed { i, b ->
                    if (i > 0) FieldDivider()
                    RadioRow(b.label, if (b == PeriodBasis.CALENDAR) "매월 1일 ~ 말일" else "급여 기준일 ~ 다음 기준일 전날", basis == b) { basis = b }
                }
            }
            UnderlineField(dayText, { v -> dayText = v.filter { it.isDigit() }.take(2) }, "급여 기준일 (1~31)", keyboardType = KeyboardType.Number, isError = day == null)
            SmallLabel("실제 급여 입금일과 별개인 '기간 시작일'이에요. 그 달에 해당 날짜가 없으면 말일을 적용해요.")
            if (day != null) {
                val p2 = PeriodCalculator.periodContaining(state.today, PeriodBasis.PAYDAY, day)
                SmallLabel("예시: 지금 월급일 기준 기간은 ${p2.start.korean(true)} ~ ${p2.lastDay.korean(true)}", color = c.textSecondary)
            }
            SmallLabel("바꿔도 기존 거래와 예산 기록은 그대로 보존돼요. 예산은 만들 당시 기간에 묶여 있으니 새 기준의 기간에는 예산을 새로 만들거나 가져오세요.")
            PrimaryButton("기간 설정 저장", { vm.updateSettings(FinanceSettings(paydayDay = day!!, primaryBasis = basis)) },
                enabled = day != null && (day != s.paydayDay || basis != s.primaryBasis), strong = true)

            Spacer(Modifier.height(8.dp))
            Title("분류")
            FieldGroup {
                ValueRow("카테고리 관리", "지출 ${state.data.categories.count { it.kind == com.looin.finance.core.model.CategoryKind.EXPENSE && !it.archived }} · 수입 ${state.data.categories.count { it.kind == com.looin.finance.core.model.CategoryKind.INCOME && !it.archived }}", onClick = onOpenCategories)
            }

            Spacer(Modifier.height(8.dp))
            Title("화면")
            FieldGroup {
                ThemeMode.entries.forEachIndexed { i, m ->
                    if (i > 0) FieldDivider()
                    RadioRow(m.label, if (m == ThemeMode.SYSTEM) "시스템이 라이트가 아니면 다크로 보여요" else null, ThemePrefs.mode == m) { ThemePrefs.set(m) }
                }
            }

            Spacer(Modifier.height(8.dp))
            Title("데이터")
            Text("모든 데이터는 이 기기에만 저장돼요(서버 전송 없음).", style = LooinType.body, color = c.text)
            SmallLabel("휴대폰을 바꾸거나 앱을 지우면 데이터가 사라지니, 백업 파일을 만들어 안전한 곳(클라우드 드라이브 등)에 보관하세요.")
            FieldGroup {
                ValueRow("백업 파일 만들기", "JSON", onClick = { files.saveText("looin-backup-${state.today}.json") { write -> vm.exportBackup("${appInfo.versionName} (${appInfo.platform.label})", write) } })
                FieldDivider()
                ValueRow("백업에서 복원", "전체 교체", onClick = { files.openText { read -> pendingRestore = read } }, valueColor = c.danger)
            }
            SmallLabel("복원하면 지금 데이터가 백업 내용으로 모두 바뀌어요. 파일을 먼저 검사하고, 문제가 있으면 아무것도 바꾸지 않아요.")
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun Title(text: String) = Text(text, style = LooinType.sheetTitle, color = Looin.colors.text, modifier = Modifier.padding(top = 8.dp))

/** 투두메이트 시트 안 큰 선택: 꺼짐 = 테두리 원, 켜짐 = 흰 원 + 검은 점. */
@Composable
private fun RadioRow(label: String, sub: String?, selected: Boolean, onClick: () -> Unit) {
    val c = Looin.colors
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(label, style = LooinType.bodyLg, color = c.text)
            if (sub != null) SmallLabel(sub)
        }
        Box(
            Modifier.size(24.dp).clip(CircleShape)
                .then(if (selected) Modifier.background(c.selectedBg) else Modifier.border(2.dp, c.surfaceStrong, CircleShape)),
            contentAlignment = Alignment.Center,
        ) { if (selected) Box(Modifier.size(9.dp).clip(CircleShape).background(c.onSelected)) }
    }
}
