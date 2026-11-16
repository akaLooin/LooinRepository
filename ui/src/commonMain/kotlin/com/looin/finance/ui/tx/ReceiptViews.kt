package com.looin.finance.ui.tx

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.looin.finance.ui.components.ChipPill
import com.looin.finance.ui.components.SmallLabel
import com.looin.finance.ui.components.TextAction
import com.looin.finance.ui.platform.LocalReceiptScanner
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType

/**
 * 거래 편집의 영수증 줄: 촬영·앨범 버튼(스캔하면 금액·날짜·가게를 채움), 첨부된 사진 미리보기, 읽은 결과 안내.
 */
@Composable
internal fun ReceiptRow(
    attachment: String?,
    notice: String?,
    canScan: Boolean,
    onScan: (camera: Boolean) -> Unit,
    onView: () -> Unit,
    onRemove: () -> Unit,
) {
    val c = Looin.colors
    val scanner = LocalReceiptScanner.current
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (attachment != null) {
                val image = remember(attachment) { scanner.load(attachment, maxSize = 240) }
                Box(
                    Modifier.size(52.dp).clip(RoundedCornerShape(10.dp)).background(c.card).clickable(onClick = onView)
                        .semantics { contentDescription = "영수증 사진" },
                    contentAlignment = Alignment.Center,
                ) {
                    if (image != null) Image(image, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                    else SmallLabel("사진")
                }
            }
            if (canScan) {
                ChipPill(if (attachment == null) "영수증 촬영" else "다시 촬영", false, { onScan(true) })
                ChipPill("앨범에서", false, { onScan(false) })
            }
            Spacer(Modifier.weight(1f))
            if (attachment != null) TextAction("사진 삭제", onRemove, color = c.textSecondary)
        }
        if (notice != null) {
            Text(notice, style = LooinType.body, color = c.text,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(c.primary.copy(alpha = 0.10f)).padding(10.dp))
        } else if (attachment == null && canScan) {
            SmallLabel("영수증을 찍으면 금액·날짜·가게 이름을 자동으로 채워요. 사진은 이 기기 안에만 보관돼요.")
        }
    }
}

/** 영수증 사진 크게 보기(누르면 닫힘). */
@Composable
internal fun ReceiptViewer(path: String, onClose: () -> Unit) {
    val scanner = LocalReceiptScanner.current
    val image = remember(path) { scanner.load(path, maxSize = 2000) }
    Dialog(onClose, DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black).clickable(onClick = onClose), contentAlignment = Alignment.Center) {
            if (image != null) Image(image, "영수증 사진 크게 보기", Modifier.fillMaxSize().padding(12.dp), contentScale = ContentScale.Fit)
            else Text("사진을 찾을 수 없어요", color = Color.White, style = LooinType.body)
            Row(Modifier.align(Alignment.TopEnd).statusBarsPadding().padding(8.dp)) {
                Text("닫기", color = Color.White, style = LooinType.bodyLg.copy(fontWeight = FontWeight.SemiBold),
                    modifier = Modifier.clip(RoundedCornerShape(50)).clickable(onClick = onClose).padding(horizontal = 14.dp, vertical = 10.dp))
                Spacer(Modifier.width(4.dp))
            }
        }
    }
}
