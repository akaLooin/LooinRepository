package world.looin.app

import java.util.prefs.Preferences

actual object AppSettings {
    private val prefs = Preferences.userRoot().node("world/looin/app")
    actual fun get(key: String): String? = prefs.get(key, null)
    actual fun set(key: String, value: String?) {
        if (value == null) prefs.remove(key) else prefs.put(key, value)
        prefs.flush()
    }
}

actual fun nowMillis(): Long = System.currentTimeMillis()
