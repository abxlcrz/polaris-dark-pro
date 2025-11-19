# Python Test File
import asyncio
import json
from typing import Dict, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum

class Status(Enum):
    """User status enumeration"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

@dataclass
class UserConfig:
    """Configuration for user management"""
    max_retries: int = 3
    timeout_seconds: float = 30.0
    allowed_roles: List[str] = field(default_factory=list)
    metadata: Dict[str, Union[str, int, bool]] = field(default_factory=dict)

class UserManager:
    """Manages user operations and data"""
    
    def __init__(self, config: UserConfig):
        self.config = config
        self._users: Dict[str, dict] = {}
        self.logger = self._setup_logger()
    
    def _setup_logger(self):
        import logging
        logger = logging.getLogger(__name__)
        logger.setLevel(logging.INFO)
        return logger
    
    @property
    def user_count(self) -> int:
        """Get total number of users"""
        return len(self._users)
    
    async def create_user(self, user_data: dict) -> Optional[str]:
        """
        Create a new user
        
        Args:
            user_data: Dictionary containing user information
            
        Returns:
            User ID if successful, None otherwise
        """
        try:
            # Validation
            required_fields = ['name', 'email', 'role']
            missing_fields = [f for f in required_fields if f not in user_data]
            
            if missing_fields:
                raise ValueError(f"Missing required fields: {', '.join(missing_fields)}")
            
            # Generate user ID
            user_id = f"user_{len(self._users) + 1:04d}"
            
            # Create user record
            user_record = {
                'id': user_id,
                'name': user_data['name'],
                'email': user_data['email'],
                'role': user_data['role'],
                'status': Status.ACTIVE.value,
                'created_at': asyncio.get_event_loop().time(),
                'login_count': 0
            }
            
            # Store user
            self._users[user_id] = user_record
            self.logger.info(f"Created user {user_id}: {user_data['name']}")
            
            return user_id
            
        except Exception as e:
            self.logger.error(f"Failed to create user: {e}")
            return None
    
    def get_user_stats(self) -> Dict[str, int]:
        """Get user statistics"""
        stats = {
            'total': len(self._users),
            'active': 0,
            'inactive': 0,
            'suspended': 0
        }
        
        for user in self._users.values():
            status = user.get('status', Status.INACTIVE.value)
            if status in stats:
                stats[status] += 1
        
        return stats
    
    def __repr__(self) -> str:
        return f"UserManager(users={self.user_count}, config={self.config})"

# Usage example
if __name__ == "__main__":
    config = UserConfig(
        max_retries=5,
        timeout_seconds=60.0,
        allowed_roles=['admin', 'user', 'guest'],
        metadata={'version': '1.0', 'debug': True}
    )
    
    manager = UserManager(config)
    
    # Test data
    test_users = [
        {'name': 'Alice Johnson', 'email': 'alice@example.com', 'role': 'admin'},
        {'name': 'Bob Smith', 'email': 'bob@example.com', 'role': 'user'},
        {'name': 'Carol Brown', 'email': 'carol@example.com', 'role': 'guest'}
    ]
    
    async def main():
        """Main execution function"""
        for user_data in test_users:
            user_id = await manager.create_user(user_data)
            if user_id:
                print(f"✅ Created user: {user_id}")
            else:
                print(f"❌ Failed to create user: {user_data['name']}")
        
        # Print statistics
        stats = manager.get_user_stats()
        print(f"\nUser Statistics: {json.dumps(stats, indent=2)}")
        print(f"Manager Info: {manager}")
    
    # Run the example
    asyncio.run(main())