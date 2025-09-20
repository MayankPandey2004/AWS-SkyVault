package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
	"log"

	"server/db"
)

// ✅ Matches system_stats schema
type SystemStats struct {
	TotalUsers           int   `json:"totalUsers"`
	TotalFiles           int   `json:"totalFiles"`
	TotalStorage         int64 `json:"totalStorage"`
	TotalUploads         int   `json:"totalUploads"`
	TotalDownloads       int   `json:"totalDownloads"`
	DeduplicationSavings int64 `json:"deduplicationSavings"`
}

// ✅ Matches user_stats schema
type UserStats struct {
	ID                 int       `json:"id"`
	Email              string    `json:"email"`
	FilesCount         int       `json:"filesCount"`
	StorageUsed        int64     `json:"storageUsed"`
	LastActive         time.Time `json:"lastActive"`
	UploadsThisMonth   int       `json:"uploadsThisMonth"`
	DownloadsThisMonth int       `json:"downloadsThisMonth"`
	DeduplicationSaved int64     `json:"deduplicationSavings"`
}

//
// 🔹 System-wide stats
//
func GetSystemStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT total_users, total_files, total_storage,
		       total_uploads, total_downloads, deduplication_savings
		FROM system_stats
		ORDER BY snapshot_date DESC
		LIMIT 1
	`

	var stats SystemStats
	err := db.DB.QueryRow(ctx, query).Scan(
		&stats.TotalUsers,
		&stats.TotalFiles,
		&stats.TotalStorage,
		&stats.TotalUploads,
		&stats.TotalDownloads,
		&stats.DeduplicationSavings,
	)
	if err != nil {
		http.Error(w, "Failed to fetch system stats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stats)
}

//
// 🔹 Admin endpoint: all users' stats
//
func GetAllUserStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT u.id, u.email,
		       us.files_count, us.storage_used, us.last_active,
		       us.uploads_this_month, us.downloads_this_month, us.deduplication_savings
		FROM users u
		JOIN user_stats us ON u.id = us.user_id
		ORDER BY u.id ASC
	`

	rows, err := db.DB.Query(ctx, query)
	if err != nil {
		http.Error(w, "Failed to fetch user stats: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var users []UserStats
	for rows.Next() {
		var u UserStats
		if err := rows.Scan(
			&u.ID,
			&u.Email,
			&u.FilesCount,
			&u.StorageUsed,
			&u.LastActive,
			&u.UploadsThisMonth,
			&u.DownloadsThisMonth,
			&u.DeduplicationSaved,
		); err == nil {
			users = append(users, u)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(users)
}

//
// 🔹 Per-user stats (queried by email)
//
func GetUserStats(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		log.Println("❌ GetUserStats failed | missing email param")
		http.Error(w, "email is required", http.StatusBadRequest)
		return
	}

	log.Printf("📩 GetUserStats request | email=%s", email)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT u.id, u.email,
		       us.files_count, us.storage_used, us.last_active,
		       us.uploads_this_month, us.downloads_this_month, us.deduplication_savings
		FROM users u
		JOIN user_stats us ON u.id = us.user_id
		WHERE u.email = $1
	`

	var u UserStats
	err := db.DB.QueryRow(ctx, query, email).Scan(
		&u.ID,
		&u.Email,
		&u.FilesCount,
		&u.StorageUsed,
		&u.LastActive,
		&u.UploadsThisMonth,
		&u.DownloadsThisMonth,
		&u.DeduplicationSaved,
	)
	if err != nil {
		log.Printf("❌ GetUserStats DB error | email=%s | query failed: %v", email, err)
		http.Error(w, "User stats not found: "+err.Error(), http.StatusNotFound)
		return
	}

	log.Printf("✅ GetUserStats success | email=%s | files=%d | storage=%d bytes",
		u.Email, u.FilesCount, u.StorageUsed)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(u); err != nil {
		log.Printf("❌ GetUserStats encode error | email=%s | %v", email, err)
	}
}


// GetUserFileDetails returns all files of a user with blob + dedup info
func GetUserFileDetails(w http.ResponseWriter, r *http.Request) {
    username := r.URL.Query().Get("username")
    if username == "" {
        log.Println("❌ GetUserFileDetails failed | missing username")
        http.Error(w, "username is required", http.StatusBadRequest)
        return
    }

    log.Printf("📂 Fetching all file details | user=%s", username)

    ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
    defer cancel()

    rows, err := db.DB.Query(ctx, `
        SELECT 
            uf.id,
            uf.filename,
            fb.size,
            fb.hash,
            uf.uploaded_at,
            u.email,
            fb.ref_count,
            CASE WHEN fb.ref_count > 1 THEN true ELSE false END AS is_dedup
        FROM user_files uf
        JOIN file_blobs fb ON uf.blob_id = fb.id
        JOIN users u ON uf.user_id = u.id
        WHERE u.email = $1
        ORDER BY uf.uploaded_at DESC
    `, username)
    if err != nil {
        log.Printf("❌ Failed to fetch file details | user=%s | error=%v", username, err)
        http.Error(w, "Unable to fetch file details", http.StatusInternalServerError)
        return
    }
    defer rows.Close()

    var files []map[string]interface{}
    for rows.Next() {
        var (
            id        int
            filename  string
            size      int64
            hash      string
            uploaded  time.Time
            uploader  string
            refCount  int
            isDedup   bool
        )
        if err := rows.Scan(&id, &filename, &size, &hash, &uploaded, &uploader, &refCount, &isDedup); err == nil {
            files = append(files, map[string]interface{}{
                "id":            id,
                "name":          filename,
                "size":          size,
                "hash":          hash,
                "uploadDate":    uploaded,
                "uploader":      uploader,
                "refCount":      refCount,
                "isDeduplicated": isDedup,
                "savings":       func() int64 {
                    if refCount > 1 {
                        return size
                    }
                    return 0
                }(),
            })
        }
    }

    log.Printf("✅ Returned %d files | user=%s", len(files), username)
    w.Header().Set("Content-Type", "application/json")
    _ = json.NewEncoder(w).Encode(files)
}
