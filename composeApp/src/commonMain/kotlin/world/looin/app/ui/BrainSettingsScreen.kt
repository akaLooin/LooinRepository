package world.looin.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import world.looin.app.AppController
import world.looin.shared.BrainSettingsUpdate
import world.looin.shared.BrainSettingsView

/**
 * 두뇌 설정: API 키를 서버에 저장한다. 키는 서버에만 저장되고 이 폰에는 남지 않는다.
 * 저장하면 서버가 재시작 없이 새 두뇌로 바뀐다.
 */
@Composable
fun BrainSettingsScreen(c: AppController) {
    var view by remember { mutableStateOf<BrainSettingsView?>(null) }
    val edits = remember { mutableStateMapOf<String, String>() }
    var saving by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { c.run({ it.brainSettings() }) { view = it } }

    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("🧠 두뇌 설정", onBack = { c.pop() })
        val v = view
        LazyColumn(Modifier.weight(1f)) {
            item {
                Text(
                    "키는 서버에만 저장되고 폰에는 남지 않아요. 비워두면 그대로 유지돼요.",
                    style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
            if (v != null) {
                item {
                    val b = v.brain
                    SectionCard {
                        Text("지금 두뇌", fontWeight = FontWeight.SemiBold)
                        if (!b.online) Text("아직 없음 (오프라인)", color = MaterialTheme.colorScheme.error)
                        b.providers.forEach { p ->
                            Text(
                                (if (p.available) "✅ " else "⏸ ") + "${p.name} · ${p.model}" + (p.note?.let { "\n   $it" } ?: "") +
                                    (p.lastError?.let { "\n   ⚠️ $it" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
                items(v.settings, key = { it.key }) { s ->
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(s.label, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text(
                                when {
                                    !s.isSet -> "없음"
                                    s.source == "env" -> "서버에 설정됨 ${s.preview ?: ""}"
                                    else -> "설정됨 ${s.preview ?: ""}"
                                },
                                style = MaterialTheme.typography.labelSmall,
                                color = if (s.isSet) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Text(s.help, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                edits[s.key] ?: "", { edits[s.key] = it; saved = false },
                                modifier = Modifier.weight(1f), singleLine = true,
                                placeholder = { Text(if (s.secret) "새 키 붙여넣기" else (s.preview ?: "")) },
                                visualTransformation = if (s.secret) PasswordVisualTransformation() else androidx.compose.ui.text.input.VisualTransformation.None,
                            )
                            if (s.isSet && s.source == "app") TextButton(onClick = {
                                c.run({ it.updateBrainSettings(BrainSettingsUpdate(mapOf(s.key to ""))) }) { view = it; c.refresh() }
                            }) { Text("지우기", color = MaterialTheme.colorScheme.error) }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
        }
        Button(
            onClick = {
                saving = true
                val changes = edits.filterValues { it.isNotBlank() }.mapValues { it.value.trim() }
                c.run({ it.updateBrainSettings(BrainSettingsUpdate(changes)) }) {
                    view = it; edits.clear(); saving = false; saved = true; c.refresh()
                }
            },
            enabled = !saving && edits.values.any { it.isNotBlank() },
            modifier = Modifier.fillMaxWidth().padding(12.dp),
        ) { Text(if (saved) "저장됨 ✓ 새 두뇌로 바뀌었어요" else if (saving) "저장 중…" else "저장") }
    }
}
