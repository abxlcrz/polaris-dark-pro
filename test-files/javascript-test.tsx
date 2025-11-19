// JavaScript/TypeScript Test File
import React, { useState, useEffect } from 'react';
import { ApiClient, UserData } from './types';

interface ComponentProps {
  user: UserData;
  onUpdate: (data: UserData) => void;
}

/**
 * A sample React component to test theme colors
 * @param props - Component properties
 */
const UserProfile: React.FC<ComponentProps> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Constants and numbers
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 5000;
  const API_VERSION = 'v2';
  
  useEffect(() => {
    async function fetchUserData() {
      try {
        setLoading(true);
        const response = await ApiClient.get(`/users/${user.id}`);
        
        if (response.status === 200) {
          onUpdate(response.data);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Failed to fetch user data:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUserData();
  }, [user.id, onUpdate]);
  
  const handleRetry = () => {
    setError(null);
    // Retry logic here
  };
  
  if (loading) return <div className="spinner">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  
  return (
    <div className="user-profile">
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
      <button onClick={handleRetry} disabled={loading}>
        Retry
      </button>
    </div>
  );
};

export default UserProfile;