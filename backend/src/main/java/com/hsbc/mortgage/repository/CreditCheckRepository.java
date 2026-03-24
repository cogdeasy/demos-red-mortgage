package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.CreditCheck;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CreditCheckRepository extends JpaRepository<CreditCheck, UUID> {

    Optional<CreditCheck> findByApplicationId(UUID applicationId);
}
