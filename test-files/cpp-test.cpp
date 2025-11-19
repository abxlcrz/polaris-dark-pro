#include <iostream>
#include <vector>
#include <memory>
#include <string>
#include <map>
#include <algorithm>
#include <thread>
#include <mutex>
#include <future>
#include <chrono>

namespace UserManagement {

// Forward declarations
class User;
class UserRepository;

// Enums and constants
enum class UserRole {
    ADMIN,
    USER,
    GUEST
};

enum class UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED
};

constexpr int MAX_USERS = 1000;
constexpr double DEFAULT_TIMEOUT = 30.0;
const std::string API_VERSION = "v2.1.0";

/**
 * User class representing a system user
 */
class User {
private:
    uint64_t id_;
    std::string name_;
    std::string email_;
    UserRole role_;
    UserStatus status_;
    std::chrono::system_clock::time_point created_at_;
    mutable std::mutex mutex_;

public:
    // Constructor with member initializer list
    User(uint64_t id, const std::string& name, const std::string& email, UserRole role)
        : id_(id), name_(name), email_(email), role_(role), 
          status_(UserStatus::ACTIVE), created_at_(std::chrono::system_clock::now()) {}
    
    // Copy constructor
    User(const User& other) 
        : id_(other.id_), name_(other.name_), email_(other.email_),
          role_(other.role_), status_(other.status_), created_at_(other.created_at_) {}
    
    // Move constructor
    User(User&& other) noexcept
        : id_(other.id_), name_(std::move(other.name_)), email_(std::move(other.email_)),
          role_(other.role_), status_(other.status_), created_at_(other.created_at_) {}
    
    // Destructor
    virtual ~User() = default;
    
    // Assignment operators
    User& operator=(const User& other) {
        if (this != &other) {
            std::lock_guard<std::mutex> lock(mutex_);
            id_ = other.id_;
            name_ = other.name_;
            email_ = other.email_;
            role_ = other.role_;
            status_ = other.status_;
            created_at_ = other.created_at_;
        }
        return *this;
    }
    
    User& operator=(User&& other) noexcept {
        if (this != &other) {
            std::lock_guard<std::mutex> lock(mutex_);
            id_ = other.id_;
            name_ = std::move(other.name_);
            email_ = std::move(other.email_);
            role_ = other.role_;
            status_ = other.status_;
            created_at_ = other.created_at_;
        }
        return *this;
    }
    
    // Getters
    uint64_t getId() const { return id_; }
    const std::string& getName() const { return name_; }
    const std::string& getEmail() const { return email_; }
    UserRole getRole() const { return role_; }
    UserStatus getStatus() const { return status_; }
    
    // Setters
    void setName(const std::string& name) {
        std::lock_guard<std::mutex> lock(mutex_);
        name_ = name;
    }
    
    void setEmail(const std::string& email) {
        std::lock_guard<std::mutex> lock(mutex_);
        email_ = email;
    }
    
    void setStatus(UserStatus status) {
        std::lock_guard<std::mutex> lock(mutex_);
        status_ = status;
    }
    
    // Utility methods
    bool isActive() const {
        return status_ == UserStatus::ACTIVE;
    }
    
    std::string toString() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return "User{id=" + std::to_string(id_) + 
               ", name='" + name_ + 
               "', email='" + email_ + 
               "', role=" + std::to_string(static_cast<int>(role_)) + "}";
    }
    
    // Operator overloading
    bool operator==(const User& other) const {
        return id_ == other.id_;
    }
    
    bool operator<(const User& other) const {
        return id_ < other.id_;
    }
    
    friend std::ostream& operator<<(std::ostream& os, const User& user) {
        os << user.toString();
        return os;
    }
};

/**
 * Template class for managing collections of users
 */
template<typename T>
class UserCollection {
private:
    std::vector<T> users_;
    mutable std::shared_mutex mutex_;
    
public:
    using iterator = typename std::vector<T>::iterator;
    using const_iterator = typename std::vector<T>::const_iterator;
    
    // Add user to collection
    void addUser(const T& user) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        users_.push_back(user);
    }
    
    void addUser(T&& user) {
        std::unique_lock<std::shared_mutex> lock(mutex_);
        users_.emplace_back(std::move(user));
    }
    
    // Find user by predicate
    template<typename Predicate>
    std::optional<T> findUser(Predicate pred) const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        auto it = std::find_if(users_.begin(), users_.end(), pred);
        if (it != users_.end()) {
            return *it;
        }
        return std::nullopt;
    }
    
    // Get all users matching a condition
    template<typename Predicate>
    std::vector<T> filterUsers(Predicate pred) const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        std::vector<T> result;
        std::copy_if(users_.begin(), users_.end(), 
                     std::back_inserter(result), pred);
        return result;
    }
    
    // Iterators
    iterator begin() { return users_.begin(); }
    iterator end() { return users_.end(); }
    const_iterator begin() const { return users_.begin(); }
    const_iterator end() const { return users_.end(); }
    const_iterator cbegin() const { return users_.cbegin(); }
    const_iterator cend() const { return users_.cend(); }
    
    size_t size() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return users_.size();
    }
    
    bool empty() const {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        return users_.empty();
    }
};

