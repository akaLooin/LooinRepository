package world.looin.app

import androidx.compose.runtime.Composable

/** 기기에서 고른 파일. */
class PickedFile(val name: String, val mime: String, val bytes: ByteArray)

/** 파일 고르기 창을 여는 함수를 돌려준다. 고르지 않으면 null. */
@Composable
expect fun rememberFilePicker(onPicked: (PickedFile?) -> Unit): () -> Unit
