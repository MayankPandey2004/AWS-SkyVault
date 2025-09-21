package main

import (
	"log"

	"server/db"
	"server/handlers"
	"server/utils"

	ghandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"

	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	"github.com/aws/aws-lambda-go/lambda"
)

func main() {
	// Load env vars
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️ No .env file found")
	}

	// ✅ Connect to Postgres
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
	r.HandleFunc("/admin/user-stats", handlers.GetUserStats).Methods("GET")
	r.HandleFunc("/admin/file-details", handlers.GetUserFileDetails).Methods("GET")

	// CORS setup
	cors := ghandlers.CORS(
		ghandlers.AllowedOrigins([]string{"*"}),
		ghandlers.AllowedMethods([]string{"GET", "POST", "DELETE", "OPTIONS"}),
		ghandlers.AllowedHeaders([]string{"*"}),
	)

	// ✅ Wrap router in Lambda adapter (instead of ListenAndServe)
	adapter := httpadapter.New(cors(r))
	lambda.Start(adapter.ProxyWithContext)
}
