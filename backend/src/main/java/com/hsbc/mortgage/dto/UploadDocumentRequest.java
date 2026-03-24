package com.hsbc.mortgage.dto;

import jakarta.validation.constraints.NotBlank;

public class UploadDocumentRequest {

    @NotBlank
    private String documentType;

    @NotBlank
    private String fileName;

    private Integer fileSize;
    private String mimeType;
    private String uploadedBy;

    public String getDocumentType() { return documentType; }
    public void setDocumentType(String documentType) { this.documentType = documentType; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public Integer getFileSize() { return fileSize; }
    public void setFileSize(Integer fileSize) { this.fileSize = fileSize; }

    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }

    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
}
