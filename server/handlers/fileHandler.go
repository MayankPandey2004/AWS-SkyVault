package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"server/utils"
)

// UploadFile uploads file to S3
func UploadFile(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate unique key like: username/uuid-filename.ext
	key := fmt.Sprintf("%s/%s-%s", username, uuid.New().String(), filepath.Base(header.Filename))

	err = utils.UploadToS3(file, key)
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "File uploaded successfully",
		"key":     key,
	})
}

// ListUserFiles fetches files for a user
func ListUserFiles(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	files, err := utils.ListFiles(username + "/")
	if err != nil {
		http.Error(w, "Unable to list files", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(files)
}

// DownloadFile downloads a file from S3
func DownloadFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	file, err := utils.DownloadFromS3(key)
	if err != nil {
		http.Error(w, "Download failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Stream back the file
	w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(key))
	w.Header().Set("Content-Type", "application/octet-stream")
	io.Copy(w, file)
}

// DeleteFile deletes a file from S3
func DeleteFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	err := utils.DeleteFromS3(key)
	if err != nil {
		http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "File deleted successfully",
	})
}
