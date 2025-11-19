package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

// User represents a user in the system
type User struct {
	ID        uint64    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	Role      string    `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// UserService handles user operations
type UserService struct {
	users   map[uint64]*User
	nextID  uint64
	timeout time.Duration
}

// NewUserService creates a new user service
func NewUserService(timeout time.Duration) *UserService {
	return &UserService{
		users:   make(map[uint64]*User),
		nextID:  1,
		timeout: timeout,
	}
}

// CreateUser adds a new user to the service
func (s *UserService) CreateUser(ctx context.Context, name, email, role string) (*User, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	if name == "" || email == "" || role == "" {
		return nil, fmt.Errorf("name, email, and role are required")
	}

	user := &User{
		ID:        s.nextID,
		Name:      name,
		Email:     email,
		Role:      role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	s.users[s.nextID] = user
	s.nextID++

	log.Printf("Created user %d: %s <%s>", user.ID, user.Name, user.Email)
	return user, nil
}

// GetUser retrieves a user by ID
func (s *UserService) GetUser(ctx context.Context, id uint64) (*User, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	user, exists := s.users[id]
	if !exists {
		return nil, fmt.Errorf("user with id %d not found", id)
	}

	return user, nil
}

// ListUsers returns all users
func (s *UserService) ListUsers(ctx context.Context) ([]*User, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	users := make([]*User, 0, len(s.users))
	for _, user := range s.users {
		users = append(users, user)
	}

	return users, nil
}

// UserHandler handles HTTP requests for users
type UserHandler struct {
	service *UserService
}

// NewUserHandler creates a new user handler
func NewUserHandler(service *UserService) *UserHandler {
	return &UserHandler{service: service}
}

// CreateUserHandler handles POST /users
func (h *UserHandler) CreateUserHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), h.service.timeout)
	defer cancel()

	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
		Role  string `json:"role"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	user, err := h.service.CreateUser(ctx, req.Name, req.Email, req.Role)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// GetUserHandler handles GET /users/{id}
func (h *UserHandler) GetUserHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), h.service.timeout)
	defer cancel()

	vars := mux.Vars(r)
	idStr := vars["id"]
	
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	user, err := h.service.GetUser(ctx, id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// ListUsersHandler handles GET /users
func (h *UserHandler) ListUsersHandler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), h.service.timeout)
	defer cancel()

	users, err := h.service.ListUsers(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func main() {
	// Create service and handler
	service := NewUserService(5 * time.Second)
	handler := NewUserHandler(service)

	// Setup routes
	r := mux.NewRouter()
	r.HandleFunc("/users", handler.CreateUserHandler).Methods("POST")
	r.HandleFunc("/users/{id:[0-9]+}", handler.GetUserHandler).Methods("GET")
	r.HandleFunc("/users", handler.ListUsersHandler).Methods("GET")

	// Add some sample data
	ctx := context.Background()
	sampleUsers := []struct{ name, email, role string }{
		{"Alice Johnson", "alice@example.com", "admin"},
		{"Bob Smith", "bob@example.com", "user"},
		{"Carol Brown", "carol@example.com", "guest"},
	}

	for _, u := range sampleUsers {
		user, err := service.CreateUser(ctx, u.name, u.email, u.role)
		if err != nil {
			log.Printf("Error creating sample user: %v", err)
		} else {
			log.Printf("Sample user created: %+v", user)
		}
	}

	// Start server
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(port, r))
}