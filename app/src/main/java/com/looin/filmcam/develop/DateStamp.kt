package com.looin.filmcam.develop

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Paint
import androidx.core.content.res.ResourcesCompat
import com.looin.filmcam.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.min

/** 필름 카메라식 날짜 각인: 오른쪽 아래, 주황 글자에 번짐. 형식 '26 11 04 */
object DateStamp {
    private const val COLOR = 0xFFFF9A3C.toInt()

    fun draw(context: Context, bitmap: Bitmap, takenAt: Long) {
        val text = SimpleDateFormat("''yy MM dd", Locale.US).format(Date(takenAt))
        val short = min(bitmap.width, bitmap.height).toFloat()
        val size = short * 0.04f
        val margin = short * 0.055f
        val face = ResourcesCompat.getFont(context, R.font.plexmono_semibold)

        val canvas = Canvas(bitmap)
        val glow = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            typeface = face
            textSize = size
            color = COLOR
            alpha = 150
            textAlign = Paint.Align.RIGHT
            maskFilter = BlurMaskFilter(size * 0.35f, BlurMaskFilter.Blur.NORMAL)
        }
        val core = Paint(glow).apply {
            maskFilter = null
            alpha = 235
        }
        val x = bitmap.width - margin
        val y = bitmap.height - margin
        canvas.drawText(text, x, y, glow)
        canvas.drawText(text, x, y, core)
    }
}
