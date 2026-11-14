const safe = (value, fallback) => {
  const cleaned = String(value || "").replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[^a-zA-Z_]+/, "");
  return cleaned.slice(0, 48) || fallback;
};
export function createAndroidProject({ name, kind, description }) {
  const appName = String(name || "My Android App").replace(/[<>\r\n]/g, "").slice(0, 60) || "My Android App";
  const appId = "com.ambuildstudio.generated." + safe(name, "project").toLowerCase();
  const title = appName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const isGame = kind === "Game";
  const activity = `package ${appId}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.Button
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { GeneratedHome() } }
    }
}

@Composable
fun GeneratedHome() {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("${appName.replace(/"/g, "'")}", style = MaterialTheme.typography.headlineMedium)
            Text("${isGame ? "Your game project is ready to customize." : "Your app project is ready to customize."}", modifier = Modifier.padding(top = 12.dp))
            Button(onClick = {}) { Text("Get started") }
        }
    }
}
`;
  const files = {
    "settings.gradle.kts": `pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }
dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }
rootProject.name = "${safe(name, "GeneratedProject")}"
include(":app")
`,
    "build.gradle.kts": `plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
}
`,
    "gradle.properties": "org.gradle.jvmargs=-Xmx3g -Dfile.encoding=UTF-8\nandroid.useAndroidX=true\nkotlin.code.style=official\n",
    "app/build.gradle.kts": `plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "${appId}"
    compileSdk = 35
    defaultConfig { applicationId = "${appId}"; minSdk = 23; targetSdk = 35; versionCode = 1; versionName = "1.0" }
    buildFeatures { compose = true }
}
dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
`,
    "app/src/main/AndroidManifest.xml": `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application android:theme="@android:style/Theme.Material.Light.NoActionBar" android:label="${title}" android:allowBackup="false"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`,
    "app/src/main/java/" + appId.replace(/\./g, "/") + "/MainActivity.kt": activity,
    "README.md": `# ${appName}\n\nGenerated Android ${kind || "App"} starter project.\n\nDescription: ${String(description || "").replace(/[\r\n]/g, " ").slice(0, 500)}\n\nOpen this folder in Android Studio and run the app. Build a debug APK with gradle :app:assembleDebug.\n\nThis is a compilable starter scaffold, not a complete implementation of every described feature. Review and test before release.\n`
  };
  return { name: appName, packageName: appId, kind: isGame ? "Game" : "App", files };
}
