package world.looin.app

import android.content.Context
import android.content.SharedPreferences

actual object AppSettings {
    private var prefs: SharedPreferences? = null

    fun init(context: Context) {
        prefs = context.getSharedPreferences("looin", Context.MODE_PRIVATE)
    }

    actual fun get(key: String): String? = prefs?.getString(key, null)
    actual fun set(key: String, value: String?) {
        prefs?.edit()?.apply { if (value == null) remove(key) else putString(key, value) }?.apply()
    }
}

actual fun nowMillis(): Long = System.currentTimeMillis()
