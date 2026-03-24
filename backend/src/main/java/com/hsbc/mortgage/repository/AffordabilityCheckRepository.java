package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.AffordabilityCheck;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface AffordabilityCheckRepository extends JpaRepository<AffordabilityCheck, UUID> {

    Optional<AffordabilityCheck> findByApplicationId(UUID applicationId);

    @Query("SELECT a.verdict, COUNT(a) FROM AffordabilityCheck a GROUP BY a.verdict")
    List<Object[]> countByVerdictGrouped();

    @Query("SELECT AVG(a.dtiRatioStressed) FROM AffordabilityCheck a")
    Double getAverageDtiRatio();
}
