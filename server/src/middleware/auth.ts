import type { Request, Response, NextFunction } from 'express';
import { getAuth, clerkClient } from '@clerk/express';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export interface AuthUser {
  id: string; // Curify PostgreSQL user UUID
  clerkUserId: string; // Clerk user ID (e.g. user_2...)
  email: string;
  role: 'patient' | 'lender' | 'admin';
  firstName: string;
  lastName: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Synchronize or retrieve Curify PostgreSQL user from Clerk authentication state
 */
async function resolveCurifyUser(clerkUserId: string, authReq: Request): Promise<AuthUser | null> {
  // 1. Check if user already exists in PostgreSQL by clerk_user_id
  const result = await query(
    `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE clerk_user_id = $1 LIMIT 1;`,
    [clerkUserId]
  );

  if (result.rowCount && result.rowCount > 0) {
    const row = result.rows[0];
    return {
      id: row.id,
      clerkUserId: row.clerk_user_id,
      email: row.email,
      role: row.role as 'patient' | 'lender',
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone || undefined,
    };
  }

  // 2. Not found by clerk_user_id — attempt to fetch Clerk user details to auto-provision
  try {
    let email = '';
    let firstName = 'User';
    let lastName = '';
    let role: 'patient' | 'lender' = 'patient';
    let phone: string | undefined = undefined;
    let onboardingCompleted = false;

    // Check if Clerk client can retrieve user details
    try {
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      firstName = clerkUser.firstName || 'User';
      lastName = clerkUser.lastName || '';
      phone = clerkUser.phoneNumbers?.[0]?.phoneNumber;
      
      // Check publicMetadata first, then unsafeMetadata for role and onboarding status
      const metaRole = (clerkUser.publicMetadata as any)?.role || (clerkUser.unsafeMetadata as any)?.role;
      if (metaRole === 'lender') {
        role = 'lender';
      }
      if ((clerkUser.publicMetadata as any)?.onboardingCompleted || (clerkUser.unsafeMetadata as any)?.onboardingCompleted) {
        onboardingCompleted = true;
      }

      // If role was in unsafeMetadata but not publicMetadata, sync it to publicMetadata
      if ((clerkUser.unsafeMetadata as any)?.role && !(clerkUser.publicMetadata as any)?.role) {
        try {
          await clerkClient.users.updateUser(clerkUserId, {
            publicMetadata: { role: metaRole || 'patient' },
          });
        } catch {
          // Non-critical — continue
        }
      }
    } catch {
      // If clerkClient.users.getUser fails (e.g. key permissions), check sessionClaims
      const auth = getAuth(authReq);
      const claims = (auth as any)?.sessionClaims;
      if (claims?.email) email = claims.email;
      if (claims?.first_name) firstName = claims.first_name;
      if (claims?.last_name) lastName = claims.last_name;
      if (claims?.public_metadata?.role === 'lender') role = 'lender';
    }

    if (!email) {
      email = `${clerkUserId}@clerk.curify.internal`;
    }

    // Check if an existing legacy user has this email (e.g. migration from seed/pre-Clerk)
    const existingByEmail = await query(
      `SELECT id, role, first_name, last_name, phone FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
      [email]
    );

    if (existingByEmail.rowCount && existingByEmail.rowCount > 0) {
      // Link existing user to this clerk_user_id
      const existing = existingByEmail.rows[0];
      await query(
        `UPDATE users SET clerk_user_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`,
        [clerkUserId, existing.id]
      );
      return {
        id: existing.id,
        clerkUserId,
        email,
        role: existing.role as 'patient' | 'lender',
        firstName: existing.first_name,
        lastName: existing.last_name,
        phone: existing.phone || undefined,
      };
    }

    // 3. Create fresh Curify user in PostgreSQL
    const newUserId = randomUUID();
    await query(
      `INSERT INTO users (id, clerk_user_id, email, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [newUserId, clerkUserId, email.toLowerCase(), role, firstName, lastName, phone || null]
    );

    // Create corresponding profile
    if (role === 'patient') {
      await query(
        `INSERT INTO patient_profiles (id, user_id, city, state, onboarding_completed, onboarding_step, profile_completion_percentage)
         VALUES ($1, $2, 'Ahmedabad', 'Gujarat', $3, 1, 20);`,
        [randomUUID(), newUserId, onboardingCompleted]
      );
    } else {
      await query(
        `INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
         VALUES ($1, $2, 'Curify Health Finance', 'Credit Underwriter', $3);`,
        [randomUUID(), newUserId, `LND-${Math.floor(1000 + Math.random() * 9000)}`]
      );
    }

    return {
      id: newUserId,
      clerkUserId,
      email,
      role,
      firstName,
      lastName,
      phone,
    };
  } catch (err) {
    console.error('[Auth Middleware] Failed to resolve or create Curify user from Clerk ID:', err);
    return null;
  }
}

/**
 * Require valid Clerk authentication on API requests
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      // Check for JWT token in Authorization header, cookies, or query parameter (e.g. for SSE EventSource)
      let token = req.cookies?.token;
      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (!token && typeof req.query.token === 'string') {
        token = req.query.token;
      }

      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as any;
          if (decoded?.id) {
            const userRes = await query(
              `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE id = $1 LIMIT 1;`,
              [decoded.id]
            );
            if (userRes.rowCount && userRes.rowCount > 0) {
              const row = userRes.rows[0];
              req.user = {
                id: row.id,
                clerkUserId: row.clerk_user_id || 'jwt_user',
                email: row.email,
                role: row.role as 'patient' | 'lender',
                firstName: row.first_name,
                lastName: row.last_name,
                phone: row.phone || undefined,
              };
              return next();
            }
          }
        } catch {
          // Token invalid or expired — proceed to demo fallback
        }
      }

      // Check for development demo fallback header or query param — LENDER ONLY
      const demoRole = (req.headers['x-demo-role'] || req.query.demo_role);
      if (demoRole === 'lender') {
        const demoUserRes = await query(
          `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE role = 'lender' ORDER BY created_at ASC LIMIT 1;`,
          []
        );
        if (demoUserRes.rowCount && demoUserRes.rowCount > 0) {
          const u = demoUserRes.rows[0];
          req.user = {
            id: u.id,
            clerkUserId: u.clerk_user_id || 'demo_clerk_user',
            email: u.email,
            role: u.role as 'lender',
            firstName: u.first_name,
            lastName: u.last_name,
            phone: u.phone || undefined,
          };
          return next();
        }
      }

      res.status(401).json({ success: false, message: 'Authentication required. Please sign in with Clerk.' });
      return;
    }

    const curifyUser = await resolveCurifyUser(clerkUserId, req);
    if (!curifyUser) {
      res.status(401).json({ success: false, message: 'User account could not be synchronized with Curify profile.' });
      return;
    }

    req.user = curifyUser;
    next();
  } catch (err) {
    console.error('[Auth Middleware] requireAuth error:', err);
    res.status(401).json({ success: false, message: 'Invalid or expired authentication session' });
  }
}

export const authenticate = requireAuth;

/**
 * Require specific role (RBAC)
 */
export function requireRole(role: 'patient' | 'lender') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        message: `Forbidden. This resource requires '${role}' role permissions.`,
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication: resolves user if Clerk token present, but does not reject if unauthenticated
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      const curifyUser = await resolveCurifyUser(auth.userId, req);
      if (curifyUser) {
        req.user = curifyUser;
      }
    } else {
      let token = req.cookies?.token;
      if (!token && req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (token) {
        try {
          const decoded = jwt.verify(token, env.JWT_SECRET) as any;
          if (decoded?.id) {
            const userRes = await query(
              `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE id = $1 LIMIT 1;`,
              [decoded.id]
            );
            if (userRes.rowCount && userRes.rowCount > 0) {
              const row = userRes.rows[0];
              req.user = {
                id: row.id,
                clerkUserId: row.clerk_user_id || 'jwt_user',
                email: row.email,
                role: row.role as 'patient' | 'lender',
                firstName: row.first_name,
                lastName: row.last_name,
                phone: row.phone || undefined,
              };
            }
          }
        } catch {}
      } else if (req.headers['x-demo-role'] === 'lender') {
        const demoUserRes = await query(
          `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE role = 'lender' ORDER BY created_at ASC LIMIT 1;`,
          []
        );
        if (demoUserRes.rowCount && demoUserRes.rowCount > 0) {
          const u = demoUserRes.rows[0];
          req.user = {
            id: u.id,
            clerkUserId: u.clerk_user_id || 'demo_clerk_user',
            email: u.email,
            role: u.role as 'lender',
            firstName: u.first_name,
            lastName: u.last_name,
            phone: u.phone || undefined,
          };
        }
      }
    }
  } catch {
    // Continue without user
  }
  next();
}

/**
 * Ownership security check helper
 */
export function checkPatientOwnership(patientUserId: string, req: Request): boolean {
  if (!req.user) return false;
  if (req.user.role === 'lender' || req.user.role === 'admin') return true;
  return req.user.id === patientUserId;
}