/**
 * UserManager class with async operations
 */
class UserManager {
private:
    UserCollection<User> users_;
    std::atomic<uint64_t> next_id_{1};
    std::map<std::string, std::string> config_;
    
public:
    explicit UserManager(const std::map<std::string, std::string>& config = {}) 
        : config_(config) {}
    
    // Async user creation
    std::future<std::unique_ptr<User>> createUserAsync(
        const std::string& name, 
        const std::string& email, 
        UserRole role = UserRole::USER) {
        
        return std::async(std::launch::async, [this, name, email, role]() -> std::unique_ptr<User> {
            // Simulate some async work
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            
            uint64_t id = next_id_.fetch_add(1);
            auto user = std::make_unique<User>(id, name, email, role);
            
            users_.addUser(*user);
            
            std::cout << "Created user: " << *user << std::endl;
            return user;
        });
    }
    
    // Find user by ID
    std::optional<User> findUserById(uint64_t id) const {
        return users_.findUser([id](const User& user) {
            return user.getId() == id;
        });
    }
    
    // Find users by role
    std::vector<User> getUsersByRole(UserRole role) const {
        return users_.filterUsers([role](const User& user) {
            return user.getRole() == role;
        });
    }
    
    // Get active users
    std::vector<User> getActiveUsers() const {
        return users_.filterUsers([](const User& user) {
            return user.isActive();
        });
    }
    
    // Statistics
    struct UserStats {
        size_t total_users;
        size_t active_users;
        size_t admin_users;
        double avg_users_per_day;
    };
    
    UserStats getStatistics() const {
        auto active = getActiveUsers();
        auto admins = getUsersByRole(UserRole::ADMIN);
        
        return UserStats{
            .total_users = users_.size(),
            .active_users = active.size(),
            .admin_users = admins.size(),
            .avg_users_per_day = static_cast<double>(users_.size()) / 30.0
        };
    }
    
    void printStatistics() const {
        auto stats = getStatistics();
        std::cout << "=== User Statistics ===" << std::endl;
        std::cout << "Total Users: " << stats.total_users << std::endl;
        std::cout << "Active Users: " << stats.active_users << std::endl;
        std::cout << "Admin Users: " << stats.admin_users << std::endl;
        std::cout << "Avg Users/Day: " << std::fixed << std::setprecision(2) 
                  << stats.avg_users_per_day << std::endl;
    }
};

} // namespace UserManagement

// Main function demonstrating usage
int main() try {
    using namespace UserManagement;
    
    // Configuration
    std::map<std::string, std::string> config = {
        {"timeout", "30"},
        {"max_connections", "100"},
        {"debug", "true"}
    };
    
    UserManager manager(config);
    
    // Create users asynchronously
    std::vector<std::future<std::unique_ptr<User>>> futures;
    
    struct UserData {
        std::string name;
        std::string email;
        UserRole role;
    };
    
    std::vector<UserData> userData = {
        {"Alice Johnson", "alice@example.com", UserRole::ADMIN},
        {"Bob Smith", "bob@example.com", UserRole::USER},
        {"Carol Brown", "carol@example.com", UserRole::USER},
        {"David Wilson", "david@example.com", UserRole::GUEST},
        {"Eve Davis", "eve@example.com", UserRole::USER}
    };
    
    // Launch async operations
    for (const auto& data : userData) {
        futures.push_back(manager.createUserAsync(data.name, data.email, data.role));
    }
    
    // Wait for all operations to complete
    std::vector<std::unique_ptr<User>> createdUsers;
    for (auto& future : futures) {
        try {
            createdUsers.push_back(future.get());
        } catch (const std::exception& e) {
            std::cerr << "Error creating user: " << e.what() << std::endl;
        }
    }
    
    // Print statistics
    manager.printStatistics();
    
    // Find and display admin users
    auto admins = manager.getUsersByRole(UserRole::ADMIN);
    std::cout << "\nAdmin Users:" << std::endl;
    for (const auto& admin : admins) {
        std::cout << "  " << admin << std::endl;
    }
    
    // Test finding specific user
    auto user = manager.findUserById(1);
    if (user) {
        std::cout << "\nFound user with ID 1: " << *user << std::endl;
    } else {
        std::cout << "\nUser with ID 1 not found" << std::endl;
    }
    
    return 0;
    
} catch (const std::exception& e) {
    std::cerr << "Fatal error: " << e.what() << std::endl;
    return 1;
} catch (...) {
    std::cerr << "Unknown fatal error occurred" << std::endl;
    return 1;
}