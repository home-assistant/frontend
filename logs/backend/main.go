package main

import (
	"bufio"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/exec"

	"github.com/gorilla/websocket"
)

type LogsResponse struct {
	Output string `json:"output"`
	Error  string `json:"error,omitempty"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins (CORS)
	},
}

func executeHACommand(args []string) (string, error) {
	cmd := exec.Command("ha", args...)
	output, err := cmd.CombinedOutput()
	return string(output), err
}

func streamHACommandToWS(conn *websocket.Conn, args []string) error {
	cmd := exec.Command("ha", args...)

	// Get stdout pipe
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	// Start command
	if err := cmd.Start(); err != nil {
		return err
	}

	// Read and send output line by line
	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			cmd.Process.Kill()
			return err
		}
	}

	// Wait for command to finish
	if err := cmd.Wait(); err != nil {
		return err
	}

	return scanner.Err()
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

func handleCoreLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to core logs follow")

	if err := streamHACommandToWS(conn, []string{"core", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming core logs: %v", err)
	}

	log.Println("Client disconnected from core logs follow")
}

func handleSupervisorLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to supervisor logs follow")

	if err := streamHACommandToWS(conn, []string{"supervisor", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming supervisor logs: %v", err)
	}

	log.Println("Client disconnected from supervisor logs follow")
}

func handleHostLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to host logs follow")

	if err := streamHACommandToWS(conn, []string{"host", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming host logs: %v", err)
	}

	log.Println("Client disconnected from host logs follow")
}

func handleAudioLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to audio logs follow")

	if err := streamHACommandToWS(conn, []string{"audio", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming audio logs: %v", err)
	}

	log.Println("Client disconnected from audio logs follow")
}

func handleDNSLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to dns logs follow")

	if err := streamHACommandToWS(conn, []string{"dns", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming dns logs: %v", err)
	}

	log.Println("Client disconnected from dns logs follow")
}

func handleMulticastLogsFollow(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected to multicast logs follow")

	if err := streamHACommandToWS(conn, []string{"multicast", "logs", "--follow"}); err != nil {
		log.Printf("Error streaming multicast logs: %v", err)
	}

	log.Println("Client disconnected from multicast logs follow")
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

	// WebSocket follow endpoints
	http.HandleFunc("/api/logs/core/follow", handleCoreLogsFollow)
	http.HandleFunc("/api/logs/supervisor/follow", handleSupervisorLogsFollow)
	http.HandleFunc("/api/logs/host/follow", handleHostLogsFollow)
	http.HandleFunc("/api/logs/audio/follow", handleAudioLogsFollow)
	http.HandleFunc("/api/logs/dns/follow", handleDNSLogsFollow)
	http.HandleFunc("/api/logs/multicast/follow", handleMulticastLogsFollow)

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
	log.Printf("  WS  /api/logs/*/follow - Stream logs (WebSocket)")
	log.Printf("  GET /health - Health check")

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
