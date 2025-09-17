package main

import (
	"log"
	"net/http"
	"os"

	"server/db"
	"server/handlers"
	"server/utils"

	ghandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load env vars
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ No .env file found")
	}

	// ✅ Connect to Postgres (RDS)
	if err := db.Connect(); err != nil {
		log.Fatal("❌ Failed to connect to DB:", err)
	}
	defer db.Close()

	// ✅ Initialize AWS S3
	utils.InitAWS()

	// Setup router
	r := mux.NewRouter()

	// File routes
	r.HandleFunc("/upload", handlers.UploadFile).Methods("POST")
	r.HandleFunc("/files", handlers.ListUserFiles).Methods("GET")
	r.HandleFunc("/download", handlers.DownloadFile).Methods("GET")
	r.HandleFunc("/delete", handlers.DeleteFile).Methods("DELETE")

	// ✅ Admin analytics routes
	r.HandleFunc("/admin/system-stats", handlers.GetSystemStats).Methods("GET")
	r.HandleFunc("/admin/user-stats", handlers.GetUserStats).Methods("GET") // hardcoded for now

	// CORS setup
	cors := ghandlers.CORS(
		ghandlers.AllowedOrigins([]string{"http://localhost:5173"}),
		ghandlers.AllowedMethods([]string{"GET", "POST", "DELETE"}),
		ghandlers.AllowedHeaders([]string{"Content-Type"}),
	)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	log.Println("🚀 Server running on port", port)
	log.Fatal(http.ListenAndServe(":"+port, cors(r)))
}
