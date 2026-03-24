package com.hsbc.mortgage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateNoteRequest {

    @NotBlank(message = "Author is required")
    @Size(max = 100, message = "Author must be at most 100 characters")
    private String author;

    @NotBlank(message = "Content is required")
    private String content;

    @Size(max = 50, message = "Note type must be at most 50 characters")
    private String noteType = "general";

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getNoteType() { return noteType; }
    public void setNoteType(String noteType) { this.noteType = noteType; }
}
