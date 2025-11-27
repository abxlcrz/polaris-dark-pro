using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace InterlakenPro.Examples
{
    /// <summary>
    /// A comprehensive C# example class demonstrating various language features
    /// for testing the Interlaken Pro theme syntax highlighting
    /// </summary>
    public class UserService : IUserService
    {
        private readonly ILogger<UserService> _logger;
        private readonly Dictionary<int, User> _users;
        private static readonly string DefaultRole = "User";
        
        public event EventHandler<UserEventArgs>? UserCreated;
        
        public UserService(ILogger<UserService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _users = new Dictionary<int, User>();
        }

        // Properties with different access modifiers
        public int UserCount => _users.Count;
        private bool IsInitialized { get; set; } = false;
        protected virtual string ServiceName { get; } = "UserService";

        /// <summary>
        /// Creates a new user with validation
        /// </summary>
        /// <param name="name">User's full name</param>
        /// <param name="email">User's email address</param>
        /// <param name="age">User's age (must be 18 or older)</param>
        /// <returns>The created user or null if validation fails</returns>
        public async Task<User?> CreateUserAsync(string name, string email, int age)
        {
            try
            {
                // Input validation
                if (string.IsNullOrWhiteSpace(name))
                    throw new ArgumentException("Name cannot be empty", nameof(name));
                
                if (!IsValidEmail(email))
                {
                    _logger.LogWarning("Invalid email provided: {Email}", email);
                    return null;
                }

                if (age < 18)
                {
                    _logger.LogInformation("User must be 18 or older. Provided age: {Age}", age);
                    return null;
                }

                var user = new User
                {
                    Id = GenerateUserId(),
                    Name = name.Trim(),
                    Email = email.ToLowerInvariant(),
                    Age = age,
                    Role = DefaultRole,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    Preferences = new UserPreferences
                    {
                        Theme = "interlaken-pro-dark",
                        Language = "en-US",
                        Notifications = true
                    }
                };

                _users[user.Id] = user;
                
                // Simulate async operation
                await Task.Delay(10);
                
                // Fire event
                UserCreated?.Invoke(this, new UserEventArgs(user));
                
                _logger.LogInformation("User created successfully: {UserId} - {UserName}", 
                    user.Id, user.Name);
                
                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create user: {Name}", name);
                throw;
            }
        }

        public User? GetUser(int id) => _users.TryGetValue(id, out var user) ? user : null;

        public IEnumerable<User> GetActiveUsers() => 
            _users.Values.Where(u => u.IsActive).OrderBy(u => u.Name);

        public async Task<bool> UpdateUserAsync(int id, Action<User> updateAction)
        {
            if (!_users.TryGetValue(id, out var user))
                return false;

            updateAction(user);
            user.UpdatedAt = DateTime.UtcNow;
            
            await Task.CompletedTask;
            return true;
        }

        private bool IsValidEmail(string email)
        {
            const string pattern = @"^[^@\s]+@[^@\s]+\.[^@\s]+$";
            return System.Text.RegularExpressions.Regex.IsMatch(email, pattern);
        }

        private int GenerateUserId()
        {
            return _users.Count > 0 ? _users.Keys.Max() + 1 : 1;
        }

        // Extension method example
        public static class UserExtensions
        {
            public static string GetDisplayName(this User user) => 
                $"{user.Name} ({user.Email})";
                
            public static bool IsAdult(this User user) => user.Age >= 18;
        }
    }

    // Record type (C# 9.0+)
    public record User
    {
        public int Id { get; init; }
        public required string Name { get; init; }
        public required string Email { get; init; }
        public int Age { get; init; }
        public string Role { get; init; } = "User";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; init; }
        public DateTime? UpdatedAt { get; set; }
        public UserPreferences? Preferences { get; set; }
    }

    // Nested class
    public class UserPreferences
    {
        public string Theme { get; set; } = "default";
        public string Language { get; set; } = "en-US";
        public bool Notifications { get; set; } = true;
        public List<string> FavoriteColors { get; set; } = new();
    }

    // Interface
    public interface IUserService
    {
        Task<User?> CreateUserAsync(string name, string email, int age);
        User? GetUser(int id);
        IEnumerable<User> GetActiveUsers();
    }

    // Event args
    public class UserEventArgs : EventArgs
    {
        public User User { get; }
        
        public UserEventArgs(User user)
        {
            User = user;
        }
    }

    // Enum with different syntax patterns
    public enum UserRole
    {
        Guest = 0,
        User = 1,
        Moderator = 2,
        Admin = 3
    }

    // Abstract class
    public abstract class BaseService
    {
        protected readonly ILogger Logger;
        
        protected BaseService(ILogger logger)
        {
            Logger = logger;
        }
        
        public abstract Task InitializeAsync();
        
        protected virtual void Log(string message) => Logger.LogInformation(message);
    }

    // Generic class with constraints
    public class Repository<T> where T : class, new()
    {
        private readonly List<T> _items = new();
        
        public void Add(T item) => _items.Add(item);
        public T? Find(Predicate<T> predicate) => _items.Find(predicate);
        public IEnumerable<T> GetAll() => _items.AsReadOnly();
    }

    // Struct
    public readonly struct Point
    {
        public readonly int X;
        public readonly int Y;
        
        public Point(int x, int y)
        {
            X = x;
            Y = y;
        }
        
        public override string ToString() => $"({X}, {Y})";
    }
}
