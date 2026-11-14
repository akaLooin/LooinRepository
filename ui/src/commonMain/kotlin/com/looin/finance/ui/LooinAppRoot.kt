package com.looin.finance.ui

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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.savedstate.read
import androidx.navigation.NavType
import androidx.navigation.NavGraphBuilder
import androidx.navigation.NamedNavArgument
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.looin.finance.core.model.Transaction
import com.looin.finance.core.model.TransactionStatus
import com.looin.finance.core.model.TransactionType
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
import com.looin.finance.ui.security.AppLock
import com.looin.finance.ui.security.LockScreen
import com.looin.finance.ui.security.PinFlow
import com.looin.finance.ui.security.PinSetupScreen
import com.looin.finance.ui.theme.Looin
import com.looin.finance.ui.theme.LooinType
import com.looin.finance.ui.tx.TransactionActionSheet
import com.looin.finance.ui.tx.TransactionEditScreen
import kotlinx.coroutines.flow.collectLatest
import kotlinx.datetime.LocalDate

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

/**
 * 앱 전체 화면(하단 탭 + 화면 이동 + 거래 메뉴 시트). Android·PC 가 같은 코드를 쓴다.
 * 테마([com.looin.finance.ui.theme.LooinTheme])와 플랫폼 구현([com.looin.finance.ui.platform])은 각 진입점이 감싸서 넣는다.
 */
@Composable
fun LooinAppRoot(vm: MainViewModel) {
    val c = Looin.colors
    val state by vm.state.collectAsStateWithLifecycle()
    val nav = rememberNavController()
    val snackbar = remember { SnackbarHostState() }
    // 새 메시지가 오면 이전 메시지를 바로 닫아 오래된 안내가 쌓이지 않게 한다.
    LaunchedEffect(Unit) { vm.messages.collectLatest { snackbar.currentSnackbarData?.dismiss(); snackbar.showSnackbar(it) } }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { vm.refreshToday() }
    // 앱 잠금: 백그라운드에 오래 있다 돌아오면 잠근다
    LifecycleEventEffect(Lifecycle.Event.ON_STOP) { AppLock.onBackground(kotlin.time.Clock.System.now().toEpochMilliseconds()) }
    LifecycleEventEffect(Lifecycle.Event.ON_START) { AppLock.onForeground(kotlin.time.Clock.System.now().toEpochMilliseconds()) }

    val backStack by nav.currentBackStackEntryAsState()
    val tab = Tab.entries.firstOrNull { it.route == backStack?.destination?.route }
    var sheetTx by remember { mutableStateOf<Transaction?>(null) }
    // 캘린더에서 고른 날짜. + 버튼이 이 날짜로 새 거래를 연다(없으면 오늘).
    var calendarDay by rememberSaveable { mutableStateOf<Long?>(null) }

    Scaffold(
        containerColor = c.bg,
        snackbarHost = {
            // 편집 화면에서는 하단 저장 버튼을 가리지 않도록 스낵바를 위로 올린다.
            SnackbarHost(snackbar, Modifier.padding(bottom = if (tab == null) 84.dp else 0.dp)) { data ->
                // 옆으로 밀면 밀리면서 사라진다(양방향).
                val dismissState = rememberSwipeToDismissBoxState()
                LaunchedEffect(dismissState.currentValue) {
                    if (dismissState.currentValue != SwipeToDismissBoxValue.Settled) data.dismiss()
                }
                SwipeToDismissBox(dismissState, backgroundContent = {}, modifier = Modifier.semantics { contentDescription = "알림, 옆으로 밀어 닫기" }) {
                    Snackbar(data, containerColor = c.toastBg, contentColor = c.onToast, shape = RoundedCornerShape(14.dp))
                }
            }
        },
        topBar = {
            if (tab != null) Row(
                Modifier.fillMaxWidth().background(c.bg).statusBarsPadding().height(56.dp).padding(start = GUTTER, end = 8.dp),
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
                Modifier.size(56.dp).clip(RoundedCornerShape(18.dp)).background(c.primary).clickable {
                    val day = if (tab == Tab.CALENDAR) calendarDay?.let { LocalDate.fromEpochDays(it) } else null
                    nav.navigate(txRoute(date = day))
                }
                    .semantics { contentDescription = "거래 추가" },
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Filled.Add, null, tint = c.onPrimary, modifier = Modifier.size(28.dp)) }
        },
    ) { padding ->
        AppNavHost(nav, state, vm, padding, calendarDay ?: state.today.toEpochDays(), { calendarDay = it }) { sheetTx = it }
    }

    if (AppLock.locked) LockScreen()

    sheetTx?.let { tx ->
        // 데이터가 바뀌면(완료·취소 후) 최신 거래로 보여 준다.
        val live = state.data.transactions.firstOrNull { it.id == tx.id }
        if (live == null) sheetTx = null
        else TransactionActionSheet(live, state.data, state.today, vm, onDismiss = { sheetTx = null },
            onEdit = { nav.navigate(txRoute(id = it.id)) }, onCopy = { nav.navigate(txRoute(copy = it.id)) },
            onOpenRule = { nav.navigate("rule?id=$it") })
    }
}

