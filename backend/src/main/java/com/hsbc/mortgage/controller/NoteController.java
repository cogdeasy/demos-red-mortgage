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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications/{applicationId}/notes")
public class NoteController {

    private final NoteService noteService;

    public NoteController(NoteService noteService) {
        this.noteService = noteService;
    }

    @GetMapping
    public ResponseEntity<Map<String, List<Note>>> list(@PathVariable UUID applicationId) {
        return ResponseEntity.ok(Map.of("data", noteService.listByApplication(applicationId)));
    }

    @PostMapping
    public ResponseEntity<Note> create(@PathVariable UUID applicationId,
                                       @Valid @RequestBody CreateNoteRequest request) {
        Note note = noteService.create(applicationId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(note);
    }
}
