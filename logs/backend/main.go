package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"
)

type LogsResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

func executeHACommand(args []string) (string, error) {
	cmd := exec.Command("ha", args...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func handleCoreLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Execute ha core logs command
	output, err := executeHACommand([]string{"core", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func handleSupervisorLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	output, err := executeHACommand([]string{"supervisor", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	json.NewEncoder(w).Encode(response)
}

func handleHostLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	output, err := executeHACommand([]string{"host", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	json.NewEncoder(w).Encode(response)
}

func handleAudioLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	output, err := executeHACommand([]string{"audio", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	json.NewEncoder(w).Encode(response)
}

func handleDNSLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	output, err := executeHACommand([]string{"dns", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	json.NewEncoder(w).Encode(response)
}

func handleMulticastLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	output, err := executeHACommand([]string{"multicast", "logs"})

	response := LogsResponse{
		Output: output,
	}

	if err != nil {
		response.Error = err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET")

	json.NewEncoder(w).Encode(response)
}

func listEndpoints(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	endpoints := map[string]string{
		"core":       "/api/logs/core",
		"supervisor": "/api/logs/supervisor",
		"host":       "/api/logs/host",
		"audio":      "/api/logs/audio",
		"dns":        "/api/logs/dns",
		"multicast":  "/api/logs/multicast",
		"health":     "/health",
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(endpoints)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5642"
	}

	// Register handlers
	http.HandleFunc("/api/logs", listEndpoints)
	http.HandleFunc("/api/logs/core", handleCoreLogs)
	http.HandleFunc("/api/logs/supervisor", handleSupervisorLogs)
	http.HandleFunc("/api/logs/host", handleHostLogs)
	http.HandleFunc("/api/logs/audio", handleAudioLogs)
	http.HandleFunc("/api/logs/dns", handleDNSLogs)
	http.HandleFunc("/api/logs/multicast", handleMulticastLogs)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	log.Printf("Starting HA Logs Proxy on port %s", port)
	log.Printf("Available endpoints:")
	log.Printf("  GET /api/logs - List all endpoints")
	log.Printf("  GET /api/logs/core - Core logs")
	log.Printf("  GET /api/logs/supervisor - Supervisor logs")
	log.Printf("  GET /api/logs/host - Host logs")
	log.Printf("  GET /api/logs/audio - Audio logs")
	log.Printf("  GET /api/logs/dns - DNS logs")
	log.Printf("  GET /api/logs/multicast - Multicast logs")
	log.Printf("  GET /health - Health check")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
