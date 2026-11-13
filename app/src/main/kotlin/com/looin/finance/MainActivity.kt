package com.looin.finance

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Savings
import androidx.compose.material.icons.filled.AccountBalanceWallet
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
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
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
import com.looin.finance.ui.MainViewModel
import com.looin.finance.ui.UiState
import com.looin.finance.ui.analysis.AnalysisScreen
import com.looin.finance.ui.assets.AccountDetailScreen
import com.looin.finance.ui.assets.AccountEditScreen
import com.looin.finance.ui.assets.AssetsScreen
import com.looin.finance.ui.calendar.CalendarScreen
import com.looin.finance.ui.components.GUTTER
import com.looin.finance.ui.home.HomeScreen
import com.looin.finance.ui.plan.PlanScreen
import com.looin.finance.ui.plan.RecurringEditScreen
import com.looin.finance.ui.settings.SettingsScreen
import com.looin.finance.ui.settings.CategoryScreen
import com.looin.finance.ui.search.SearchScreen
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinTheme
import com.looin.finance.ui.theme.LooinType
import com.looin.finance.ui.theme.ThemePrefs
import com.looin.finance.ui.tx.TransactionActionSheet
import com.looin.finance.ui.tx.TransactionEditScreen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.datetime.LocalDate

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ThemePrefs.load(this)
        val repo = (application as LooinApp).repository
        setContent {
            LooinTheme {
                val dark = Looin.colors.isDark
                LaunchedEffect(dark) {
                    val style = if (dark) SystemBarStyle.dark(android.graphics.Color.TRANSPARENT)
                    else SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT)
                    enableEdgeToEdge(style, style)
                }
                val vm: MainViewModel = viewModel(factory = viewModelFactory { initializer { MainViewModel(repo) } })
                LooinRoot(vm)
            }
        }
    }
}

private enum class Tab(val route: String, val label: String, val icon: ImageVector, val selectedIcon: ImageVector) {
    HOME("home", "홈", Icons.Outlined.Home, Icons.Filled.Home),
    CALENDAR("calendar", "캘린더", Icons.Outlined.CalendarMonth, Icons.Filled.CalendarMonth),
    PLAN("plan", "돈 관리", Icons.Outlined.Savings, Icons.Filled.Savings),
    ASSETS("assets", "자산", Icons.Outlined.AccountBalanceWallet, Icons.Filled.AccountBalanceWallet),
    ANALYSIS("analysis", "분석", Icons.Outlined.BarChart, Icons.Filled.BarChart),
}

/** 거래 편집 경로. 날짜는 epoch day 로 전달. */
private fun txRoute(
    id: Long? = null, date: LocalDate? = null, type: TransactionType? = null,
    status: TransactionStatus? = null, account: Long? = null, copy: Long? = null,
) = "tx?id=${id ?: -1}&date=${date?.toEpochDays() ?: Int.MIN_VALUE}&type=${type?.name ?: ""}&status=${status?.name ?: ""}" +
    "&account=${account ?: -1}&copy=${copy ?: -1}"

@Composable
private fun LooinRoot(vm: MainViewModel) {
    val c = Looin.colors
    val state by vm.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    // 새 메시지가 오면 이전 메시지를 바로 닫아 오래된 안내가 쌓이지 않게 한다.
    LaunchedEffect(Unit) { vm.messages.collectLatest { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(it) } }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.refreshToday() }

    val backStack by nav.currentBackStackEntryAsState()
    val tab = Tab.entries.firstOrNull { it.route == backStack?.destination?.route }
    var sheetTx by remember { mutableStateOf<Transaction?>(null) }

    Scaffold(
        containerColor = c.bg,
        snackbarHost = {
            // 편집 화면에서는 하단 저장 버튼을 가리지 않도록 스낵바를 위로 올린다.
            SnackbarHost(snackbar, Modifier.padding(bottom = if (tab == null) 84.dp else 0.dp)) {
                Snackbar(it, containerColor = c.surfaceStrong, contentColor = c.text, shape = CircleShape)
            }
        },
        topBar = {
            if (tab != null) Row(
                Modifier.fillMaxWidth().statusBarsPadding().height(56.dp).padding(start = GUTTER, end = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(if (tab == Tab.HOME) "루인 가계부" else tab.label, style = LooinType.monthTitle, color = c.text, modifier = Modifier.weight(1f))
                Box(Modifier.size(44.dp).clip(CircleShape).clickable { nav.navigate("search") }.semantics { contentDescription = "거래 검색" },
                    contentAlignment = Alignment.Center) { Icon(Icons.Filled.Search, null, tint = c.text) }
                Box(Modifier.size(44.dp).clip(CircleShape).clickable { nav.navigate("settings") }.semantics { contentDescription = "설정" },
                    contentAlignment = Alignment.Center) { Icon(Icons.Filled.Menu, null, tint = c.text) }
            }
        },
        bottomBar = { if (tab != null) BottomNav(tab) { t -> nav.navigate(t.route) { popUpTo(Tab.HOME.route) { saveState = true }; launchSingleTop = true; restoreState = true } } },
        floatingActionButton = {
            if (tab == Tab.HOME || tab == Tab.CALENDAR) Box(
                Modifier.size(56.dp).clip(CircleShape).background(c.selectedBg).clickable { nav.navigate(txRoute()) }
                    .semantics { contentDescription = "거래 추가" },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, null, tint = c.onSelected, modifier = Modifier.size(28.dp)) }
        },
    ) { padding ->
        AppNavHost(nav, state, vm, padding) { sheetTx = it }
    }

    sheetTx?.let { tx ->
        // 데이터가 바뀌면(완료·취소 후) 최신 거래로 보여 준다.
        val live = state.data.transactions.firstOrNull { it.id == tx.id }
        if (live == null) sheetTx = null
        else TransactionActionSheet(live, state.data, state.today, vm, onDismiss = { sheetTx = null },
            onEdit = { nav.navigate(txRoute(id = it.id)) }, onCopy = { nav.navigate(txRoute(copy = it.id)) },
            onOpenRule = { nav.navigate("rule?id=$it") })
    }
}

