package com.jairo.store.gateway.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class GatewayCorsConfig {

    @Bean
    public CorsWebFilter corsWebFilter(
            @Value("${app.cors.allowed-origins:http://localhost:4200,http://localhost:8080}") String allowedOrigins,
            @Value("${app.cors.allowed-origin-patterns:http://localhost:*,https://*.run.app,https://*.vercel.app,https://*.netlify.app,https://*.web.app,https://*.firebaseapp.com}") String allowedOriginPatterns
    ) {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();
        List<String> originPatterns = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .toList();

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedOriginPatterns(originPatterns);
        configuration.addAllowedHeader("*");
        configuration.addAllowedMethod("*");
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return new CorsWebFilter(source);
    }
}
