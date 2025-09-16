package main

import (
	"log"
	"net/http"
	"os"

	"server/handlers"
	"server/utils"

	ghandlers "github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load env vars
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️ No .env file found")
	}

	// Initialize AWS after env vars are loaded
	utils.InitAWS()

	r := mux.NewRouter()

	r.HandleFunc("/upload", handlers.UploadFile).Methods("POST")
	r.HandleFunc("/files", handlers.ListUserFiles).Methods("GET")
	r.HandleFunc("/download", handlers.DownloadFile).Methods("GET")
	r.HandleFunc("/delete", handlers.DeleteFile).Methods("DELETE")
	

	cors := ghandlers.CORS(
		ghandlers.AllowedOrigins([]string{"http://localhost:5173"}),
		ghandlers.AllowedMethods([]string{"GET", "POST", "DELETE"}),
		ghandlers.AllowedHeaders([]string{"Content-Type"}),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	log.Println("🚀 Server running on port", port)
	log.Fatal(http.ListenAndServe(":"+port, cors(r)))
}