/** 하단 탭: 높이 64, 선택 = text, 비선택 = icon-inactive. 표시 막대 없이 아이콘 채움으로 구분(투두메이트). */
@Composable
private fun BottomNav(current: Tab, onSelect: (Tab) -> Unit) {
    val c = Looin.colors
    Row(Modifier.fillMaxWidth().background(c.bg).navigationBarsPadding().height(64.dp), verticalAlignment = Alignment.CenterVertically) {
        Tab.entries.forEach { t ->
            val sel = t == current
            Column(
                Modifier.weight(1f).height(64.dp).clickable { onSelect(t) }.semantics { contentDescription = t.label },
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
            ) {
                Icon(if (sel) t.selectedIcon else t.icon, null, tint = if (sel) c.text else c.iconInactive, modifier = Modifier.size(26.dp))
                Spacer(Modifier.height(2.dp))
                Text(t.label, style = LooinType.tiny, color = if (sel) c.text else c.iconInactive)
            }
        }
    }
}

@Composable
private fun AppNavHost(nav: NavHostController, state: UiState, vm: MainViewModel, padding: PaddingValues, openSheet: (Transaction) -> Unit) {
    NavHost(nav, startDestination = Tab.HOME.route) {
        composable(Tab.HOME.route) {
            HomeScreen(state, vm, padding, openSheet,
                onAddTx = { d, t, planned -> nav.navigate(txRoute(date = d, type = t, status = if (planned) TransactionStatus.PLANNED else null)) },
                onAddAccount = { nav.navigate("accountEdit") }, onOpenPlan = { nav.navigate(Tab.PLAN.route) },
                onOpenCalendar = { nav.navigate(Tab.CALENDAR.route) { popUpTo(Tab.HOME.route) { saveState = true }; launchSingleTop = true } })
        }
        composable(Tab.CALENDAR.route) { CalendarScreen(state, vm, padding, openSheet, onAddTx = { nav.navigate(txRoute(date = it)) }) }
        composable(Tab.PLAN.route) {
            PlanScreen(state, vm, padding, openSheet,
                onAddPlanned = { nav.navigate(txRoute(date = it, type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED)) },
                onOpenRule = { nav.navigate("rule?id=${it ?: -1}") })
        }
        composable(Tab.ASSETS.route) {
            AssetsScreen(state, padding, onOpenAccount = { nav.navigate("account/$it") }, onAddAccount = { nav.navigate("accountEdit") })
        }
        composable(Tab.ANALYSIS.route) { AnalysisScreen(state, padding) }
        composable("rule?id={id}", arguments = listOf(navArgument("id") { type = NavType.LongType; defaultValue = -1L })) { entry ->
            RecurringEditScreen(state, vm, entry.arguments!!.getLong("id").takeIf { it > 0 }, onClose = { nav.popBackStack() })
        }
        composable("settings") { SettingsScreen(state, vm, onBack = { nav.popBackStack() }, onOpenCategories = { nav.navigate("categories") }) }
        composable("categories") { CategoryScreen(state, vm, onBack = { nav.popBackStack() }) }
        composable("search") { SearchScreen(state, onBack = { nav.popBackStack() }, onOpenTx = openSheet) }
        composable(
            "tx?id={id}&date={date}&type={type}&status={status}&account={account}&copy={copy}",
            arguments = listOf(
                navArgument("id") { type = NavType.LongType; defaultValue = -1L },
                navArgument("date") { type = NavType.IntType; defaultValue = Int.MIN_VALUE },
                navArgument("type") { type = NavType.StringType; defaultValue = "" },
                navArgument("status") { type = NavType.StringType; defaultValue = "" },
                navArgument("account") { type = NavType.LongType; defaultValue = -1L },
                navArgument("copy") { type = NavType.LongType; defaultValue = -1L },
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
                copyFromId = a.getLong("copy").takeIf { it > 0 },
            )
        }
        composable("account/{id}", arguments = listOf(navArgument("id") { type = NavType.LongType })) { entry ->
            val id = entry.arguments!!.getLong("id")
            AccountDetailScreen(state, vm, id, onBack = { nav.popBackStack() }, onEdit = { nav.navigate("accountEdit?id=$id") },
                onOpenTx = openSheet, onAddTx = { nav.navigate(txRoute(type = it, account = id)) })
        }
        composable("accountEdit?id={id}", arguments = listOf(navArgument("id") { type = NavType.LongType; defaultValue = -1L })) { entry ->
            AccountEditScreen(state, vm, entry.arguments!!.getLong("id").takeIf { it > 0 }, onDone = { nav.popBackStack() })
        }
    }
}
