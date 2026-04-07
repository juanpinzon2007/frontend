package com.jairo.store.auth.repository;

import com.jairo.store.auth.domain.AppUser;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

import java.util.UUID;

public interface AppUserRepository extends ReactiveCrudRepository<AppUser, UUID> {

    Mono<AppUser> findByEmailIgnoreCase(String email);
}
