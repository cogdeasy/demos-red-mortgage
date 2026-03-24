package com.hsbc.mortgage.service;

import com.hsbc.mortgage.dto.CreateNoteRequest;
import com.hsbc.mortgage.entity.AuditEvent;
import com.hsbc.mortgage.entity.Note;
import com.hsbc.mortgage.repository.AuditEventRepository;
import com.hsbc.mortgage.repository.NoteRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NoteServiceTest {

    @Mock
    private NoteRepository noteRepository;

    @Mock
    private AuditEventRepository auditEventRepository;

    private NoteService service;

    @BeforeEach
    void setUp() {
        service = new NoteService(noteRepository, auditEventRepository);
    }

    @Test
    void create_shouldCreateNoteAndEmitAudit() {
        UUID appId = UUID.randomUUID();
        CreateNoteRequest request = new CreateNoteRequest();
        request.setAuthor("j.williams@hsbc.co.uk");
        request.setContent("Initial review completed.");
        request.setNoteType("general");

        when(noteRepository.save(any(Note.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Note result = service.create(appId, request);

        assertNotNull(result.getId());
        assertEquals(appId, result.getApplicationId());
        assertEquals("j.williams@hsbc.co.uk", result.getAuthor());
        assertEquals("Initial review completed.", result.getContent());
        assertEquals("general", result.getNoteType());
        assertNotNull(result.getCreatedAt());

        verify(noteRepository).save(any(Note.class));

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();
        assertEquals("note", event.getEntityType());
        assertEquals("note.created", event.getAction());
        assertEquals("j.williams@hsbc.co.uk", event.getActor());
    }

    @Test
    void create_shouldDefaultNoteTypeToGeneral() {
        UUID appId = UUID.randomUUID();
        CreateNoteRequest request = new CreateNoteRequest();
        request.setAuthor("m.chen@hsbc.co.uk");
        request.setContent("Some content");
        request.setNoteType(null);

        when(noteRepository.save(any(Note.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Note result = service.create(appId, request);
        assertEquals("general", result.getNoteType());
    }

    @Test
    void listByApplication_shouldReturnNotes() {
        UUID appId = UUID.randomUUID();
        Note note = new Note();
        note.setId(UUID.randomUUID());
        note.setApplicationId(appId);

        when(noteRepository.findByApplicationIdOrderByCreatedAtDesc(appId))
                .thenReturn(List.of(note));

        List<Note> result = service.listByApplication(appId, null);
        assertEquals(1, result.size());
        assertEquals(appId, result.get(0).getApplicationId());
    }

    @Test
    void listByApplication_shouldFilterByNoteType() {
        UUID appId = UUID.randomUUID();
        Note note = new Note();
        note.setId(UUID.randomUUID());
        note.setNoteType("condition");

        when(noteRepository.findByApplicationIdAndNoteTypeOrderByCreatedAtDesc(appId, "condition"))
                .thenReturn(List.of(note));

        List<Note> result = service.listByApplication(appId, "condition");
        assertEquals(1, result.size());
        verify(noteRepository).findByApplicationIdAndNoteTypeOrderByCreatedAtDesc(appId, "condition");
    }

    @Test
    void getById_shouldReturnNote() {
        UUID noteId = UUID.randomUUID();
        Note note = new Note();
        note.setId(noteId);

        when(noteRepository.findById(noteId)).thenReturn(Optional.of(note));

        Optional<Note> result = service.getById(noteId);
        assertTrue(result.isPresent());
        assertEquals(noteId, result.get().getId());
    }

    @Test
    void getById_shouldReturnEmptyIfNotFound() {
        UUID noteId = UUID.randomUUID();
        when(noteRepository.findById(noteId)).thenReturn(Optional.empty());

        Optional<Note> result = service.getById(noteId);
        assertTrue(result.isEmpty());
    }

    @Test
    void delete_shouldDeleteNoteAndEmitAudit() {
        UUID noteId = UUID.randomUUID();
        UUID appId = UUID.randomUUID();
        Note note = new Note();
        note.setId(noteId);
        note.setApplicationId(appId);
        note.setAuthor("j.williams@hsbc.co.uk");
        note.setContent("Test note");
        note.setNoteType("general");

        when(noteRepository.findById(noteId)).thenReturn(Optional.of(note));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        boolean result = service.delete(noteId);
        assertTrue(result);

        verify(noteRepository).delete(note);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditEventRepository).save(captor.capture());
        AuditEvent event = captor.getValue();
        assertEquals("note", event.getEntityType());
        assertEquals("note.deleted", event.getAction());
        assertEquals(appId, event.getApplicationId());
    }

    @Test
    void delete_shouldReturnFalseIfNotFound() {
        UUID noteId = UUID.randomUUID();
        when(noteRepository.findById(noteId)).thenReturn(Optional.empty());

        boolean result = service.delete(noteId);
        assertFalse(result);

        verify(noteRepository, never()).delete(any(Note.class));
        verify(auditEventRepository, never()).save(any(AuditEvent.class));
    }
}
