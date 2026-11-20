# Graph Report - LooinRepository  (2026-11-20)

## Corpus Check
- 211 files · ~133,583 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 36 file(s) not represented in the graph (top: .xml 17, (none) 4, .otf 4)

## Summary
- 2843 nodes · 7799 edges · 194 communities (110 shown, 84 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 310 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `27af25dd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- toEntity
- AssetsScreens.kt
- Receipts.kt
- .expense
- AnalysisScreen
- RecurringAndBackupTest.kt
- Transaction
- .actualBalance
- HomeScreen.kt
- WidgetTest.kt
- Components.kt
- LooinAppRoot.kt
- SettingsScreen.kt
- DesktopWideLayoutTest.kt
- env
- Budget
- .categories
- FileKind
- FinanceDao
- CardBillTest.kt
- base
- TransactionEntity
- CalendarScreen.kt
- imgdiff.py
- steps
- Reminders.kt
- .onCreate
- Theme.kt
- steps
- Phase 1 설계·구현 기록
- ThemePrefs
- InstantTransitionTest.kt
- Database.kt
- Csv.kt
- AppLock
- draw_icon.py
- .periodContaining
- localdate
- PressIndication.kt
- Main.kt
- AutoBackupTest.kt
- DatabaseBuilder.ios.kt
- reviews.py
- steps
- ReceiptStoreTest.kt
- CsvImportTest.kt
- dispatchers
- Fx
- ForeignUiTest.kt
- IosPlatform.kt
- Biometric.kt
- ReminderWorkerTest.kt
- DesktopWideLayoutTest
- LooinAppRoot
- CsvImportScreenTest.kt
- .plan
- TransactionQuery
- ReceiptParser
- ComposeView
- StoreScreenshotTest.kt
- contrast.py
- json
- replica-recon
- Fonts.ios.kt
- .suggest
- MainViewModel
- LockScreen
- ShortcutTest.kt
- AppFlowTest
- BudgetMergeTest
- MainViewModel.kt
- DesktopAppTest
- PHASE2_NOTES.md
- FinanceRepository.kt
- AutoBackup
- rememberAndroidAutoBackup
- LooinApp.kt
- PinHash.ios.kt
- MemoSuggestUiTest
- listing.py
- Recon map: {{app}} ({{platform}})
- 테스트 (219개 통과)
- CalendarGroupingTest.kt
- SmallLabel
- argparse
- replica-backend
- replica-build
- .parse
- GoalFormTest.kt
- replica-brand
- replica-deploy
- replica-entrepreneur
- replica-test
- IosBiometric.kt
- 단계
- LockScreens.kt
- SavingsGoalEntity
- replica-architect
- replica-design
- replica-diff
- replica-launch
- Phase 2-1: 반복 거래 · 백업/복원 · DB v2
- Phase 2-3: 저축 목표 · 예산 이월 규칙 확정 (2026-11-13)
- Architecture: {{your app}} (a rebuild of {{app}}'s core features)
- 페즈뱅크 개인정보처리방침
- Pen
- CardBilling
- .transfer
- AppIcons.kt
- Android 출시 절차
- release/README.md
- Deploy checklist: {{your app}}
- FinanceRepository.kt
- Google Play 스토어 등록정보 (초안)
- FinanceData
- CommonSmokeTest
- AvailableSplitUiTest.kt
- CalendarFilter
- RangeFilter
- StatusFilter
- PC 출시 (Windows 우선 → macOS)
- FinanceRepository
- Fx.kt
- ios_sim_screenshot.sh
- MainViewController
- ThemeMode
- BudgetKind
- CLAUDE.md
- AllocMode
- graphify-stop.sh
- bug-report.md
- test-plan.md
- Phase 3-12: 예산 제안 설정 · 매일 고정 비용 · 빠른 입력 아이콘 (2026-11-17)
- 테스트 (176개 통과)
- OffsetMapping
- SavingsGoal
- TypeFilter
- ReceiptScanTest.kt
- Platform.kt
- AppLockFlowTest.kt
- Phase 3-9: 외화 기록 정확도 · 실시간 환율 (2026-11-16)
- 테스트 (227개 통과)
- .dataSurvivesReopenOnDesktop
- SavingsAllocationEntity
- Phase 2-4: 즉시 화면 전환 · CSV 내보내기/가져오기 (2026-11-13)
- Phase 3-4: 탭 오류 수정 · 선택 칸 정리 · 지출 한도 (2026-11-15)
- .deleteCategory
- DesktopKeyValueStore
- Phase 3-1: PC 창에 맞춘 화면 (2026-11-14)

## God Nodes (most connected - your core abstractions)
1. `Transaction` - 164 edges
2. `Account` - 121 edges
3. `MainViewModel` - 97 edges
4. `FinanceRepository` - 85 edges
5. `TransactionType` - 64 edges
6. `SmallLabel()` - 60 edges
7. `Budget` - 60 edges
8. `FinanceDao` - 60 edges
9. `TransactionEditScreen()` - 54 edges
10. `TransactionStatus` - 54 edges

## Surprising Connections (you probably didn't know these)
- `캘린더에서 거래 추가: 제목에 날짜 (2026-11-18)` --references--> `CalendarAddAndToastTest`  [INFERRED]
  docs/PHASE2_NOTES.md → app/src/test/kotlin/com/looin/finance/ui/CalendarAddAndToastTest.kt
- `DB 스키마 v2` --references--> `MigrationTest`  [INFERRED]
  docs/PHASE2_NOTES.md → app/src/test/kotlin/com/looin/finance/data/MigrationTest.kt
- `화면 전환` --references--> `InstantTransitionTest`  [INFERRED]
  docs/PHASE2_NOTES.md → app/src/test/kotlin/com/looin/finance/ui/InstantTransitionTest.kt
- `테스트` --references--> `DesktopWideLayoutTest`  [INFERRED]
  docs/PHASE2_NOTES.md → desktopApp/src/test/kotlin/com/looin/finance/desktop/DesktopWideLayoutTest.kt
- `고친 오류: "홈"을 눌렀는데 돈 관리 탭이 열림` --references--> `TabNavigationTest`  [INFERRED]
  docs/PHASE2_NOTES.md → app/src/test/kotlin/com/looin/finance/ui/TabNavigationTest.kt

## Import Cycles
- None detected.

## Communities (194 total, 84 thin omitted)

### Community 0 - "toEntity"
Cohesion: 0.19
Nodes (5): FinanceSettings, FinanceException, FinanceRepository, toEntity(), toModel()

### Community 1 - "AssetsScreens.kt"
Cohesion: 0.05
Nodes (4): AccountAvatar(), icon(), short2(), stamp()

### Community 2 - "Receipts.kt"
Cohesion: 0.11
Nodes (3): ReceiptOcr, rememberAndroidReceiptScanner(), ReceiptScanner

### Community 4 - "AnalysisScreen"
Cohesion: 0.21
Nodes (7): CategoryChange, ForeignSpend, PeriodStats, PlanVsActual, SpendingPace, StatisticsCalculator, SpendingPaceTest

### Community 5 - "RecurringAndBackupTest.kt"
Cohesion: 0.09
Nodes (18): autopayCompletesOnDueDateAndSurvivesBackup(), backupRoundTrip(), CategoryRulesTest, corruptedBackupRejectedAndDataKept(), deletedOccurrenceIsNotRecreated(), deleteRuleAndArchiveGuard(), editingRuleReplacesOnlyFuturePlanned(), generatesUpToNextPeriodWithoutDuplicates() (+10 more)

### Community 6 - "Transaction"
Cohesion: 0.11
Nodes (10): BalanceForecast, Entry, QuickEntries, Shortfall, Transaction, CurrencyConversion, Result, FxTest (+2 more)

### Community 7 - ".actualBalance"
Cohesion: 0.13
Nodes (6): BalanceCalculator, Account, AccountFx, AccountRules, BalanceTest, ForeignSummary()

### Community 8 - "HomeScreen.kt"
Cohesion: 0.14
Nodes (22): Breakdown, BreakdownLine, AnalysisScreen(), AccountDetailScreen(), AssetsScreen(), AmountText(), BreakdownContent(), BreakdownSheet() (+14 more)

### Community 9 - "WidgetTest.kt"
Cohesion: 0.12
Nodes (8): LooinWidget, LooinWidgetReceiver, WidgetButton(), WidgetContent(), WidgetData, WidgetSummary, WidgetTest, AndroidKeyValueStore

### Community 10 - "Components.kt"
Cohesion: 0.07
Nodes (21): AddPill(), AddRowButton(), Card(), CoinMarker(), DateField(), korean(), LooinToggle(), MenuRow() (+13 more)

### Community 11 - "LooinAppRoot.kt"
Cohesion: 0.05
Nodes (4): argInt(), argLong(), argString(), page()

### Community 12 - "SettingsScreen.kt"
Cohesion: 0.12
Nodes (14): AdaptiveColumns(), ScreenHeader(), SmallLabel(), ToggleRow(), typeColor(), CategoryForm(), CategoryScreen(), CsvImportScreen() (+6 more)

### Community 14 - "env"
Cohesion: 0.06
Nodes (37): concurrency, cancel-in-progress, group, KEYSTORE_BASE64, LOOIN_KEY_ALIAS, LOOIN_KEY_PASSWORD, LOOIN_KEYSTORE_PASSWORD, LOOIN_KEYSTORE_PATH (+29 more)

### Community 15 - "Budget"
Cohesion: 0.09
Nodes (16): BudgetCalculator, BudgetLevel, OK, OVER, WARN, BudgetStatus, Summary, Budget (+8 more)

### Community 16 - ".categories"
Cohesion: 0.26
Nodes (5): RecentPicks, Side, FROM, TO, RecentPicksTest

### Community 17 - "FileKind"
Cohesion: 0.15
Nodes (8): saveText(), FileActions, FileKind, CSV, JSON, NoFileActions, decodeKoreanText(), DesktopFileActions

### Community 21 - "base"
Cohesion: 0.06
Nodes (32): ASSETCATALOG_COMPILER_APPICON_NAME, CURRENT_PROJECT_VERSION, ENABLE_USER_SCRIPT_SANDBOXING, FRAMEWORK_SEARCH_PATHS, INFOPLIST_FILE, MARKETING_VERSION, OTHER_LDFLAGS, PRODUCT_BUNDLE_IDENTIFIER (+24 more)

### Community 22 - "TransactionEntity"
Cohesion: 0.18
Nodes (6): AccountEntity, BudgetEntity, CategoryEntity, RecurringRuleEntity, SpendingLimitEntity, TransactionEntity

### Community 23 - "CalendarScreen.kt"
Cohesion: 0.06
Nodes (9): AssetSummary, CalendarGrid(), CalendarScreen(), compact(), Group, matches(), startOfWeek(), Summary() (+1 more)

### Community 24 - "imgdiff.py"
Cohesion: 0.12
Nodes (17): compare(), edges(), gray(), main(), _over_white(), _paeth(), PngError, read_png() (+9 more)

### Community 25 - "steps"
Cohesion: 0.08
Nodes (29): concurrency, cancel-in-progress, group, jobs, macos, windows, runs-on, steps (+21 more)

### Community 26 - "Reminders.kt"
Cohesion: 0.09
Nodes (4): AutoBackupState, AutoBackupWorker, rememberAndroidAutoBackup(), PlannedReminderWorker

### Community 27 - ".onCreate"
Cohesion: 0.10
Nodes (14): Shortcuts, AppCommand, BACK, NEW_EXPENSE, NEW_INCOME, NEW_TRANSACTION, SCAN_RECEIPT, SEARCH (+6 more)

### Community 28 - "Theme.kt"
Cohesion: 0.09
Nodes (12): ColorRole, ACCENT, EXPENSE, INCOME, PLANNED, PRIMARY, TRANSFER, contentColorFor() (+4 more)

### Community 29 - "steps"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, defaults, run, runs-on, steps, timeout-minutes (+19 more)

### Community 30 - "Phase 1 설계·구현 기록"
Cohesion: 0.14
Nodes (11): 글꼴, 1. 기술 선택, 2. 구현한 계산 규칙 (기획서 근거), 3. ⚠️ 확인이 필요한 금융 계산 규칙 (제안 기본값으로 구현), 4. 디자인 (투두메이트 모티브), 5. 아직 구현하지 않은 기능 (구조는 준비), 6. 알려진 제한, 7. 다음 단계 제안 (+3 more)

### Community 31 - "ThemePrefs"
Cohesion: 0.16
Nodes (6): CalendarDisplay, AMOUNT, BALANCE, DOT, ThemePrefs, RedesignLogicTest

### Community 33 - "Database.kt"
Cohesion: 0.10
Nodes (7): Converters, FinanceDatabase, FinanceDatabaseConstructor, openDefaultDatabase(), SettingsEntity, testDatabase(), testDatabase()

### Community 34 - "Csv.kt"
Cohesion: 0.11
Nodes (10): Csv, ImportItem, ImportPreview, ImportStatus, DUPLICATE, ERROR, NEW, TransactionCsvExport (+2 more)

### Community 36 - "AppLock"
Cohesion: 0.14
Nodes (5): InMemoryKeyValueStore, KeyValueStore, AppLock, hashPin(), AppLockTest

### Community 37 - "draw_icon.py"
Cohesion: 0.16
Nodes (9): circle_mask(), engraving_mask(), gradient(), render(), android(), desktop(), ios_icon(), main() (+1 more)

### Community 38 - ".periodContaining"
Cohesion: 0.11
Nodes (3): RepositoryPersistenceTest, Period, PeriodTest

### Community 40 - "localdate"
Cohesion: 0.09
Nodes (18): TransactionActions, TransactionStatus, CANCELLED, COMPLETED, PLANNED, TransactionType, ADJUSTMENT, EXCHANGE (+10 more)

### Community 42 - "Main.kt"
Cohesion: 0.13
Nodes (3): DesktopRoot(), main(), shortcut()

### Community 43 - "AutoBackupTest.kt"
Cohesion: 0.14
Nodes (3): BackupFolder, AutoBackupTest, DirFolder

### Community 44 - "DatabaseBuilder.ios.kt"
Cohesion: 0.15
Nodes (8): build(), openDefaultDatabase(), appSupportDirectory(), build(), openDefaultDatabase(), build(), defaultDesktopFile(), openDefaultDatabase()

### Community 45 - "reviews.py"
Cohesion: 0.20
Nodes (12): analyse(), FeedbackError, _host(), load_reviews(), load_themes(), main(), parse_date(), parse_rating() (+4 more)

### Community 46 - "steps"
Cohesion: 0.11
Nodes (18): runs-on, steps, timeout-minutes, jobs, ios-core, name, on, pull_request (+10 more)

### Community 51 - "Fx"
Cohesion: 0.11
Nodes (8): ForeignUiTest, Fx, platformHttpGet(), ExchangeRates, HttpGet, platformHttpGet(), Quote, platformHttpGet()

### Community 52 - "ForeignUiTest.kt"
Cohesion: 0.12
Nodes (3): AccountColorTest, BudgetDialogTest, LooinTheme()

### Community 53 - "IosPlatform.kt"
Cohesion: 0.11
Nodes (3): IosFileActions, NSObject, topViewController()

### Community 54 - "Biometric.kt"
Cohesion: 0.16
Nodes (4): AndroidBiometric, AuthenticationCallback, BiometricControl, NoBiometric

### Community 55 - "ReminderWorkerTest.kt"
Cohesion: 0.12
Nodes (3): ReminderScheduler, ReminderWorkerTest, 테스트

### Community 57 - "LooinAppRoot"
Cohesion: 0.17
Nodes (11): BottomNav(), LooinAppRoot(), nowMs(), Sidebar(), SideItem(), Tab, ANALYSIS, ASSETS (+3 more)

### Community 58 - "CsvImportScreenTest.kt"
Cohesion: 0.15
Nodes (7): CsvImportScreenTest, Phase 2-5: 새 디자인 · 색 직접 지정 · 입력 편의 (2026-11-13), 기능, 디자인 ("장부" 테마, 투두메이트 모양에서 변경), 사용자 결정, 색 직접 지정 (설정 → 색상), 테스트

### Community 59 - ".plan"
Cohesion: 0.18
Nodes (7): Reminder, ReminderPlanner, ReminderPlannerTest, Phase 2-2: 캘린더 확장 · 예정 거래 알림 · 미리보기 빌드 (2026-11-13), 미리보기 빌드 (`preview`), 예정 거래 알림 (Android), 캘린더 (기획서 "추후 확장" 항목)

### Community 60 - "TransactionQuery"
Cohesion: 0.29
Nodes (4): Result, TransactionQuery, TransactionSearch, SearchTest

### Community 61 - "ReceiptParser"
Cohesion: 0.25
Nodes (3): ReceiptGuess, ReceiptParser, ReceiptParserTest

### Community 62 - "ComposeView"
Cohesion: 0.19
Nodes (5): ComposeView, LooinBudgetApp, .body, LooinUi, SwiftUI

### Community 63 - "StoreScreenshotTest.kt"
Cohesion: 0.19
Nodes (5): StoreScreenshotTest, Frequency, DAILY, MONTHLY, WEEKLY

### Community 64 - "contrast.py"
Cohesion: 0.26
Nodes (9): check(), colours(), default_pairs(), flatten(), luminance(), main(), parse_hex(), ratio() (+1 more)

### Community 65 - "json"
Cohesion: 0.28
Nodes (7): combine(), load(), main(), MatrixError, render(), score(), visual_scores()

### Community 66 - "replica-recon"
Cohesion: 0.15
Nodes (12): Output, replica-recon, Step 1: scope, Step 2: list the sources, Step 3: screen inventory, Step 4: user flows, Step 5: components, Step 6: inferred data model (+4 more)

### Community 68 - ".suggest"
Cohesion: 0.17
Nodes (9): MemoSuggest, MemoSuggestion, MemoSuggestTest, Phase 3-2: Android 편의 기능 (2026-11-14), 메모 추천 (모든 플랫폼 공용), 앱 바로가기, 자동 백업, 테스트 (+1 more)

### Community 70 - "LockScreen"
Cohesion: 0.22
Nodes (10): Key(), LockScreen(), nowMs(), PinDots(), PinFlow, CHANGE, DISABLE, SET (+2 more)

### Community 72 - "AppFlowTest"
Cohesion: 0.26
Nodes (3): AppFlowDarkTest, AppFlowTest, 실행 및 빌드

### Community 76 - "PHASE2_NOTES.md"
Cohesion: 0.11
Nodes (17): Phase 2-7: iOS 앱 (2026-11-14), Phase 3-10: 외화 단위 오류 수정 · 외화 편의 (2026-11-17), Phase 3-6: 캘린더 모아 보기 · 예산 요약 수정 (2026-11-15), Phase 3-8: 카드 결제일 · 영수증 스캔 · 알림에서 완료 (2026-11-16), 고친 것, 고친 문제, 고친 문제: 돈 관리 머리의 "남는 예산"이 사용 가능 금액과 어긋나던 것, 고친 오류: 외화 계좌 화면에 "원"이 뜨던 것 (+9 more)

### Community 83 - "listing.py"
Cohesion: 0.33
Nodes (6): has_emoji(), length(), lint(), main(), render(), words()

### Community 84 - "Recon map: {{app}} ({{platform}})"
Cohesion: 0.18
Nodes (10): Components, Core loop, Feature matrix, Flows, Inferred data model, Out of scope (cannot or should not be cloned), Recon map: {{app}} ({{platform}}), Screens (+2 more)

### Community 85 - "테스트 (219개 통과)"
Cohesion: 0.29
Nodes (7): Phase 3-5: 한도를 예산에 합치기 · 고정 비용 · 캘린더 밀어 넘기기 (2026-11-15), 고정 비용 (예전 "반복 거래"), 사용자 결정, 예산 (지출 한도 기능 흡수), 캘린더, 테스트 (219개 통과), 홈

### Community 86 - "CalendarGroupingTest.kt"
Cohesion: 0.09
Nodes (19): CalendarGroupingTest, Category, CategoryKind, EXPENSE, INCOME, TransactionSource, ADJUSTMENT, BANK_SYNC (+11 more)

### Community 87 - "SmallLabel"
Cohesion: 0.11
Nodes (31): MoneyFormat, AccountRatesScreen(), RateRow(), AccountEditScreen(), AdjustForm(), AmountField(), amountToInput(), ChipPill() (+23 more)

### Community 88 - "argparse"
Cohesion: 0.36
Nodes (6): build_patterns(), is_binary(), main(), norm_hex(), render(), sweep()

### Community 89 - "replica-backend"
Cohesion: 0.20
Nodes (9): Auth, Database, Email and jobs, Integrations, Output, Payments, replica-backend, Security checklist (+1 more)

### Community 90 - "replica-build"
Cohesion: 0.20
Nodes (9): Definition of done, per screen, Output, replica-build, Step 1: the shell, Step 2: the vertical slice, Step 3: screen by screen, Step 4: the build log, The rules (+1 more)

### Community 91 - ".parse"
Cohesion: 0.15
Nodes (9): AmountExpression, Currencies, CurrencyInfo, AmountExpressionTest, Android 다듬기, Phase 3-3: 이름(가칭)·아이콘 · Android 다듬기 (2026-11-14), 앱 아이콘: 깃털 만년필이 새겨진 금화, 앱 이름: 가칭 "페즈뱅크" (영문 PezBank) (+1 more)

### Community 92 - "GoalFormTest.kt"
Cohesion: 0.17
Nodes (8): GoalFormTest, AccountType, CASH, CHECKING, FOREIGN, LIABILITY, OTHER_ASSET, SAVINGS

### Community 93 - "replica-brand"
Cohesion: 0.22
Nodes (8): Output, replica-brand, Step 1: the name, Step 2: the checks, run, not assumed, Step 3: palette, Step 4: logo brief, Step 5: voice, Step 6: the sweep

### Community 94 - "replica-deploy"
Cohesion: 0.22
Nodes (8): Output, replica-deploy, Step 1: preflight, Step 2: production services, Step 3: host and domain, Step 4: watch it, Step 5: mobile, if there is an app, The rules

### Community 95 - "replica-entrepreneur"
Cohesion: 0.22
Nodes (8): Output, replica-entrepreneur, Step 1: collect, Step 2: rank, Step 3: three lists, Step 4: the fix plan, Step 5: the angle, The rules, which are not negotiable

### Community 96 - "replica-test"
Cohesion: 0.22
Nodes (8): Output, replica-test, Step 1: the plan, Step 2: automate what you can, Step 3: click through the rest, Step 4: report bugs, Step 5: fix loop, The rule

### Community 98 - "단계"
Cohesion: 0.22
Nodes (8): 1단계: 공용 데이터 계층 — ✅ 완료 (2026-11-13), 2단계: 공용 화면 — ✅ 완료 (2026-11-13), 3단계: PC 출시 — 진행 중 (Windows 우선, 가능하면 macOS), 4단계: iOS 출시 — 진행 중 (앱 껍데기·CI 완료 2026-11-14, 서명·TestFlight 는 Apple 계정 후), iOS · PC 출시 로드맵, 단계, 지금 결정이 필요한 것, 현재 상태

### Community 99 - "LockScreens.kt"
Cohesion: 0.07
Nodes (8): Bar(), PaceChart(), BudgetMeter(), budgetName(), BudgetRow(), levelColor(), Looin, LooinType

### Community 101 - "replica-architect"
Cohesion: 0.25
Nodes (7): Output, replica-architect, Step 1: the stack, Step 2: the schema, Step 3: the API, Step 4: the parts that bite, Step 5: build order

### Community 102 - "replica-design"
Cohesion: 0.25
Nodes (7): Output, replica-design, Step 1: measure, do not guess, Step 2: write the tokens, Step 3: component specs, Step 4: build the primitives, The rules

### Community 103 - "replica-diff"
Cohesion: 0.25
Nodes (7): Output, replica-diff, Step 1: feature parity, Step 2: layout diff, Step 3: behaviour diff, Step 4: the report, What parity means here

### Community 104 - "replica-launch"
Cohesion: 0.25
Nodes (7): Output, replica-launch, Step 1: landing page, Step 2: pricing, Step 3: store listing, Step 4: launch plan, The rules

### Community 105 - "Phase 2-1: 반복 거래 · 백업/복원 · DB v2"
Cohesion: 0.25
Nodes (8): DB 스키마 v2, Phase 2-1: 반복 거래 · 백업/복원 · DB v2, 구현한 것, 다음 제안, 반복 거래 (정기 결제·급여), 백업 · 복원, 테스트, ⚠️ 확인이 필요한 규칙 (제안 기본값으로 구현)

### Community 106 - "Phase 2-3: 저축 목표 · 예산 이월 규칙 확정 (2026-11-13)"
Cohesion: 0.25
Nodes (6): Phase 2-3: 저축 목표 · 예산 이월 규칙 확정 (2026-11-13), 고친 버그, 데이터, 사용자 결정, 저축 목표, DateLabelTest

### Community 108 - "Architecture: {{your app}} (a rebuild of {{app}}'s core features)"
Cohesion: 0.29
Nodes (6): API, Architecture: {{your app}} (a rebuild of {{app}}'s core features), Build order, Schema, Stack, The parts that bite

### Community 109 - "페즈뱅크 개인정보처리방침"
Cohesion: 0.22
Nodes (9): 1. 수집하는 개인정보, 2. 이용자가 입력한 데이터의 저장, 3. 백업, 4. 데이터 삭제, 5. 제3자 제공, 6. 아동, 7. 방침 변경, 8. 문의 (+1 more)

### Community 111 - "CardBilling"
Cohesion: 0.27
Nodes (3): CardBilling, Statement, CardBillingTest

### Community 114 - "Android 출시 절차"
Cohesion: 0.29
Nodes (6): 1. 업로드 키 만들기 (한 번만, 사용자 PC에서), 2. 로컬에서 서명된 빌드 만들기, 3. GitHub Actions로 만들기 (권장), 4. Play Console 단계, 5. 출시 후, Android 출시 절차

### Community 115 - "release/README.md"
Cohesion: 0.17
Nodes (7): App Store 개인정보 라벨 (iOS 출시 때), Google Play 데이터 보안 양식, 기타 Play 콘텐츠 선언, 데이터 보안 · 개인정보 라벨 답변 초안, ✋ 사용자가 결정·준비해야 하는 것, 출시 준비 (Google Play · App Store · PC), 출시 체크리스트 (Android 1.0.0)

### Community 116 - "Deploy checklist: {{your app}}"
Cohesion: 0.33
Nodes (5): Deploy checklist: {{your app}}, Domain, Preflight (all must pass), Production, Watch

### Community 117 - "FinanceRepository.kt"
Cohesion: 0.12
Nodes (5): LimitTarget, ACCOUNT, ALL, CATEGORY, SpendingLimit

### Community 118 - "Google Play 스토어 등록정보 (초안)"
Cohesion: 0.29
Nodes (7): Google Play 스토어 등록정보 (초안), 그래픽 (`store/`), 분류, 새로운 기능 (1.0.0), 앱 이름, 자세한 설명, 짧은 설명 (80자 이내)

### Community 119 - "FinanceData"
Cohesion: 0.21
Nodes (4): BackupCodec, Summary, FinanceData, IosReminderControl

### Community 122 - "AvailableSplitUiTest.kt"
Cohesion: 0.11
Nodes (3): ForeignCurrencyTest, AvailableSplitUiTest, CalendarAddAndToastTest

### Community 123 - "CalendarFilter"
Cohesion: 0.40
Nodes (5): CalendarFilter, ALL, EXPENSE, INCOME, TRANSFER

### Community 124 - "RangeFilter"
Cohesion: 0.40
Nodes (5): RangeFilter, ALL, DAYS30, PERIOD, YEAR

### Community 125 - "StatusFilter"
Cohesion: 0.40
Nodes (5): StatusFilter, ALL, CANCELLED, COMPLETED, PLANNED

### Community 126 - "PC 출시 (Windows 우선 → macOS)"
Cohesion: 0.29
Nodes (7): PC 출시 (Windows 우선 → macOS), 검증 상태 (2026-11-13), 남은 PC 작업 (로드맵 3단계 — 모바일 기능 완성 후 진행), 만들기, 버전 올리기, 서명 (출시 전 필수), 설치·데이터 위치

### Community 128 - "Fx.kt"
Cohesion: 0.40
Nodes (5): RateKind, LAST_RECORD, LIVE, MANUAL, RateSource

### Community 130 - "ios_sim_screenshot.sh"
Cohesion: 0.83
Nodes (3): running(), ios_sim_screenshot.sh script, shot()

### Community 131 - "MainViewController"
Cohesion: 0.17
Nodes (7): App Store 제출 전 준비(사용자), CI (`.github/workflows/ios-app.yml`), iOS 앱 (페즈뱅크), iOS 에서 아직 다른 점, Mac 에서 열기, MainViewController(), IosKeyValueStore

### Community 132 - "ThemeMode"
Cohesion: 0.40
Nodes (4): ThemeMode, DARK, LIGHT, SYSTEM

### Community 133 - "BudgetKind"
Cohesion: 0.50
Nodes (4): BudgetKind, ACCOUNT, ALL, CATEGORY

### Community 136 - "AllocMode"
Cohesion: 0.67
Nodes (3): AllocMode, ADD, RELEASE

### Community 140 - "Phase 3-12: 예산 제안 설정 · 매일 고정 비용 · 빠른 입력 아이콘 (2026-11-17)"
Cohesion: 0.33
Nodes (6): Phase 3-12: 예산 제안 설정 · 매일 고정 비용 · 빠른 입력 아이콘 (2026-11-17), 고정 비용 "매일", 예산 줄이기 제안 (사용자 결정), 캘린더에서 거래 추가: 제목에 날짜 (2026-11-18), 테스트, 홈 빠른 입력 아이콘(직접 그림, `ui/components/AppIcons.kt`)

### Community 148 - "테스트 (176개 통과)"
Cohesion: 0.25
Nodes (6): Phase 2-6: 자동이체 · 앱 잠금 · 백업 알림 (2026-11-14), 반복 거래 "자동이체" (규칙별 선택, 기본 꺼짐), 백업 알림, 앱 잠금 (설정 → 보안), 테스트 (176개 통과), BackupReminderTest

### Community 150 - "SavingsGoal"
Cohesion: 0.26
Nodes (5): GoalStatus, SavingsAllocation, SavingsCalculator, SavingsGoal, SavingsAndRolloverTest

### Community 151 - "TypeFilter"
Cohesion: 0.40
Nodes (5): TypeFilter, ALL, EXPENSE, INCOME, TRANSFER

### Community 152 - "ReceiptScanTest.kt"
Cohesion: 0.21
Nodes (3): FakeScanner, ReceiptScanTest, ReceiptScan

### Community 153 - "Platform.kt"
Cohesion: 0.11
Nodes (10): AppInfo, AppPlatform, ANDROID, DESKTOP, IOS, NoAutoBackup, NoReceiptScanner, NoReminders (+2 more)

### Community 155 - "Phase 3-9: 외화 기록 정확도 · 실시간 환율 (2026-11-16)"
Cohesion: 0.29
Nodes (7): Phase 3-9: 외화 기록 정확도 · 실시간 환율 (2026-11-16), 거래가 있는 원화 계좌 → 외화 계좌, 거래별 당시 환율, 기존 외화 계좌의 환율 채우기, 앱 이름, 외화 잔고 표시와 실시간 환율, 테스트

### Community 156 - "테스트 (227개 통과)"
Cohesion: 0.50
Nodes (4): Phase 3-7: 통장 색 · 자주 쓰는 거래 · 잔고 부족 알림 · 지난 기간 대비 (2026-11-16), 추가로 넣은 것 (제안), 테스트 (227개 통과), 통장 색 (요청)

### Community 159 - "Phase 2-4: 즉시 화면 전환 · CSV 내보내기/가져오기 (2026-11-13)"
Cohesion: 0.21
Nodes (7): CSV 가져오기 (설정 → 데이터), CSV 내보내기 (설정 → 데이터), Phase 2-4: 즉시 화면 전환 · CSV 내보내기/가져오기 (2026-11-13), 테스트, 화면 전환, ⚠️ 확인이 필요한 규칙 (제안 기본값으로 구현), TextDecodeTest

### Community 160 - "Phase 3-4: 탭 오류 수정 · 선택 칸 정리 · 지출 한도 (2026-11-15)"
Cohesion: 0.33
Nodes (6): Phase 3-4: 탭 오류 수정 · 선택 칸 정리 · 지출 한도 (2026-11-15), 고친 오류: "홈"을 눌렀는데 돈 관리 탭이 열림, 지출 한도 (경고·제한) — 돈 관리 → 지출 한도, 카테고리·계좌 선택 정리 (거래 입력, 반복 거래 편집), 테스트, ⚠️ 확인이 필요한 규칙 → Phase 3-5에서 결정됨

### Community 170 - "Phase 3-1: PC 창에 맞춘 화면 (2026-11-14)"
Cohesion: 0.50
Nodes (4): PC 조작, Phase 3-1: PC 창에 맞춘 화면 (2026-11-14), 넓은 창(840dp 이상) 배치, 테스트

## Knowledge Gaps
- **104 isolated node(s):** `HOME`, `CALENDAR`, `PLAN`, `ASSETS`, `ANALYSIS` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 888 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **84 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Account` connect `.actualBalance` to `Fx.kt`, `toEntity`, `AssetsScreens.kt`, `RecurringAndBackupTest.kt`, `Transaction`, `HomeScreen.kt`, `WidgetTest.kt`, `DesktopWideLayoutTest.kt`, `CardBillTest.kt`, `SavingsGoal`, `CalendarScreen.kt`, `ReceiptScanTest.kt`, `.dataSurvivesReopenOnDesktop`, `Csv.kt`, `.periodContaining`, `.calendarSwipesBetweenMonths`, `localdate`, `AutoBackupTest.kt`, `Recurring.kt`, `CsvImportTest.kt`, `Fx`, `ForeignUiTest.kt`, `ReminderWorkerTest.kt`, `DesktopWideLayoutTest`, `CsvImportScreenTest.kt`, `StoreScreenshotTest.kt`, `MainViewModel`, `ShortcutTest.kt`, `BudgetMergeTest`, `MainViewModel.kt`, `FinanceRepository.kt`, `MemoSuggestUiTest`, `CalendarGroupingTest.kt`, `SmallLabel`, `GoalFormTest.kt`, `CardBilling`, `FinanceRepository.kt`, `FinanceData`, `CommonSmokeTest`, `AvailableSplitUiTest.kt`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `Transaction` (e.g. with `.convertKrwAccountToYen()` and `.convertYenBackToKrw()`) actually correct?**
  _`Transaction` has 12 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HOME`, `CALENDAR`, `PLAN` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AssetsScreens.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.04955570745044429 - nodes in this community are weakly interconnected._
- **Why does `Transaction` connect `Transaction` to `Fx.kt`, `toEntity`, `AssetsScreens.kt`, `.expense`, `AnalysisScreen`, `RecurringAndBackupTest.kt`, `.actualBalance`, `HomeScreen.kt`, `WidgetTest.kt`, `Components.kt`, `DesktopWideLayoutTest.kt`, `Budget`, `.categories`, `CardBillTest.kt`, `테스트 (176개 통과)`, `CalendarScreen.kt`, `ThemePrefs`, `Csv.kt`, `.periodContaining`, `.calendarSwipesBetweenMonths`, `localdate`, `Recurring.kt`, `CsvImportTest.kt`, `Fx`, `ForeignUiTest.kt`, `ReminderWorkerTest.kt`, `DesktopWideLayoutTest`, `.plan`, `TransactionQuery`, `StoreScreenshotTest.kt`, `.suggest`, `MainViewModel`, `MainViewModel.kt`, `FinanceRepository.kt`, `MemoSuggestUiTest`, `CalendarGroupingTest.kt`, `CardBilling`, `.transfer`, `FinanceRepository.kt`, `FinanceData`, `CommonSmokeTest`, `AvailableSplitUiTest.kt`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `Account` (e.g. with `.convertKrwAccountToYen()` and `.convertYenBackToKrw()`) actually correct?**
  _`Account` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Should `Receipts.kt` be split into smaller, more focused modules?**
  _Cohesion score 0.11052631578947368 - nodes in this community are weakly interconnected._