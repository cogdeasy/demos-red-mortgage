package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.Application;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Page<Application> findByStatus(String status, Pageable pageable);

    @Query("SELECT a FROM Application a WHERE " +
           "LOWER(CONCAT(a.applicantFirstName, ' ', a.applicantLastName)) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(a.applicantEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(a.propertyPostcode, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(a.propertyCity, '')) LIKE LOWER(CONCAT('%', :search, '%'))")
    Page<Application> searchApplications(@Param("search") String search, Pageable pageable);

    @Query("SELECT a FROM Application a WHERE a.status = :status AND (" +
           "LOWER(CONCAT(a.applicantFirstName, ' ', a.applicantLastName)) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(a.applicantEmail) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(a.propertyPostcode, '')) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(COALESCE(a.propertyCity, '')) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<Application> searchByStatus(@Param("status") String status, @Param("search") String search, Pageable pageable);

    @Query("SELECT a.status, COUNT(a) FROM Application a GROUP BY a.status")
    List<Object[]> countByStatusGrouped();

    @Query("SELECT AVG(a.loanAmount), AVG(a.ltvRatio) FROM Application a")
    List<Object[]> getAverages();
}
