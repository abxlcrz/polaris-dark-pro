// Template Literal Interpolation Test
const userName = 'Alice';
const age = 30;
const isActive = true;

// Basic template literals with interpolation
const greeting = `Hello, ${userName}! You are ${age} years old.`;
const status = `User status: ${isActive ? 'Active' : 'Inactive'}`;

// Complex interpolation with expressions
const complexMessage = `
  Welcome ${userName.toUpperCase()}!
  Your account details:
  - Age: ${age}
  - Status: ${isActive ? '✅ Active' : '❌ Inactive'}  
  - Category: ${age >= 18 ? 'Adult' : 'Minor'}
  - Next birthday: ${new Date().getFullYear() + 1}
`;

// Nested template literals
const nested = `Outer: ${`Inner: ${userName}`}`;

// Template literals in function calls
console.log(`User ${userName} (${age}) is ${isActive ? 'online' : 'offline'}`);

// Template literals with method calls and calculations
const summary = `
  Statistics for ${userName}:
  - Account created: ${new Date(2023, 0, 1).toDateString()}
  - Days active: ${Math.floor(Math.random() * 365)}
  - Score: ${(age * 10 + (isActive ? 100 : 0)).toFixed(2)}
`;

// Template literals in object properties
const userInfo = {
  displayName: `${userName} (Age: ${age})`,
  welcomeMessage: `Welcome back, ${userName}!`,
  debugInfo: `User: ${JSON.stringify({userName, age, isActive})}`
};

// Template literals in array
const messages = [
  `Hello ${userName}`,
  `Age: ${age}`,
  `Status: ${isActive}`
];

// Template literals with conditional expressions
const conditionalMessage = `
  ${userName ? `Hello ${userName}` : 'Hello Guest'},
  ${age >= 21 ? `You can access premium features` : `Premium access in ${21 - age} years`}
`;

export { greeting, status, complexMessage, userInfo };