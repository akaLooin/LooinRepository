package com.looin.studio.gl

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Draws a camcorder-style date stamp onto a transparent bitmap covering the whole frame. */
object DateStamp {
    fun create(aspect: Float, date: Date = Date()): Bitmap {
        val w = 1024
        val h = (w / aspect.coerceIn(0.3f, 3f)).toInt().coerceAtLeast(16)
        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val text = SimpleDateFormat("MM  dd  ''yy", Locale.US).format(date)
        val size = minOf(w, h) * 0.065f
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = size
            color = Color.rgb(255, 156, 54)
            setShadowLayer(size * 0.25f, 0f, 0f, Color.argb(200, 255, 90, 20))
            textAlign = Paint.Align.RIGHT
        }
        val margin = minOf(w, h) * 0.07f
        c.drawText(text, w - margin, h - margin, paint)
        return bmp
    }
}
