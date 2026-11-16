package com.looin.finance.receipt

import android.graphics.Bitmap
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** 사진은 앱 안 receipts/ 에 저장되고, 어떤 거래에도 붙지 않은 오래된 사진만 정리된다. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ReceiptStoreTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test fun importSavesInsideApp() {
        val src = File(context.cacheDir, "in.png")
        Bitmap.createBitmap(40, 30, Bitmap.Config.ARGB_8888).compress(Bitmap.CompressFormat.PNG, 100, src.outputStream())
        val (path, _) = ReceiptStore.import(context, Uri.fromFile(src))
        assertTrue(path.startsWith("receipts/"))
        assertTrue(ReceiptStore.file(context, path).isFile)
    }

    @Test fun cleanupKeepsAttachedAndRecent() {
        val dir = File(context.filesDir, ReceiptStore.DIR).apply { mkdirs() }
        val now = 10_000_000_000L
        fun f(name: String, age: Long) = File(dir, name).apply { writeText("x"); setLastModified(now - age) }
        val kept = f("kept.jpg", 5 * 3_600_000L)
        val orphan = f("orphan.jpg", 5 * 3_600_000L)
        val editing = f("editing.jpg", 60_000L)
        assertEquals(1, ReceiptStore.cleanup(context, setOf("receipts/kept.jpg"), now))
        assertTrue(kept.exists()); assertFalse(orphan.exists()); assertTrue(editing.exists())
    }
}
