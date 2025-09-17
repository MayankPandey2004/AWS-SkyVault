package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"server/db"
	"server/utils"
)

//
// 🔹 UploadFile
//
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

	// Generate unique S3 key
	key := fmt.Sprintf("%s/%s-%s", username, uuid.New().String(), filepath.Base(header.Filename))
	log.Printf("➡️ Upload request | user=%s | filename=%s | s3key=%s | size=%d",
		username, header.Filename, key, header.Size)

	// Upload to S3
	if err := utils.UploadToS3(file, key); err != nil {
		log.Printf("❌ S3 upload failed | user=%s | error=%v", username, err)
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("✅ S3 upload success | key=%s", key)

	// Save metadata in DB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = db.DB.Exec(ctx, `
		INSERT INTO files (filename, size, mime_type, original_uploader, hash, upload_date)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`, header.Filename, header.Size, header.Header.Get("Content-Type"), username, key)
	if err != nil {
		log.Printf("❌ DB insert failed (files) | user=%s | error=%v", username, err)
	}

	// Update system stats
	_, _ = db.DB.Exec(ctx, `
		UPDATE system_stats
		SET total_files = total_files + 1,
		    total_storage = total_storage + $1,
		    total_uploads = total_uploads + 1
		WHERE snapshot_date = CURRENT_DATE
	`, header.Size)

	// Update user stats
	_, _ = db.DB.Exec(ctx, `
		INSERT INTO user_stats (user_id, total_files, total_storage, uploads_this_month, downloads_this_month, deduplication_savings, last_updated)
		VALUES ((SELECT id FROM users WHERE email=$1), 1, $2, 1, 0, 0, NOW())
		ON CONFLICT (user_id)
		DO UPDATE SET
			total_files = user_stats.total_files + 1,
			total_storage = user_stats.total_storage + EXCLUDED.total_storage,
			uploads_this_month = user_stats.uploads_this_month + 1,
			last_updated = NOW()
	`, username, header.Size)

	resp := map[string]interface{}{
		"message":  "File uploaded successfully",
		"key":      key, // ✅ return real S3 key
		"fileName": header.Filename,
		"size":     header.Size,
		"mimeType": header.Header.Get("Content-Type"),
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

//
// 🔹 ListUserFiles
//
func ListUserFiles(w http.ResponseWriter, r *http.Request) {
	username := r.URL.Query().Get("username")
	if username == "" {
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	log.Printf("📂 List files request | user=%s", username)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.DB.Query(ctx, `
		SELECT id, filename, size, mime_type, upload_date, hash
		FROM files
		WHERE original_uploader = $1
		ORDER BY upload_date DESC
	`, username)
	if err != nil {
		http.Error(w, "Unable to list files", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var files []map[string]interface{}
	for rows.Next() {
		var (
			id         int
			filename   string
			size       int64
			mimeType   string
			uploadDate time.Time
			s3Key      string
		)
		if err := rows.Scan(&id, &filename, &size, &mimeType, &uploadDate, &s3Key); err == nil {
			files = append(files, map[string]interface{}{
				"id":         id,
				"fileName":   filename,
				"size":       size,
				"mimeType":   mimeType,
				"uploadDate": uploadDate,
				"s3Key":      s3Key, // ✅ send correct key to frontend
			})
		}
	}

	_ = json.NewEncoder(w).Encode(files)
}

//
// 🔹 DownloadFile
//
func DownloadFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	log.Printf("⬇️ Download request | key=%s", key)

	file, err := utils.DownloadFromS3(key)
	if err != nil {
		http.Error(w, "Download failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// update stats
	_, _ = db.DB.Exec(ctx, `
		UPDATE system_stats
		SET total_downloads = total_downloads + 1
		WHERE snapshot_date = CURRENT_DATE
	`)

	username := strings.Split(key, "/")[0]
	_, _ = db.DB.Exec(ctx, `
		UPDATE user_stats
		SET downloads_this_month = downloads_this_month + 1,
		    last_updated = NOW()
		WHERE user_id = (SELECT id FROM users WHERE email=$1)
	`, username)

	w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(key))
	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = io.Copy(w, file)
}

//
// 🔹 DeleteFile
//
func DeleteFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	log.Printf("🗑️ Delete request | key=%s", key)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// fetch size + uploader using s3Key
	var (
		size  int64
		email string
	)
	err := db.DB.QueryRow(ctx,
		`SELECT size, original_uploader FROM files WHERE hash=$1`, key,
	).Scan(&size, &email)
	if err != nil {
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// delete from S3
	if err := utils.DeleteFromS3(key); err != nil {
		http.Error(w, "Delete failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// delete from DB
	_, _ = db.DB.Exec(ctx, `DELETE FROM files WHERE hash=$1`, key)

	// update stats
	_, _ = db.DB.Exec(ctx, `
		UPDATE system_stats
		SET total_files = GREATEST(total_files - 1, 0),
		    total_storage = GREATEST(total_storage - $1, 0)
		WHERE snapshot_date = CURRENT_DATE
	`, size)

	_, _ = db.DB.Exec(ctx, `
		UPDATE user_stats
		SET total_files = GREATEST(total_files - 1, 0),
		    total_storage = GREATEST(total_storage - $1, 0),
		    last_updated = NOW()
		WHERE user_id = (SELECT id FROM users WHERE email=$2)
	`, size, email)

	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "File deleted successfully",
	})
}
