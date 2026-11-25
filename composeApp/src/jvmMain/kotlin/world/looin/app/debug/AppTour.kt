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
    ctl.tab = Tab.Chat; pump(2500); shot("2_chats")
    ctl.tab = Tab.Me; pump(2500); shot("3_me")
    ctl.tab = Tab.Home; pump(800)
    ctl.push(Route.CommunityHub); pump(1500); shot("4_community_hub")
    val spaces = ctl.overview!!.spaces
    ctl.push(Route.SpaceRoute(spaces.first { it.style == "REDDIT" })); pump(2500); shot("5_reddit")
    args.getOrNull(3)?.let { ctl.push(Route.PostRoute(it, "REDDIT")); pump(2500); shot("6_reddit_post"); ctl.pop() }
    ctl.pop(); pump(600)
    ctl.push(Route.SpaceRoute(spaces.first { it.style == "DC" })); pump(2500); shot("7_dc")
    args.getOrNull(4)?.let { ctl.push(Route.PostRoute(it, "DC")); pump(2500); shot("8_dc_post") }
    scene.close()
    println("saved to ${out.absolutePath}")
    kotlin.system.exitProcess(0)
}
