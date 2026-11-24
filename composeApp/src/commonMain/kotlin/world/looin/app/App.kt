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
import world.looin.app.ui.PostScreen
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

        if (c.api == null || c.overview == null) {
            Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { pad ->
                Box(Modifier.padding(pad)) { ConnectScreen(c) }
            }
            return@LooinTheme
        }

        val top = c.stack.lastOrNull()
        Scaffold(
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                if (top == null) NavigationBar {
                    Tab.entries.forEach { t ->
                        NavigationBarItem(
                            selected = c.tab == t,
                            onClick = { c.tab = t; if (t == Tab.Home) c.refresh() },
                            icon = { Text(t.icon) },
                            label = { Text(t.label) },
                        )
                    }
                }
            },
        ) { pad ->
            Box(Modifier.fillMaxSize().padding(pad)) {
                when (top) {
                    is Route.Chat -> ChatScreen(c, top)
                    is Route.SpaceRoute -> SpaceScreen(c, top.space)
                    is Route.PostRoute -> PostScreen(c, top.postId)
                    Route.NewAgent -> NewAgentScreen(c)
                    null -> when (c.tab) {
                        Tab.Home -> HomeScreen(c)
                        Tab.Chat -> ChatHubScreen(c)
                        Tab.World -> WorldScreen(c)
                        Tab.Me -> MeScreen(c)
                    }
                }
            }
        }
    }
}
