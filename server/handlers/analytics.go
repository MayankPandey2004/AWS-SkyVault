package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"server/db"
)

// Shape must match frontend expectations
type SystemStats struct {
	TotalUsers           int   `json:"totalUsers"`
	TotalFiles           int   `json:"totalFiles"`
	TotalStorage         int64 `json:"totalStorage"`
	UploadsToday         int   `json:"uploadsToday"`
	DownloadsToday       int   `json:"downloadsToday"`
	DeduplicationSavings int64 `json:"deduplicationSavings"`
}

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

// ✅ Returns system-wide stats from DB
func GetSystemStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT total_users, total_files, total_storage, total_uploads, total_downloads, deduplication_savings
		FROM system_stats
		ORDER BY snapshot_date DESC
		LIMIT 1
	`

	var stats SystemStats
	err := db.DB.QueryRow(ctx, query).Scan(
		&stats.TotalUsers,
		&stats.TotalFiles,
		&stats.TotalStorage,
		&stats.UploadsToday,
		&stats.DownloadsToday,
		&stats.DeduplicationSavings,
	)
	if err != nil {
		http.Error(w, "Failed to fetch system stats: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(stats)
}

// ✅ Admin endpoint: returns all users' stats
func GetAllUserStats(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT u.id, u.email, us.total_files, us.total_storage, u.last_active,
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

// ✅ User endpoint: returns stats for one user (queried by email)
func GetUserStats(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		http.Error(w, "email is required", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT u.id, u.email, us.total_files, us.total_storage, u.last_active,
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
		http.Error(w, "User stats not found: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}
