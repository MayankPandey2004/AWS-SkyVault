package handlers

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"server/db"
	"server/utils"
)

//
// 🔹 Helper: Ensure user exists and return user_id
//
func ensureUser(ctx context.Context, email string) (int, error) {
    var userID int
    err := db.DB.QueryRow(ctx,
        `INSERT INTO users (email) VALUES ($1)
         ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
         RETURNING id`,
        email,
    ).Scan(&userID)
    if err != nil {
        return 0, fmt.Errorf("failed to ensure user: %w", err)
    }

    // Ensure user_stats row exists too
    _, err = db.DB.Exec(ctx, `
        INSERT INTO user_stats (user_id, files_count, storage_used, uploads_this_month, downloads_this_month, deduplication_savings, last_active)
        VALUES ($1, 0, 0, 0, 0, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
    `, userID)
    if err != nil {
        return 0, fmt.Errorf("failed to ensure user_stats: %w", err)
    }

    return userID, nil
}


//
// 🔹 UploadFile (deduplication + stats)
//
func UploadFile(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	if username == "" {
		log.Printf("❌ Upload failed | missing username")
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		log.Printf("❌ Upload failed | user=%s | error reading file: %v", username, err)
		http.Error(w, "Invalid file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Read file bytes (for hashing + S3 upload)
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		log.Printf("❌ Upload failed | user=%s | error reading file bytes: %v", username, err)
		http.Error(w, "File read error", http.StatusInternalServerError)
		return
	}

	// Compute SHA256 hash
	h := sha256.New()
	h.Write(fileBytes)
	hash := hex.EncodeToString(h.Sum(nil))

	// Reset reader for S3
	fileReader := io.NopCloser(bytes.NewReader(fileBytes))

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Ensure user exists
	userID, err := ensureUser(ctx, username)
	if err != nil {
		log.Printf("❌ Upload failed | ensureUser | %v", err)
		http.Error(w, "User creation failed", http.StatusInternalServerError)
		return
	}

	var blobID int
	var s3Key string
	isDuplicate := false

	// 🔍 Check if blob already exists
	err = db.DB.QueryRow(ctx, `SELECT id, s3_key FROM file_blobs WHERE hash=$1`, hash).Scan(&blobID, &s3Key)
	if err == nil {
		// Duplicate
		_, _ = db.DB.Exec(ctx, `UPDATE file_blobs SET ref_count = ref_count + 1 WHERE id=$1`, blobID)
		isDuplicate = true
		log.Printf("⚠️ Duplicate upload | user=%s | hash=%s | blob_id=%d", username, hash, blobID)
	} else {
		// New file → upload to S3
		s3Key = fmt.Sprintf("blobs/%s-%s", hash, uuid.New().String())
		log.Printf("➡️ Uploading new blob to S3 | user=%s | key=%s", username, s3Key)

		if err := utils.UploadToS3(fileReader, s3Key); err != nil {
			log.Printf("❌ S3 upload failed | user=%s | key=%s | error=%v", username, s3Key, err)
			http.Error(w, "S3 upload failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("✅ S3 upload success | user=%s | key=%s", username, s3Key)

		// Insert blob record
		err = db.DB.QueryRow(ctx,
			`INSERT INTO file_blobs (hash, s3_key, size, mime_type) 
			 VALUES ($1, $2, $3, $4) RETURNING id`,
			hash, s3Key, header.Size, header.Header.Get("Content-Type"),
		).Scan(&blobID)
		if err != nil {
			log.Printf("❌ DB insert failed (file_blobs) | user=%s | error=%v", username, err)
			http.Error(w, "DB insert failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		log.Printf("✅ DB insert success (file_blobs) | blob_id=%d | hash=%s", blobID, hash)
	}

	// Link file to user
	_, err = db.DB.Exec(ctx,
		`INSERT INTO user_files (user_id, blob_id, filename) VALUES ($1, $2, $3)`,
		userID, blobID, header.Filename,
	)
	if err != nil {
		log.Printf("❌ DB insert failed (user_files) | user=%s | error=%v", username, err)
		http.Error(w, "DB insert failed (user_files): "+err.Error(), http.StatusInternalServerError)
		return
	}
	log.Printf("✅ User file reference created | user=%s | blob_id=%d | filename=%s", username, blobID, header.Filename)

	// 📊 System stats
	if !isDuplicate {
		_, _ = db.DB.Exec(ctx, `
			UPDATE system_stats
			SET total_files = total_files + 1,
			    total_storage = total_storage + $1,
			    total_uploads = total_uploads + 1
			WHERE snapshot_date = CURRENT_DATE
		`, header.Size)
		log.Printf("📊 System stats updated | new file | size=%d", header.Size)
	} else {
		_, _ = db.DB.Exec(ctx, `
			UPDATE system_stats
			SET total_uploads = total_uploads + 1,
			    deduplication_savings = deduplication_savings + $1
			WHERE snapshot_date = CURRENT_DATE
		`, header.Size)
		log.Printf("📊 System stats updated | duplicate | savings=%d", header.Size)
	}

	// 📊 User stats
	if !isDuplicate {
		_, _ = db.DB.Exec(ctx, `
			INSERT INTO user_stats (user_id, files_count, storage_used, uploads_this_month, downloads_this_month, deduplication_savings, last_active)
			VALUES ($1, 1, $2, 1, 0, 0, NOW())
			ON CONFLICT (user_id)
			DO UPDATE SET
				files_count = user_stats.files_count + 1,
				storage_used = user_stats.storage_used + EXCLUDED.storage_used,
				uploads_this_month = user_stats.uploads_this_month + 1,
				last_active = NOW()
		`, userID, header.Size)
		log.Printf("📊 User stats updated | user=%s | +file", username)
	} else {
		_, _ = db.DB.Exec(ctx, `
			UPDATE user_stats
			SET uploads_this_month = uploads_this_month + 1,
			    deduplication_savings = deduplication_savings + $1,
			    last_active = NOW()
			WHERE user_id = $2
		`, header.Size, userID)
		log.Printf("📊 User stats updated | user=%s | +duplicate", username)
	}

	// ✅ Response
	resp := map[string]interface{}{
		"message":   "File uploaded successfully",
		"fileName":  header.Filename,
		"size":      header.Size,
		"mimeType":  header.Header.Get("Content-Type"),
		"s3Key":     s3Key,
		"hash":      hash,
		"duplicate": isDuplicate,
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
		log.Println("❌ List files failed | missing username")
		http.Error(w, "username is required", http.StatusBadRequest)
		return
	}

	log.Printf("📂 List files | user=%s", username)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	rows, err := db.DB.Query(ctx, `
		SELECT uf.id, uf.filename, fb.size, fb.mime_type, uf.uploaded_at, fb.hash, fb.s3_key, fb.ref_count
		FROM user_files uf
		JOIN file_blobs fb ON uf.blob_id = fb.id
		JOIN users u ON uf.user_id = u.id
		WHERE u.email = $1
		ORDER BY uf.uploaded_at DESC
	`, username)
	if err != nil {
		log.Printf("❌ Failed to list files | user=%s | error=%v", username, err)
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
			uploadedAt time.Time
			hash       string
			s3Key      string
			refCount   int
		)
		if err := rows.Scan(&id, &filename, &size, &mimeType, &uploadedAt, &hash, &s3Key, &refCount); err == nil {
			files = append(files, map[string]interface{}{
				"id":         id,
				"fileName":   filename,
				"size":       size,
				"mimeType":   mimeType,
				"uploadDate": uploadedAt,
				"hash":       hash,
				"s3Key":      s3Key,
				"refCount":   refCount,
			})
		}
	}
	log.Printf("✅ Listed %d files | user=%s", len(files), username)

	_ = json.NewEncoder(w).Encode(files)
}

//
// 🔹 DownloadFile
//
func DownloadFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		log.Println("❌ Download failed | missing file key")
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	log.Printf("⬇️ Download request | key=%s", key)

	file, err := utils.DownloadFromS3(key)
	if err != nil {
		log.Printf("❌ Download failed | key=%s | error=%v", key, err)
		http.Error(w, "Download failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// system stats
	_, _ = db.DB.Exec(ctx, `
		UPDATE system_stats
		SET total_downloads = total_downloads + 1
		WHERE snapshot_date = CURRENT_DATE
	`)
	log.Printf("📊 System stats updated | +download")

	// user stats
	var userID int
	_ = db.DB.QueryRow(ctx, `
		SELECT u.id
		FROM user_files uf 
		JOIN users u ON uf.user_id = u.id 
		JOIN file_blobs fb ON uf.blob_id = fb.id
		WHERE fb.s3_key=$1 LIMIT 1
	`, key).Scan(&userID)

	if userID != 0 {
		_, _ = db.DB.Exec(ctx, `
			UPDATE user_stats
			SET downloads_this_month = downloads_this_month + 1,
			    last_active = NOW()
			WHERE user_id = $1
		`, userID)
		log.Printf("📊 User stats updated | user_id=%d | +download", userID)
	}

	w.Header().Set("Content-Disposition", "attachment; filename="+filepath.Base(key))
	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = io.Copy(w, file)
	log.Printf("✅ Download complete | key=%s", key)
}

//
// 🔹 DeleteFile
//
func DeleteFile(w http.ResponseWriter, r *http.Request) {
	key := r.URL.Query().Get("key")
	if key == "" {
		log.Println("❌ Delete failed | missing key")
		http.Error(w, "file key is required", http.StatusBadRequest)
		return
	}

	log.Printf("🗑️ Delete request | key=%s", key)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var blobID int
	var size int64
	var userID int

	err := db.DB.QueryRow(ctx, `
		SELECT fb.id, fb.size, COALESCE(u.id, 0) 
		FROM file_blobs fb
		LEFT JOIN user_files uf ON uf.blob_id = fb.id
		LEFT JOIN users u ON uf.user_id = u.id
		WHERE fb.s3_key=$1
		LIMIT 1
	`, key).Scan(&blobID, &size, &userID)

	if err != nil {
		log.Printf("❌ Delete failed | key=%s | error=%v", key, err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}

	// remove user reference
	_, _ = db.DB.Exec(ctx, `DELETE FROM user_files WHERE blob_id=$1 AND user_id=$2`, blobID, userID)
	log.Printf("✅ Deleted user reference | user_id=%d | blob_id=%d", userID, blobID)

	// decrement ref_count
	var refCount int
	_ = db.DB.QueryRow(ctx,
		`UPDATE file_blobs SET ref_count=ref_count-1 WHERE id=$1 RETURNING ref_count`,
		blobID,
	).Scan(&refCount)

	if refCount <= 0 {
		log.Printf("⚠️ No more references | blob_id=%d | deleting blob", blobID)
		_ = utils.DeleteFromS3(key)
		_, _ = db.DB.Exec(ctx, `DELETE FROM file_blobs WHERE id=$1`, blobID)
		log.Printf("✅ Blob deleted | blob_id=%d", blobID)
	}

	// 📊 stats update
	_, _ = db.DB.Exec(ctx, `
		UPDATE system_stats
		SET total_files = GREATEST(total_files - 1, 0),
		    total_storage = GREATEST(total_storage - $1, 0)
		WHERE snapshot_date = CURRENT_DATE
	`, size)
	log.Printf("📊 System stats updated | -file | -%d bytes", size)

	_, _ = db.DB.Exec(ctx, `
		UPDATE user_stats
		SET files_count = GREATEST(files_count - 1, 0),
		    storage_used = GREATEST(storage_used - $1, 0),
		    last_active = NOW()
		WHERE user_id = $2
	`, size, userID)
	log.Printf("📊 User stats updated | user_id=%d | -file | -%d bytes", userID, size)

	_ = json.NewEncoder(w).Encode(map[string]string{
		"message": "File deleted successfully",
	})
	log.Printf("✅ Delete complete | key=%s | user_id=%d", key, userID)
}
