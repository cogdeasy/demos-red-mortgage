package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.AuditEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByApplicationIdOrderByCreatedAtAsc(UUID applicationId);
}