/** 하단 탭: 카드 바탕 + 위 구분선. 선택한 탭은 아이콘 뒤에 주 색을 옅게 깐 알약으로 표시. */
@Composable
private fun BottomNav(current: Tab, onSelect: (Tab) -> Unit) {
    val c = Looin.colors
    Column(Modifier.fillMaxWidth().background(c.card)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(c.cardBorder))
        Row(Modifier.fillMaxWidth().navigationBarsPadding().height(66.dp), verticalAlignment = Alignment.CenterVertically) {
            Tab.entries.forEach { t ->
                val sel = t == current
                Column(
                    Modifier.weight(1f).height(66.dp).clickable { onSelect(t) }.semantics { contentDescription = t.label },
                    horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = androidx.compose.foundation.layout.Arrangement.Center,
                ) {
                    Box(Modifier.size(52.dp, 30.dp).clip(RoundedCornerShape(15.dp)).background(if (sel) c.primarySoft else Color.Transparent),
                        contentAlignment = Alignment.Center) {
                        Icon(if (sel) t.selectedIcon else t.icon, null, tint = if (sel) c.primary else c.iconInactive, modifier = Modifier.size(22.dp))
                    }
                    Spacer(Modifier.height(3.dp))
                    Text(t.label, style = LooinType.tiny, color = if (sel) c.primary else c.iconInactive)
                }
            }
        }
    }
}

