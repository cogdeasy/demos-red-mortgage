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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    void listByApplication_shouldReturnNotes() {
        UUID appId = UUID.randomUUID();
        Note note = new Note();
        note.setId(UUID.randomUUID());
        note.setApplicationId(appId);
        note.setAuthor("test@hsbc.co.uk");
        note.setContent("Test note");
        note.setNoteType("general");
        note.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        when(noteRepository.findByApplicationIdOrderByCreatedAtDesc(appId))
                .thenReturn(List.of(note));

        List<Note> result = service.listByApplication(appId);
        assertEquals(1, result.size());
        assertEquals("Test note", result.get(0).getContent());
    }

    @Test
    void create_shouldSaveNoteAndAuditEvent() {
        UUID appId = UUID.randomUUID();
        CreateNoteRequest request = new CreateNoteRequest();
        request.setAuthor("j.williams@hsbc.co.uk");
        request.setContent("Applicant called to discuss terms");
        request.setNoteType("phone_call");

        when(noteRepository.save(any(Note.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Note result = service.create(appId, request);

        assertNotNull(result.getId());
        assertEquals(appId, result.getApplicationId());
        assertEquals("j.williams@hsbc.co.uk", result.getAuthor());
        assertEquals("Applicant called to discuss terms", result.getContent());
        assertEquals("phone_call", result.getNoteType());

        verify(noteRepository).save(any(Note.class));
        verify(auditEventRepository).save(any(AuditEvent.class));
    }

    @Test
    void create_shouldDefaultNoteTypeToGeneral() {
        UUID appId = UUID.randomUUID();
        CreateNoteRequest request = new CreateNoteRequest();
        request.setAuthor("test@hsbc.co.uk");
        request.setContent("A general note");

        when(noteRepository.save(any(Note.class))).thenAnswer(i -> i.getArgument(0));
        when(auditEventRepository.save(any(AuditEvent.class))).thenAnswer(i -> i.getArgument(0));

        Note result = service.create(appId, request);
        assertEquals("general", result.getNoteType());
    }
}
