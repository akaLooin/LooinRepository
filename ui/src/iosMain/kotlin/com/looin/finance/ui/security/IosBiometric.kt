package com.looin.finance.ui.security

import kotlinx.cinterop.ExperimentalForeignApi
import platform.LocalAuthentication.LAContext
import platform.LocalAuthentication.LAPolicyDeviceOwnerAuthenticationWithBiometrics
import platform.darwin.dispatch_async
import platform.darwin.dispatch_get_main_queue

/** iOS Face ID·Touch ID. Info.plist 의 NSFaceIDUsageDescription 문구가 함께 보인다. */
class IosBiometric : BiometricControl {
    @OptIn(ExperimentalForeignApi::class)
    override val available: Boolean
        get() = LAContext().canEvaluatePolicy(LAPolicyDeviceOwnerAuthenticationWithBiometrics, error = null)

    override fun authenticate(onSuccess: () -> Unit) {
        if (!available) return
        val context = LAContext().apply { localizedFallbackTitle = "PIN 입력" }
        context.evaluatePolicy(LAPolicyDeviceOwnerAuthenticationWithBiometrics, localizedReason = "루인 가계부 잠금 해제") { ok, _ ->
            if (ok) dispatch_async(dispatch_get_main_queue()) { onSuccess() }
        }
    }
}
