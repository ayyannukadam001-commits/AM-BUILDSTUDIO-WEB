const safe = (value, fallback) => {
  const cleaned = String(value || "").replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[^a-zA-Z_]+/, "");
  return cleaned.slice(0, 48) || fallback;
};
const kotlinString = value => JSON.stringify(String(value ?? "").replace(/[\r\n]/g, " ").slice(0, 140)).replace(/\$/g, "\\$");
export function createAndroidProject({ name, kind, description, plan }) {
  const appName = String(name || "My Android App").replace(/[<>\r\n"$\\]/g, "").slice(0, 60) || "My Android App";
  const appId = "com.ambuildstudio.generated." + safe(name, "project").toLowerCase();
  const title = appName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const isGame = kind === "Game";
  const screens = (Array.isArray(plan?.screens) ? plan.screens : ["Home", "Explore", "Settings"]).map(x => String(x).slice(0, 50)).slice(0, 8);
  const features = (Array.isArray(plan?.features) ? plan.features : ["Core project interface", "Responsive screen layout", "Expandable feature modules"]).map(x => String(x).slice(0, 100)).slice(0, 8);
  const screenValues = screens.map(kotlinString).join(", ");
  const featureLines = features.map(x => "            Text(" + kotlinString("• " + x) + ")").join("\n");
  const subtitle = String(plan?.summary || description || (isGame ? "Your game project is ready to customize." : "Your app project is ready to customize.")).slice(0, 140);
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
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
    val screenNames = listOf(${screenValues})
    var selectedScreen by remember { mutableStateOf(screenNames.firstOrNull() ?: "Home") }
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("${kotlinString(appName).slice(1,-1)}", style = MaterialTheme.typography.headlineMedium)
            Text(${kotlinString(subtitle)})
            Text("Current screen: " + selectedScreen, style = MaterialTheme.typography.titleMedium)
            screenNames.forEach { screen ->
                Button(onClick = { selectedScreen = screen }) { Text(screen) }
            }
            Text("Planned features", style = MaterialTheme.typography.titleMedium)
${featureLines}
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
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
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
    ["app/src/main/java/" + appId.replace(/\./g, "/") + "/MainActivity.kt"]: activity,
    "README.md": `# ${appName}\n\nGenerated Android ${kind || "App"} starter project.\n\nDescription: ${String(description || "").replace(/[\r\n]/g, " ").slice(0, 500)}\n\nOpen this folder in Android Studio and run the app. Build a debug APK with gradle :app:assembleDebug.\n\nThis is a generated starter scaffold; custom business logic, data services and production testing still need implementation.\n`
  };
  return { name: appName, packageName: appId, kind: isGame ? "Game" : "App", files };
}
