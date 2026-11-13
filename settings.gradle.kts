pluginManagement {
    repositories {
        google()
        // Maven Central 요청 제한(429) 대비: Google 미러를 먼저 조회
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        // Maven Central 요청 제한(429) 대비: Google 미러를 먼저 조회
        maven("https://maven-central.storage-download.googleapis.com/maven2/")
        mavenCentral()
    }
}
rootProject.name = "LooinFinance"
include(":core", ":shared", ":app")
