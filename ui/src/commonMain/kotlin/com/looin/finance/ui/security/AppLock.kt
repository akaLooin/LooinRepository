package com.looin.finance.ui.security

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import com.looin.finance.ui.platform.InMemoryKeyValueStore
import com.looin.finance.ui.platform.KeyValueStore
import kotlin.random.Random

/** PIN 을 느리게 해시한다(PBKDF2-SHA256). 플랫폼마다 구현(Android·PC: javax.crypto). */
expect fun hashPin(pin: String, salt: String): String

/**
 * 앱 잠금(기기별 설정). PIN 은 저장하지 않고 소금(salt)을 친 해시만 [KeyValueStore] 에 둔다.
 *  - 켜져 있으면 앱을 처음 열 때와, 백그라운드에 [graceMillis] 이상 있다가 돌아올 때 잠근다
 *    (파일 선택 화면처럼 잠깐 나갔다 오는 경우는 잠그지 않음)
 *  - 5번 틀리면 30초 동안 입력을 막는다
 *  - PIN 을 잊으면 되찾을 수 없다(데이터 보호). 앱 데이터를 지우고 백업에서 복원해야 한다
 */
object AppLock {
    const val PIN_LENGTH = 4
    const val MAX_TRIES = 5
    const val LOCKOUT_MILLIS = 30_000L
    var graceMillis = 60_000L

    private var store: KeyValueStore = InMemoryKeyValueStore()

    var enabled by mutableStateOf(false)
        private set
    var biometricEnabled by mutableStateOf(false)
        private set
    /** 지금 잠겨 있는지(화면이 잠금 화면을 덮는다). */
    var locked by mutableStateOf(false)
        private set
    var failedTries by mutableStateOf(0)
        private set
    /** 이 시각(ms)까지 입력을 막는다. */
    var lockedOutUntil by mutableStateOf(0L)
        private set

    private var backgroundAt: Long? = null

    /** 이 프로세스에서 [init] 을 이미 했는지. 화면 회전으로 Activity 가 다시 만들어져도 잠금 상태를 유지한다. */
    var initialized = false
        private set

    /** 앱 시작 시: 저장소 연결, 켜져 있으면 잠근 상태로 시작. */
    fun init(store: KeyValueStore) {
        initialized = true
        this.store = store
        enabled = store.get("lock.hash").orEmpty().isNotEmpty()
        biometricEnabled = enabled && store.get("lock.biometric") == "1"
        locked = enabled
        failedTries = 0
        lockedOutUntil = 0
        backgroundAt = null
    }

    fun isValidPin(pin: String) = pin.length == PIN_LENGTH && pin.all { it.isDigit() }

    /** PIN 설정·변경. 켜는 즉시 잠그지는 않는다(지금 쓰는 중이므로). */
    fun setPin(pin: String) {
        require(isValidPin(pin)) { "PIN 은 숫자 ${PIN_LENGTH}자리입니다" }
        val salt = Random.nextBytes(16).joinToString("") { (it.toInt() and 0xFF).toString(16).padStart(2, '0') }
        store.put("lock.salt", salt)
        store.put("lock.hash", hashPin(pin, salt))
        enabled = true
        locked = false
    }

    fun disable() {
        store.put("lock.hash", ""); store.put("lock.salt", ""); store.put("lock.biometric", "")
        enabled = false; biometricEnabled = false; locked = false
    }

    fun setBiometric(on: Boolean) {
        if (!enabled) return
        store.put("lock.biometric", if (on) "1" else "")
        biometricEnabled = on
    }

    private fun matches(pin: String): Boolean {
        val salt = store.get("lock.salt") ?: return false
        return isValidPin(pin) && hashPin(pin, salt) == store.get("lock.hash")
    }

    /** 잠금 화면 PIN 입력. 맞으면 잠금 해제. */
    fun tryUnlock(pin: String, now: Long): Boolean {
        if (now < lockedOutUntil) return false
        if (matches(pin)) {
            locked = false; failedTries = 0; lockedOutUntil = 0
            return true
        }
        failedTries++
        if (failedTries >= MAX_TRIES) { lockedOutUntil = now + LOCKOUT_MILLIS; failedTries = 0 }
        return false
    }

    /** 설정에서 PIN 을 바꾸거나 끌 때 현재 PIN 확인(잠금 상태는 바꾸지 않음). */
    fun verify(pin: String): Boolean = matches(pin)

    /** 지문·얼굴 인증 성공. */
    fun unlockWithBiometric() { if (biometricEnabled) { locked = false; failedTries = 0 } }

    fun onBackground(now: Long) { if (enabled) backgroundAt = now }

    fun onForeground(now: Long) {
        val at = backgroundAt ?: return
        backgroundAt = null
        if (enabled && now - at >= graceMillis) locked = true
    }

    /** 테스트·미리보기용: 지금 잠근다. */
    fun lockNow() { if (enabled) locked = true }
}

/** 지문·얼굴 인증(Android). 지원하지 않는 플랫폼은 [available] = false. */
interface BiometricControl {
    val available: Boolean
    fun authenticate(onSuccess: () -> Unit)
}

object NoBiometric : BiometricControl {
    override val available = false
    override fun authenticate(onSuccess: () -> Unit) = Unit
}

val LocalBiometric = staticCompositionLocalOf<BiometricControl> { NoBiometric }
