package com.looin.finance.security

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.looin.finance.ui.security.BiometricControl

/**
 * Android 지문·얼굴 인증. 기기에 생체 인증이 등록되어 있을 때만 [available].
 * 취소·실패는 조용히 무시하고 PIN 입력으로 돌아간다.
 */
class AndroidBiometric(private val activity: FragmentActivity) : BiometricControl {
    override val available: Boolean
        get() = BiometricManager.from(activity).canAuthenticate(BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS

    override fun authenticate(onSuccess: () -> Unit) {
        if (!available) return
        val prompt = BiometricPrompt(activity, ContextCompat.getMainExecutor(activity), object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) = onSuccess()
        })
        prompt.authenticate(
            BiometricPrompt.PromptInfo.Builder()
                .setTitle("루인 가계부 잠금 해제")
                .setSubtitle("지문 또는 얼굴로 확인해요")
                .setNegativeButtonText("PIN 입력")
                .setAllowedAuthenticators(BIOMETRIC_WEAK)
                .build(),
        )
    }
}
