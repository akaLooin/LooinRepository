package com.looin.filmcam

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.looin.filmcam.ui.PermissionScreen
import com.looin.filmcam.ui.SettingsScreen
import com.looin.filmcam.ui.camera.CameraScreen
import com.looin.filmcam.ui.camera.ShutterEvents
import com.looin.filmcam.ui.gallery.GalleryScreen
import com.looin.filmcam.ui.gallery.PhotoScreen
import com.looin.filmcam.ui.gallery.RollScreen
import com.looin.filmcam.ui.theme.FilmTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { FilmTheme { App() } }
    }

    // 볼륨 키 셔터: 카메라 화면이 보일 때만 가로채고, 아니면 원래대로 음량 조절
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if ((keyCode == KeyEvent.KEYCODE_VOLUME_DOWN || keyCode == KeyEvent.KEYCODE_VOLUME_UP) && ShutterEvents.cameraVisible) {
            if (event?.repeatCount == 0) ShutterEvents.fire()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    @Composable
    private fun App() {
        val granted = { ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED }
        var hasCamera by remember { mutableStateOf(granted()) }
        var askedOnce by remember { mutableStateOf(false) }
        val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
            hasCamera = it; askedOnce = true
        }

        if (!hasCamera) {
            // 한 번 거절한 뒤 다시 묻지 않음 상태면 시스템 대화상자가 안 뜨므로 설정으로 안내
            val permanent = askedOnce && !shouldShowRequestPermissionRationale(Manifest.permission.CAMERA)
            PermissionScreen(
                permanentlyDenied = permanent,
                onRequest = { launcher.launch(Manifest.permission.CAMERA) },
                onOpenSettings = {
                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", packageName, null)))
                },
            )
            DisposableEffect(Unit) {
                val observer = androidx.lifecycle.LifecycleEventObserver { _, e ->
                    if (e == androidx.lifecycle.Lifecycle.Event.ON_RESUME) hasCamera = granted()
                }
                lifecycle.addObserver(observer)
                onDispose { lifecycle.removeObserver(observer) }
            }
            return
        }

        val nav = rememberNavController()
        NavHost(navController = nav, startDestination = "camera") {
            composable("camera") {
                DisposableEffect(Unit) {
                    ShutterEvents.cameraVisible = true
                    onDispose { ShutterEvents.cameraVisible = false }
                }
                CameraScreen(onGallery = { nav.navigate("gallery") }, onSettings = { nav.navigate("settings") })
            }
            composable("gallery") {
                GalleryScreen(onBack = { nav.popBackStack() }, onRoll = { nav.navigate("roll/$it") })
            }
            composable("roll/{id}", arguments = listOf(navArgument("id") { type = NavType.LongType })) { e ->
                val id = e.arguments!!.getLong("id")
                RollScreen(id, onBack = { nav.popBackStack() }, onPhoto = { nav.navigate("photo/$id/$it") })
            }
            composable(
                "photo/{roll}/{index}",
                arguments = listOf(navArgument("roll") { type = NavType.LongType }, navArgument("index") { type = NavType.IntType }),
            ) { e ->
                PhotoScreen(e.arguments!!.getLong("roll"), e.arguments!!.getInt("index"), onBack = { nav.popBackStack() })
            }
            composable("settings") { SettingsScreen(onBack = { nav.popBackStack() }) }
        }
    }
}
