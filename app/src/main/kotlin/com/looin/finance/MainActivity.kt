package com.looin.finance

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.padding
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.analysis.AnalysisScreen
import com.looin.finance.ui.assets.AccountDetailScreen
import com.looin.finance.ui.assets.AccountEditScreen
import com.looin.finance.ui.assets.AssetsScreen
import com.looin.finance.ui.calendar.CalendarScreen
import com.looin.finance.ui.home.HomeScreen
import com.looin.finance.ui.plan.PlanScreen
import com.looin.finance.ui.settings.SettingsScreen
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.tx.TransactionEditScreen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.datetime.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = (application as LooinApp).repository
        setContent {
            LooinTheme {
                val vm: MainViewModel = viewModel(factory = viewModelFactory { initializer { MainViewModel(repo) } })
                LooinRoot(vm)
            }
        }
    }
}

private enum class Tab(val route: String, val label: String, val icon: ImageVector) {
    HOME("home", "홈", Icons.Outlined.Home),
    CALENDAR("calendar", "캘린더", Icons.Outlined.CalendarMonth),
    PLAN("plan", "돈 관리", Icons.Outlined.Savings),
    ASSETS("assets", "자산", Icons.Outlined.AccountBalanceWallet),
    ANALYSIS("analysis", "분석", Icons.Outlined.BarChart),
}

/** 거래 편집 경로. 날짜는 epoch day 로 전달. */
private fun txRoute(
    id: Long? = null, date: LocalDate? = null, type: TransactionType? = null,
    status: TransactionStatus? = null, account: Long? = null,
) = "tx?id=${id ?: -1}&date=${date?.toEpochDays() ?: Int.MIN_VALUE}&type=${type?.name ?: ""}&status=${status?.name ?: ""}&account=${account ?: -1}"

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun LooinRoot(vm: MainViewModel) {
    val state by vm.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    // 새 메시지가 오면 이전 메시지를 바로 닫아 오래된 안내가 쌓이지 않게 한다.
    LaunchedEffect(Unit) { vm.messages.collectLatest { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(it) } }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.refreshToday() }

    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val tab = Tab.entries.firstOrNull { it.route == route }

    Scaffold(
        // 편집 화면에서는 하단 저장 버튼을 가리지 않도록 스낵바를 위로 올린다.
        snackbarHost = {
            SnackbarHost(snackbar, Modifier.padding(bottom = if (tab == null) 84.dp else 0.dp))
        },
        topBar = {
            if (tab != null) TopAppBar(
                title = { Text(if (tab == Tab.HOME) "루인 가계부" else tab.label) },
                actions = { IconButton(onClick = { nav.navigate("settings") }) { Icon(Icons.Outlined.Settings, "설정") } },
            )
        },
        bottomBar = {
            if (tab != null) NavigationBar {
                Tab.entries.forEach { t ->
                    NavigationBarItem(
                        selected = t == tab,
                        onClick = {
                            nav.navigate(t.route) {
                                popUpTo(Tab.HOME.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = { Icon(t.icon, null) },
                        label = { Text(t.label) },
                    )
                }
            }
        },
        floatingActionButton = {
            if (tab == Tab.HOME || tab == Tab.CALENDAR) FloatingActionButton(onClick = { nav.navigate(txRoute()) }) {
                Icon(Icons.Filled.Add, "거래 추가")
            }
        },
    ) { padding ->
        AppNavHost(nav, state, vm, padding)
    }
}

@Composable
private fun AppNavHost(nav: NavHostController, state: UiState, vm: MainViewModel, padding: androidx.compose.foundation.layout.PaddingValues) {
    val openTx: (Long) -> Unit = { nav.navigate(txRoute(id = it)) }
    NavHost(nav, startDestination = Tab.HOME.route) {
        composable(Tab.HOME.route) {
            HomeScreen(state, vm, padding, openTx, onAddAccount = { nav.navigate("accountEdit") }, onOpenPlan = { nav.navigate(Tab.PLAN.route) })
        }
        composable(Tab.CALENDAR.route) {
            CalendarScreen(state, vm, padding, openTx, onAddTx = { nav.navigate(txRoute(date = it)) })
        }
        composable(Tab.PLAN.route) {
            PlanScreen(state, vm, padding, openTx,
                onAddPlanned = { nav.navigate(txRoute(date = it, type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED)) })
        }
        composable(Tab.ASSETS.route) {
            AssetsScreen(state, padding, onOpenAccount = { nav.navigate("account/$it") }, onAddAccount = { nav.navigate("accountEdit") })
        }
        composable(Tab.ANALYSIS.route) { AnalysisScreen(state, padding) }
        composable("settings") { SettingsScreen(state, vm, onBack = { nav.popBackStack() }) }
        composable(
            "tx?id={id}&date={date}&type={type}&status={status}&account={account}",
            arguments = listOf(
                navArgument("id") { type = NavType.LongType; defaultValue = -1L },
                navArgument("date") { type = NavType.IntType; defaultValue = Int.MIN_VALUE },
                navArgument("type") { type = NavType.StringType; defaultValue = "" },
                navArgument("status") { type = NavType.StringType; defaultValue = "" },
                navArgument("account") { type = NavType.LongType; defaultValue = -1L },
            ),
        ) { entry ->
            val a = entry.arguments!!
            TransactionEditScreen(
                state, vm,
                txId = a.getLong("id").takeIf { it > 0 },
                initialDate = a.getInt("date").takeIf { it != Int.MIN_VALUE }?.let { LocalDate.fromEpochDays(it) },
                initialType = a.getString("type")?.takeIf { it.isNotEmpty() }?.let { TransactionType.valueOf(it) },
                initialStatus = a.getString("status")?.takeIf { it.isNotEmpty() }?.let { TransactionStatus.valueOf(it) },
                initialAccountId = a.getLong("account").takeIf { it > 0 },
                onClose = { nav.popBackStack() },
            )
        }
        composable("account/{id}", arguments = listOf(navArgument("id") { type = NavType.LongType })) { entry ->
            val id = entry.arguments!!.getLong("id")
            AccountDetailScreen(
                state, vm, id,
                onBack = { nav.popBackStack() },
                onEdit = { nav.navigate("accountEdit?id=$id") },
                onOpenTx = openTx,
                onAddTx = { nav.navigate(txRoute(type = it, account = id)) },
            )
        }
        composable("accountEdit?id={id}", arguments = listOf(navArgument("id") { type = NavType.LongType; defaultValue = -1L })) { entry ->
            AccountEditScreen(state, vm, entry.arguments!!.getLong("id").takeIf { it > 0 }, onDone = { nav.popBackStack() })
        }
    }
}
