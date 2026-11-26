package world.looin.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import world.looin.app.ui.ChatHubScreen
import world.looin.app.ui.ChatScreen
import world.looin.app.ui.ConnectScreen
import world.looin.app.ui.HomeScreen
import world.looin.app.ui.LooinTheme
import world.looin.app.ui.MeScreen
import world.looin.app.ui.NewAgentScreen
import world.looin.app.ui.SpaceScreen
import world.looin.app.ui.WorldScreen

@Composable
fun App(onBackAvailable: (Boolean) -> Unit = {}, controllerOut: (AppController) -> Unit = {}) {
    LooinTheme {
        val scope = rememberCoroutineScope()
        val c = remember { AppController(scope) }
        controllerOut(c)
        val snackbar = remember { SnackbarHostState() }

        LaunchedEffect(c.error) {
            c.error?.let { snackbar.showSnackbar(it); c.error = null }
        }
        LaunchedEffect(c.stack.size) { onBackAvailable(c.stack.isNotEmpty()) }

        // 앱을 보는 동안 1분마다 새 알림 확인 → 새 댓글이 오면 위에서 배너가 내려온다
        LaunchedEffect(c.api) {
            while (c.api != null) { kotlinx.coroutines.delay(60_000); c.refreshNotices() }
        }
        LaunchedEffect(c.banner) { if (c.banner != null) { kotlinx.coroutines.delay(7_000); c.banner = null } }
        LaunchedEffect(c.openNoticesRequested, c.overview) {
            if (c.openNoticesRequested && c.overview != null) { c.openNoticesRequested = false; c.push(Route.Notifications) }
        }

        // 알림으로 들어왔으면 소식함 대화로 바로
        LaunchedEffect(c.openInboxRequested, c.overview, c.inbox) {
            val conv = c.inbox?.conversationId
            val core = c.core
            if (c.openInboxRequested && conv != null && core != null) {
                c.openInboxRequested = false
                c.push(Route.Chat(core, conv))
            }
        }

        if (c.api == null || c.overview == null) {
            Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { pad ->
                Box(Modifier.padding(pad)) {
                    androidx.compose.animation.Crossfade(targetState = c.restoring) { restoring ->
                        if (restoring) world.looin.app.ui.SplashScreen() else ConnectScreen(c)
                    }
                }
            }
            return@LooinTheme
        }

        val top = c.stack.lastOrNull()
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                androidx.compose.animation.AnimatedVisibility(
                    visible = top == null,
                    enter = androidx.compose.animation.slideInVertically { it } + androidx.compose.animation.fadeIn(),
                    exit = androidx.compose.animation.slideOutVertically { it } + androidx.compose.animation.fadeOut(),
                ) {
                    NavigationBar {
                        Tab.entries.forEach { t ->
                            NavigationBarItem(
                                selected = c.tab == t,
                                onClick = { c.tab = t; if (t == Tab.Home) c.refresh() },
                                icon = { Text(t.icon) },
                                label = { Text(t.label) },
                            )
                        }
                    }
                }
            },
        ) { pad ->
            Box(Modifier.fillMaxSize().padding(pad)) {
                // 화면이 바뀔 때 부드럽게 미끄러지며 겹쳐 바뀐다
                androidx.compose.animation.AnimatedContent(
                    targetState = top ?: c.tab,
                    transitionSpec = {
                        val forward = c.navForward
                        (androidx.compose.animation.fadeIn(androidx.compose.animation.core.tween(240)) +
                            androidx.compose.animation.slideInHorizontally(androidx.compose.animation.core.tween(280)) { if (forward) it / 8 else -it / 8 }) togetherWith
                            androidx.compose.animation.fadeOut(androidx.compose.animation.core.tween(180))
                    },
                ) { screen ->
                    when (screen) {
                        is Route.Chat -> ChatScreen(c, screen)
                        is Route.SpaceRoute -> SpaceScreen(c, screen.space)
                        is Route.PostRoute -> world.looin.app.ui.CommunityPostScreen(c, screen)
                        Route.CommunityHub -> world.looin.app.ui.CommunityHubScreen(c)
                        is Route.BoardRoute -> world.looin.app.ui.DcBoardScreen(c, screen.space, screen.board)
                        Route.Notifications -> world.looin.app.ui.NotificationsScreen(c)
                        Route.NewAgent -> NewAgentScreen(c)
                        Route.BrainSettings -> world.looin.app.ui.BrainSettingsScreen(c)
                        Tab.Home -> HomeScreen(c)
                        Tab.Chat -> ChatHubScreen(c)
                        Tab.World -> WorldScreen(c)
                        Tab.Me -> MeScreen(c)
                        else -> Unit
                    }
                }
                // 새 알림 배너
                androidx.compose.animation.AnimatedVisibility(
                    visible = c.banner != null,
                    enter = androidx.compose.animation.slideInVertically { -it } + androidx.compose.animation.fadeIn(),
                    exit = androidx.compose.animation.slideOutVertically { -it } + androidx.compose.animation.fadeOut(),
                    modifier = Modifier.align(androidx.compose.ui.Alignment.TopCenter),
                ) {
                    c.banner?.let { n -> world.looin.app.ui.NoticeBanner(n, onClick = { c.openNotice(n) }) }
                }
            }
        }
    }
}
