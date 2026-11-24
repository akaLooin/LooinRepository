package world.looin.app

import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState

fun main() = application {
    Window(
        onCloseRequest = ::exitApplication,
        title = "아카엘 (aka eL)",
        icon = painterResource("akael_icon.png"),
        state = rememberWindowState(width = 1100.dp, height = 800.dp),
    ) {
        App()
    }
}
