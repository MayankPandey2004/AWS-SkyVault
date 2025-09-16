package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
		log.Println("❌ Failed to read form file:", err)
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Generate unique key: username/uuid-filename.ext
	key := fmt.Sprintf("%s/%s-%s", username, uuid.New().String(), filepath.Base(header.Filename))

	log.Printf("➡️ Uploading file for user=%s, original=%s, s3key=%s\n", username, header.Filename, key)

	err = utils.UploadToS3(file, key)
	if err != nil {
		log.Println("❌ S3 upload failed:", err)
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("✅ File uploaded successfully: %s\n", key)

	// Respond with details expected by frontend
	resp := map[string]interface{}{
		"message":  "File uploaded successfully",
		"key":      key,
		"fileName": header.Filename,
		"size":     header.Size,
		"mimeType": header.Header.Get("Content-Type"),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// ListUserFiles fetches files for a user
func ListUserFiles(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	log.Printf("📂 Listing files for user=%s\n", username)
	files, err := utils.ListFiles(username + "/")
	if err != nil {
		log.Println("❌ Failed to list files:", err)
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

	log.Printf("⬇️ Downloading file key=%s\n", key)
	file, err := utils.DownloadFromS3(key)
	if err != nil {
		log.Println("❌ Download failed:", err)
		http.Error(w, "Download failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

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

	log.Printf("🗑️ Deleting file key=%s\n", key)
	err := utils.DeleteFromS3(key)
	if err != nil {
		log.Println("❌ Delete failed:", err)
		http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": "File deleted successfully",
	})
}

