# Looin World 서버 이미지 (x86_64 / ARM64 모두 가능 — Oracle 무료 ARM VM 에서도 동작)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY . .
RUN ./gradlew :server:installDist --no-daemon -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /src/server/build/install/server /app
ENV LOOIN_DATA_DIR=/data PORT=8080
VOLUME /data
EXPOSE 8080
CMD ["/app/bin/server"]
