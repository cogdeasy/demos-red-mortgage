package com.hsbc.mortgage.repository;

import com.hsbc.mortgage.entity.Note;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NoteRepository extends JpaRepository<Note, UUID> {

    List<Note> findByApplicationIdOrderByCreatedAtDesc(UUID applicationId);

    List<Note> findByApplicationIdAndNoteTypeOrderByCreatedAtDesc(UUID applicationId, String noteType);
}
