package world.looin.app.debug

import androidx.compose.ui.ImageComposeScene
import androidx.compose.ui.unit.Density
import androidx.compose.ui.use
import org.jetbrains.skia.EncodedImageFormat
import world.looin.app.ui.ChatShowcase
import world.looin.app.ui.LooinTheme
import java.io.File

/** 채팅 화면을 이미지로 그려 확인한다: ./gradlew :composeApp:run 대신 이 main 을 실행 */
fun main(args: Array<String>) {
    val out = File(args.firstOrNull() ?: "build/showcase").apply { mkdirs() }
    for (dark in listOf(false, true)) {
        ImageComposeScene(820, 1760, Density(2f)) { LooinTheme(dark = dark) { ChatShowcase() } }.use { scene ->
            repeat(3) { scene.render(it * 300_000_000L) }
            val img = scene.render(1_000_000_000L)
            File(out, if (dark) "chat_dark.png" else "chat_light.png").writeBytes(img.encodeToData(EncodedImageFormat.PNG)!!.bytes)
        }
    }
    // 애니메이션: 30fps 로 4.5초
    val frames = File(out, "frames").apply { deleteRecursively(); mkdirs() }
    ImageComposeScene(820, 900, Density(2f)) { LooinTheme(dark = true) { world.looin.app.ui.StreamShowcase() } }.use { scene ->
        for (i in 0 until 135) {
            val img = scene.render(i * 33_333_333L)
            File(frames, "f%03d.png".format(i)).writeBytes(img.encodeToData(EncodedImageFormat.PNG)!!.bytes)
        }
    }
    println("saved to ${out.absolutePath}")
}