@Composable
private fun AppNavHost(
    nav: NavHostController, state: UiState, vm: MainViewModel, padding: PaddingValues,
    calendarDay: Long, onCalendarDay: (Long) -> Unit, openSheet: (Transaction) -> Unit,
) {
    // 화면 전환은 애니메이션 없이 즉시 바꾼다(사용자 요청: 페이드 없이). 탭 이동·화면 열기·뒤로 가기 모두.
    NavHost(
        nav, startDestination = Tab.HOME.route,
        enterTransition = { EnterTransition.None },
        exitTransition = { ExitTransition.None },
        popEnterTransition = { EnterTransition.None },
        popExitTransition = { ExitTransition.None },
    ) {
        page(Tab.HOME.route) {
            HomeScreen(state, vm, padding, openSheet,
                onAddTx = { d, t, planned -> nav.navigate(txRoute(date = d, type = t, status = if (planned) TransactionStatus.PLANNED else null)) },
                onAddAccount = { nav.navigate("accountEdit") }, onOpenPlan = { nav.navigate(Tab.PLAN.route) },
                onOpenCalendar = { nav.navigate(Tab.CALENDAR.route) { popUpTo(Tab.HOME.route) { saveState = true }; launchSingleTop = true } })
        }
        page(Tab.CALENDAR.route) {
            CalendarScreen(state, vm, padding, openSheet, onAddTx = { nav.navigate(txRoute(date = it)) }, selectedDays = calendarDay, onSelectDays = onCalendarDay)
        }
        page(Tab.PLAN.route) {
            PlanScreen(state, vm, padding, openSheet,
                onAddPlanned = { nav.navigate(txRoute(date = it, type = TransactionType.EXPENSE, status = TransactionStatus.PLANNED)) },
                onOpenRule = { nav.navigate("rule?id=${it ?: -1}") })
        }
        page(Tab.ASSETS.route) {
            AssetsScreen(state, padding, onOpenAccount = { nav.navigate("account/$it") }, onAddAccount = { nav.navigate("accountEdit") })
        }
        page(Tab.ANALYSIS.route) { AnalysisScreen(state, padding) }
        page("rule?id={id}", arguments = listOf(navArgument("id") { type = NavType.LongType; defaultValue = -1L })) { entry ->
            RecurringEditScreen(state, vm, entry.argLong("id").takeIf { it > 0 }, onClose = { nav.popBackStack() })
        }
        page("settings") {
            SettingsScreen(state, vm, onBack = { nav.popBackStack() }, onOpenCategories = { nav.navigate("categories") },
                onOpenCsvImport = { nav.navigate("csvImport") { launchSingleTop = true } },
                onOpenPin = { nav.navigate("pin/${it.name}") { launchSingleTop = true } })
        }
        page("pin/{flow}", arguments = listOf(navArgument("flow") { type = NavType.StringType })) { entry ->
            val flow = PinFlow.valueOf(entry.argString("flow") ?: PinFlow.SET.name)
            PinSetupScreen(flow, onDone = { msg -> vm.say(msg); nav.popBackStack() }, onBack = { nav.popBackStack() })
        }
        page("csvImport") { com.looin.finance.ui.settings.CsvImportScreen(state, vm, onClose = { nav.popBackStack() }) }
        page("categories") { CategoryScreen(state, vm, onBack = { nav.popBackStack() }) }
        page("search") { SearchScreen(state, onBack = { nav.popBackStack() }, onOpenTx = openSheet) }
        page(
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
            val a = entry
            TransactionEditScreen(
                state, vm,
                txId = a.argLong("id").takeIf { it > 0 },
                initialDate = a.argInt("date").takeIf { it != Int.MIN_VALUE }?.let { LocalDate.fromEpochDays(it) },
                initialType = a.argString("type")?.takeIf { it.isNotEmpty() }?.let { TransactionType.valueOf(it) },
                initialStatus = a.argString("status")?.takeIf { it.isNotEmpty() }?.let { TransactionStatus.valueOf(it) },
                initialAccountId = a.argLong("account").takeIf { it > 0 },
                onClose = { nav.popBackStack() },
                copyFromId = a.argLong("copy").takeIf { it > 0 },
            )
        }
        page("account/{id}", arguments = listOf(navArgument("id") { type = NavType.LongType })) { entry ->
            val id = entry.argLong("id")
            AccountDetailScreen(state, vm, id, onBack = { nav.popBackStack() }, onEdit = { nav.navigate("accountEdit?id=$id") },
                onOpenTx = openSheet, onAddTx = { nav.navigate(txRoute(type = it, account = id)) })
        }
        page("accountEdit?id={id}", arguments = listOf(navArgument("id") { type = NavType.LongType; defaultValue = -1L })) { entry ->
            AccountEditScreen(state, vm, entry.argLong("id").takeIf { it > 0 }, onDone = { nav.popBackStack() })
        }
    }
}

/**
 * 화면 하나. 배경을 불투명하게 칠해, 전환 순간 이전 화면이 한 프레임이라도 비쳐 보이는 잔상을 막는다.
 * (전환 애니메이션은 모두 없음)
 */
private fun NavGraphBuilder.page(
    route: String,
    arguments: List<NamedNavArgument> = emptyList(),
    content: @Composable (NavBackStackEntry) -> Unit,
) = composable(
    route, arguments,
    enterTransition = { EnterTransition.None }, exitTransition = { ExitTransition.None },
    popEnterTransition = { EnterTransition.None }, popExitTransition = { ExitTransition.None },
) { entry ->
    Box(Modifier.fillMaxSize().background(Looin.colors.bg)) { content(entry) }
}

// 화면 이동 인자 읽기 (Android·PC 공용 SavedState API). 없으면 기본값.
private fun NavBackStackEntry.argLong(key: String): Long = arguments?.read { if (contains(key)) getLong(key) else -1L } ?: -1L
private fun NavBackStackEntry.argInt(key: String): Int = arguments?.read { if (contains(key)) getInt(key) else Int.MIN_VALUE } ?: Int.MIN_VALUE
private fun NavBackStackEntry.argString(key: String): String? = arguments?.read { if (contains(key)) getString(key) else null }
