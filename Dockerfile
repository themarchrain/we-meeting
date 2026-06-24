FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN mkdir -p /app/logs

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 6060 6061

ENTRYPOINT ["java", "-jar", "app.jar"]
