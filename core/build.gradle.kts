import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.jvm)
}

// 순수 Kotlin 재정 계산 모듈. Android/JVM 전용 API(java.time, BigDecimal 등)를 쓰지 않아
// 향후 Kotlin Multiplatform(iOS·데스크톱)으로 옮길 수 있도록 유지한다.
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}
kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    api(libs.kotlinx.datetime)
    testImplementation(libs.junit)
}
