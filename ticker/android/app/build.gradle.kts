plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "dev.corebuilds.line"
    compileSdk = 34

    defaultConfig {
        applicationId = "dev.corebuilds.line"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
    }
}

val webPublic = rootProject.file("../public")
val webLib = rootProject.file("../lib")
val assetsOut = layout.projectDirectory.dir("src/main/assets/www")

val syncWebAssets = tasks.register<Copy>("syncWebAssets") {
    description = "Copy Core Line web UI + parsers into Android assets"
    from(webPublic)
    from(webLib) { into("lib") }
    into(assetsOut)
    exclude("sw.js")
}

tasks.named("preBuild").configure { dependsOn(syncWebAssets) }
