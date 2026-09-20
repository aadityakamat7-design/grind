// Server-side password strength validation — mirrors the client-side checks
// in Register.jsx and ResetPassword.jsx so a weak password is rejected
// regardless of how the request arrives (direct API bypass included).
//
// The platform's own register/reset endpoints only enforce a minimum of 8
// characters with no complexity or common-password checks. This module
// closes that gap for requests that go through our secureAuth backend function.

const COMMON_PASSWORDS = [
  "password", "12345678", "123456789", "qwerty123", "abc123456",
  "password123", "iloveyou", "admin123", "welcome1", "letmein1",
  "1234567890", "00000000", "11111111", "88888888", "sunshine",
  "princess", "football", "charlie", "shadow", "michael",
];

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 10) {
    return { valid: false, error: "Password must be at least 10 characters long." };
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    return { valid: false, error: "That password is too common. Please choose a stronger one." };
  }
  return { valid: true };
}