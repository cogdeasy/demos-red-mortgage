package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.CreateNoteRequest;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.Note;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.NoteRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoteService {

    private final NoteRepository noteRepository;
    private final AuditEventRepository auditEventRepository;

    public NoteService(NoteRepository noteRepository, AuditEventRepository auditEventRepository) {
        this.noteRepository = noteRepository;
        this.auditEventRepository = auditEventRepository;
    }

    public List<Note> listByApplication(UUID applicationId) {
        return noteRepository.findByApplicationIdOrderByCreatedAtDesc(applicationId);
    }

    @Transactional
    public Note create(UUID applicationId, CreateNoteRequest request) {
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        Note note = new Note();
        note.setId(id);
        note.setApplicationId(applicationId);
        note.setAuthor(request.getAuthor());
        note.setContent(request.getContent());
        note.setNoteType(request.getNoteType() != null ? request.getNoteType() : "general");
        note.setCreatedAt(now);

        Note saved = noteRepository.save(note);

        AuditEvent event = new AuditEvent();
        event.setId(UUID.randomUUID());
        event.setApplicationId(applicationId);
        event.setEntityType("note");
        event.setEntityId(id);
        event.setAction("note.created");
        event.setActor(request.getAuthor());
        event.setChanges(String.format("{\"note_type\":\"%s\"}", note.getNoteType()));
        event.setMetadata("{\"source\":\"api\"}");
        event.setCreatedAt(now);
        auditEventRepository.save(event);

        return saved;
    }
}
