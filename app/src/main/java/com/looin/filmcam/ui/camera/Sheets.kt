package com.looin.filmcam.ui.camera

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CameraAlt
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Lens
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.TabRowDefaults
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.looin.filmcam.film.Body
import com.looin.filmcam.film.Catalog
import com.looin.filmcam.film.Film
import com.looin.filmcam.film.Lens
import com.looin.filmcam.ui.components.Chip
import com.looin.filmcam.ui.theme.FilmColors
import com.looin.filmcam.ui.theme.FilmRadius
import com.looin.filmcam.ui.theme.FilmSpace
import com.looin.filmcam.ui.theme.FilmText

/** S03 필름 선반. 고르면 뷰파인더에 바로 반영. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FilmShelfSheet(
    films: List<Film>, selectedId: String, shot: Int, capacity: Int,
    onPick: (String) -> Unit, onDismiss: () -> Unit,
) {
    var category by remember { mutableStateOf("all") }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = FilmColors.surface,
        scrimColor = FilmColors.viewfinderFrame.copy(alpha = 0.35f),
    ) {
        Column(Modifier.padding(horizontal = FilmSpace.s4).navigationBarsPadding()) {
            Row(verticalAlignment = Alignment.Bottom) {
                Text("필름 고르기", style = FilmText.lg, color = FilmColors.text)
                Spacer(Modifier.weight(1f))
                Text("지금 롤 $shot/$capacity", style = FilmText.xs, color = FilmColors.textMuted)
            }
            LazyRow(horizontalArrangement = Arrangement.spacedBy(FilmSpace.s2), modifier = Modifier.padding(vertical = FilmSpace.s2)) {
                items(Catalog.categories) { (key, label) -> Chip(label, key == category) { category = key } }
            }
            val shown = films.filter { category == "all" || it.category == category }
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(FilmSpace.s2),
                verticalArrangement = Arrangement.spacedBy(FilmSpace.s2),
                modifier = Modifier.heightIn(max = 460.dp).padding(bottom = FilmSpace.s4),
            ) {
                items(shown, key = { it.id }) { f -> FilmCard(f, f.id == selectedId) { onPick(f.id) } }
            }
            if (shown.isEmpty()) {
                Text("이 분류에는 아직 필름이 없어요", style = FilmText.sm, color = FilmColors.textMuted, modifier = Modifier.padding(vertical = FilmSpace.s6))
            }
        }
    }
}

@Composable
private fun FilmCard(film: Film, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(FilmRadius.md)
    Box(
        Modifier
            .clip(shape)
            .background(FilmColors.surfaceRaised)
            .border(2.dp, if (selected) FilmColors.accent else FilmColors.surfaceRaised, shape)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = film.name; this.selected = selected }
            .padding(6.dp)
    ) {
        Column {
            AsyncImage(
                model = "file:///android_asset/swatches/${film.id}.png", contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(FilmRadius.sm)),
            )
            Text(film.name, style = FilmText.smStrong, color = FilmColors.text, maxLines = 1, modifier = Modifier.padding(top = 6.dp))
            Text(film.code, style = FilmText.caption, color = FilmColors.textMuted)
        }
        if (selected) {
            Box(
                Modifier.align(Alignment.TopEnd).padding(4.dp).size(20.dp).clip(CircleShape).background(FilmColors.accent),
                contentAlignment = Alignment.Center,
            ) { Icon(Icons.Rounded.Check, null, tint = FilmColors.onAccent, modifier = Modifier.size(14.dp)) }
        }
    }
}

/** S04/S05 장비: 바디와 렌즈를 탭 하나로. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GearSheet(
    bodies: List<Body>, lenses: List<Lens>, bodyId: String, lensId: String,
    onBody: (String) -> Unit, onLens: (String) -> Unit, onDismiss: () -> Unit,
) {
    var tab by remember { mutableIntStateOf(0) }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = FilmColors.surface,
        scrimColor = FilmColors.viewfinderFrame.copy(alpha = 0.35f),
    ) {
        Column(Modifier.padding(horizontal = FilmSpace.s4).navigationBarsPadding().padding(bottom = FilmSpace.s4)) {
            Text("장비", style = FilmText.lg, color = FilmColors.text)
            TabRow(
                selectedTabIndex = tab, containerColor = FilmColors.surface, contentColor = FilmColors.text,
                indicator = { pos -> TabRowDefaults.SecondaryIndicator(Modifier.tabIndicatorOffset(pos[tab]), color = FilmColors.accent) },
                modifier = Modifier.padding(vertical = FilmSpace.s2),
            ) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("바디", style = FilmText.smStrong) })
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("렌즈", style = FilmText.smStrong) })
            }
            Column(verticalArrangement = Arrangement.spacedBy(FilmSpace.s2)) {
                if (tab == 0) bodies.forEach { b ->
                    GearCard(Icons.Rounded.CameraAlt, b.name, b.traits, b.id == bodyId) { onBody(b.id) }
                } else lenses.forEach { l ->
                    GearCard(Icons.Rounded.Lens, l.name, l.traits, l.id == lensId) { onLens(l.id) }
                }
            }
        }
    }
}

@Composable
private fun GearCard(icon: ImageVector, name: String, traits: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(FilmRadius.md)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(FilmColors.surfaceRaised)
            .border(2.dp, if (selected) FilmColors.accent else FilmColors.surfaceRaised, shape)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = "$name, $traits"; this.selected = selected }
            .padding(FilmSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(FilmSpace.s3),
    ) {
        Icon(icon, null, tint = if (selected) FilmColors.accent else FilmColors.textMuted)
        Column(Modifier.weight(1f)) {
            Text(name, style = FilmText.base, color = FilmColors.text)
            Text(traits, style = FilmText.xs, color = FilmColors.textMuted)
        }
        if (selected) Icon(Icons.Rounded.Check, null, tint = FilmColors.accent)
    }
}
