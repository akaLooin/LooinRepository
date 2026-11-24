package world.looin.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import world.looin.app.AppController

@Composable
fun ConnectScreen(c: AppController) {
    var url by remember { mutableStateOf(c.serverUrl) }
    var token by remember { mutableStateOf(c.token) }
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Column(Modifier.widthIn(max = 420.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AkaelLogo(120)
            Text("아카엘", fontSize = 36.sp, fontWeight = FontWeight.Black)
            Text("aka eL", fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.secondary)
            Text(
                "나를 중심으로 돌아가는 세계, Looin World 에 접속합니다.\n서버 주소와 접속 토큰을 입력하세요.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            OutlinedTextField(
                url, { url = it }, label = { Text("서버 주소 또는 IP") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("예: 140.238.12.34") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
            )
            OutlinedTextField(
                token, { token = it }, label = { Text("접속 토큰") }, singleLine = true, modifier = Modifier.fillMaxWidth(),
                visualTransformation = PasswordVisualTransformation(),
            )
            Button(
                onClick = { c.connect(url, token) },
                enabled = !c.loading && url.isNotBlank() && token.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (c.loading) CircularProgressIndicator(Modifier.padding(2.dp), strokeWidth = 2.dp) else Text("입장하기")
            }
            Text(
                "IP 만 넣으면 안전한 HTTPS 주소로 자동 연결해요. 토큰은 서버 설치 때 정한 비밀번호예요.",
                style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
