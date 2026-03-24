package com.hsbc.mortgage.controller;

import com.hsbc.mortgage.dto.CreateNoteRequest;
import com.hsbc.mortgage.entity.Note;
import com.hsbc.mortgage.service.NoteService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping("/api/v1/applications/{applicationId}/notes")
    public ResponseEntity<Map<String, List<Note>>> listNotes(
            @PathVariable UUID applicationId,
            @RequestParam(name = "note_type", required = false) String noteType) {
        return ResponseEntity.ok(Map.of("data",
                noteService.listByApplication(applicationId, noteType)));
    }

    @PostMapping("/api/v1/applications/{applicationId}/notes")
    public ResponseEntity<Object> createNote(
            @PathVariable UUID applicationId,
            @Valid @RequestBody CreateNoteRequest request) {
        Note note = noteService.create(applicationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(note);
    }

    @DeleteMapping("/api/v1/notes/{id}")
    public ResponseEntity<Object> deleteNote(@PathVariable UUID id) {
        boolean deleted = noteService.delete(id);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Note not found"));
        }
        return ResponseEntity.ok(Map.of("message", "Note deleted"));
    }
}
