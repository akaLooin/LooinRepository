package com.looin.finance.ui.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.looin.finance.core.model.FinanceSettings
import com.looin.finance.core.period.PeriodBasis
import com.looin.finance.core.period.PeriodCalculator
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.components.SectionCard
import com.looin.finance.ui.components.Segmented
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.korean

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(state: UiState, vm: MainViewModel, onBack: () -> Unit) {
    val s = state.settings
    var dayText by rememberSaveable(s.paydayDay) { mutableStateOf(s.paydayDay.toString()) }
    var basis by rememberSaveable(s.primaryBasis) { mutableStateOf(s.primaryBasis) }
    val day = dayText.toIntOrNull()?.takeIf { it in 1..31 }
    Scaffold(topBar = {
        TopAppBar(title = { Text("설정") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "뒤로") } })
    }) { p ->
        Column(Modifier.padding(p).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            SectionCard("회계 기간") {
                Text("예산 관리 주 기준", style = MaterialTheme.typography.labelLarge)
                Segmented(PeriodBasis.entries, basis, { it.label }, { basis = it })
                SmallLabel("예산은 주 기준 하나로만 관리합니다. 다른 기준은 분석 탭에서 비교 조회할 수 있습니다.")
                OutlinedTextField(
                    dayText, { v -> dayText = v.filter { it.isDigit() }.take(2) },
                    label = { Text("급여 기준일 (1~31)") }, singleLine = true, isError = day == null,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                )
                SmallLabel("실제 급여 입금일과 별개인 '기간 시작일'입니다. 그 달에 해당 날짜가 없으면 말일을 적용합니다.")
                if (day != null) {
                    val p2 = PeriodCalculator.periodContaining(state.today, PeriodBasis.PAYDAY, day)
                    SmallLabel("예시: 현재 월급일 기준 기간 ${p2.start.korean(true)} ~ ${p2.lastDay.korean(true)}")
                }
                SmallLabel("설정을 바꿔도 기존 거래와 예산 기록은 그대로 보존됩니다. 예산은 만들 당시 기간에 묶여 있으므로, 새 기준의 기간에는 예산을 새로 만들거나 복사하세요.")
                Button(enabled = day != null && (day != s.paydayDay || basis != s.primaryBasis),
                    onClick = { vm.updateSettings(FinanceSettings(paydayDay = day!!, primaryBasis = basis)) },
                    modifier = Modifier.padding(top = 8.dp)) { Text("저장") }
            }
            SectionCard("데이터") {
                Text("모든 데이터는 이 기기에만 저장됩니다(서버 전송 없음).", style = MaterialTheme.typography.bodyMedium)
                SmallLabel("샘플 데이터는 만들지 않습니다. 백업·복원과 금융기관 연동은 다음 단계에서 지원할 예정입니다.")
            }
        }
    }
}
