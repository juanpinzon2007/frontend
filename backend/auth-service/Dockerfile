FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
COPY backend backend

RUN chmod +x mvnw && ./mvnw -pl backend/auth-service -am clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /workspace/backend/auth-service/target/auth-service-1.0.0.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java","-jar","/app/app.jar"]
