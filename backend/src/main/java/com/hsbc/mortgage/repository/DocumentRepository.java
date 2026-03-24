package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.Document;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    List<Document> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);
}
