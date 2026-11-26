package world.looin.app.debug

import androidx.compose.ui.ImageComposeScene
import androidx.compose.ui.unit.Density
import org.jetbrains.skia.EncodedImageFormat
import world.looin.app.App
import world.looin.app.AppController
import world.looin.app.AppSettings
import world.looin.app.Route
import world.looin.app.Tab
import java.io.File

/**
 * 개발용: 실제 앱을 서버에 붙여 화면을 차례로 열고 이미지로 저장한다.
 * 사용: ./gradlew :composeApp:tour -Ptour="서버주소 토큰 출력폴더 [이동할 공간id/글id...]"
 */
fun main(args: Array<String>) {
    val (url, token, outDir) = args
    val out = File(outDir).apply { mkdirs() }
    AppSettings.set(AppController.KEY_URL, url)
    AppSettings.set(AppController.KEY_TOKEN, token)
    var c: AppController? = null
    val scene = ImageComposeScene(820, 1720, Density(2f)) { App(controllerOut = { c = it }) }
    fun pump(ms: Long) {
        val end = System.currentTimeMillis() + ms
        while (System.currentTimeMillis() < end) { scene.render(System.nanoTime()); Thread.sleep(25) }
    }
    fun shot(name: String) = File(out, "$name.png").writeBytes(scene.render(System.nanoTime()).encodeToData(EncodedImageFormat.PNG)!!.bytes)

    scene.render(System.nanoTime()); shot("0_splash")
    pump(4000); shot("1_home")
    val ctl = c!!
    // 새 알림 배너 (앱을 보는 중 새 댓글이 왔을 때)
    ctl.notices?.items?.firstOrNull()?.let { ctl.banner = it; pump(900); shot("1b_banner"); ctl.banner = null; pump(600) }
    ctl.push(Route.Notifications); pump(2000); shot("2_notifications"); ctl.pop(); pump(600)
    val spaces = ctl.overview!!.spaces
    ctl.push(Route.SpaceRoute(spaces.first { it.style == "REDDIT" })); pump(3000); shot("3_reddit_all")
    args.getOrNull(3)?.let { ctl.push(Route.PostRoute(it, "REDDIT")); pump(2500); shot("4_reddit_post"); ctl.pop() }
    ctl.pop(); pump(600)
    val dc = spaces.first { it.style == "DC" }
    ctl.push(Route.SpaceRoute(dc)); pump(2500); shot("5_dc_galleries")
    val boards = kotlinx.coroutines.runBlocking { ctl.api!!.boards(dc.id) }
    ctl.push(Route.BoardRoute(dc, boards[1])); pump(2500); shot("6_dc_board")
    args.getOrNull(4)?.let { ctl.push(Route.PostRoute(it, "DC")); pump(2500); shot("7_dc_post") }
    scene.close()
    println("saved to ${out.absolutePath}")
    kotlin.system.exitProcess(0)
}
