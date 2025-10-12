import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { getJwtSecret } from '../constant';
import { Staff } from 'src/staff/entities/staff.entity';

export class JwtService {
  /**
   *
   */
  constructor() {}

  generateJwtToken = (staff: Staff): string => {
    // Get the JWT secret from environment variable and convert it to a buffer
    const secret = Buffer.from(getJwtSecret(), 'base64');
    // Create the payload for the JWT.
    // The payload contains the user's email, id, and name.
    const payload = {
      email: staff.baseUser.email.trim().toLowerCase(),
      id: staff.id,
      name: staff.baseUser.name,
    };
    // Sign the token with the payload, using the secret and set expiration time to 24 hours
    const token = jwt.sign(
      payload, // payload
      secret, // secret
      {
        expiresIn: 86400, // expires in 24 hours
      },
    );
    return token;
  };

  generateRefreshToken = async () => {
    const randomUUID = crypto.randomUUID();
    return await bcrypt.hash(randomUUID, 10);
  };

  /**
   * Authenticate the staff using a JWT token.
   * @param token - The JWT token provided by the staff.
   * @returns The decoded payload of the JWT token.
   */
  decodeJwtToken = (token: string): string | JwtPayload => {
    // Get the JWT secret from the environment variables and convert it to a buffer.
    const secret = Buffer.from(getJwtSecret(), 'base64');
    // Remove the 'Bearer ' prefix from the token and verify it using the secret.
    return jwt.verify(token.replace('Bearer ', ''), secret);
  };

  /**
   * Hashes a password using bcrypt.
   *
   * @param {string} password - The password to be hashed.
   * @returns {Promise<string>} A promise that resolves to the hashed password.
   */
  generateHashedPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, 10);
  };

  /**
   * Check if a plain text password matches a hashed password.
   * @param {string} password - The plain text password to check.
   * @param {string} hashedPassword - The hashed password to compare against.
   * @returns {Promise<boolean>} - A promise that resolves to true if the passwords match, false otherwise.
   */
  checkPasswordMatch = async (password: string, hashedPassword: string): Promise<boolean> => {
    // Use bcrypt.compare to compare the plain text password with the hashed password.
    return await bcrypt.compare(password, hashedPassword);
  };
}
