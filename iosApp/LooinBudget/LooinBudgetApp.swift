import SwiftUI
import LooinUi

/// iOS 진입점: Kotlin 공용 화면(MainViewController)을 전체 화면으로 띄운다.
/// 안전 영역(노치·홈 막대)과 키보드는 공용 화면이 직접 처리하므로 SwiftUI 쪽 여백은 없앤다.
@main
struct LooinBudgetApp: App {
    var body: some Scene {
        WindowGroup {
            ComposeView().ignoresSafeArea(.all)
        }
    }
}

struct ComposeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
