package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"server/handlers"
)

func main() {
	// Load env vars
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found")
	}

	r := mux.NewRouter()

	// API routes
	r.HandleFunc("/upload", handlers.UploadFile).Methods("POST")
	r.HandleFunc("/files", handlers.ListUserFiles).Methods("GET")
	r.HandleFunc("/download", handlers.DownloadFile).Methods("GET")
	r.HandleFunc("/delete", handlers.DeleteFile).Methods("DELETE")

	// Enable CORS
	cors := handlers.CORS(
		handlers.AllowedOrigins([]string{"http://localhost:5173"}),
		handlers.AllowedMethods([]string{"GET", "POST", "DELETE"}),
		handlers.AllowedHeaders([]string{"Content-Type"}),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}
	log.Println("Server running on port", port)
	log.Fatal(http.ListenAndServe(":"+port, cors(r)))
}
