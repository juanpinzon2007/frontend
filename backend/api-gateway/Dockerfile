FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
COPY backend backend

RUN chmod +x mvnw && ./mvnw -pl backend/api-gateway -am clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/backend/api-gateway/target/api-gateway-1.0.0.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
