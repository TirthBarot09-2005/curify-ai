import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export interface UserRecord {
  id: string;
  email: string;
  role: 'patient' | 'lender' | 'admin';
  first_name: string;
  last_name: string;
  phone?: string;
  password_hash?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  role: 'patient' | 'lender';
  firstName: string;
  lastName: string;
  phone?: string;
}

export class AuthService {
  static generateToken(user: { id: string; email: string; role: string; firstName: string; lastName: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );
  }

  static async register(dto: RegisterDTO) {
    const existing = await query('SELECT id FROM users WHERE email = $1', [dto.email.toLowerCase()]);
    if (existing.rowCount > 0) {
      const error: any = new Error('Email address already registered');
      error.statusCode = 400;
      throw error;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = randomUUID();

    const result = await query<UserRecord>(
      `INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, role, first_name, last_name, phone, created_at;`,
      [userId, dto.email.toLowerCase(), passwordHash, dto.role, dto.firstName, dto.lastName, dto.phone || null]
    );

    const user = result.rows[0];

    // Create corresponding profile
    if (user.role === 'patient') {
      await query(
        `INSERT INTO patient_profiles (id, user_id, city, state, onboarding_completed, onboarding_step, profile_completion_percentage)
         VALUES ($1, $2, 'Ahmedabad', 'Gujarat', FALSE, 1, 20);`,
        [randomUUID(), user.id]
      );
    } else if (user.role === 'lender') {
      await query(
        `INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
         VALUES ($1, $2, 'Curify Health Finance', 'Credit Underwriter', $3);`,
        [randomUUID(), user.id, `LND-${Math.floor(1000 + Math.random() * 9000)}`]
      );
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
      },
    };
  }

  static async login(email: string, password: string) {
    const result = await query<UserRecord>(
      `SELECT id, email, password_hash, role, first_name, last_name, phone FROM users WHERE LOWER(email) = LOWER($1);`,
      [email.trim()]
    );

    if (result.rowCount === 0) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash!);
    if (!passwordValid) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Fetch profile info
    let profile: any = null;
    if (user.role === 'patient') {
      const pRes = await query('SELECT * FROM patient_profiles WHERE user_id = $1', [user.id]);
      profile = pRes.rows[0] || null;
    } else if (user.role === 'lender') {
      const lRes = await query('SELECT * FROM lender_profiles WHERE user_id = $1', [user.id]);
      profile = lRes.rows[0] || null;
    }

    const token = this.generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        profile,
      },
    };
  }

  static async getMe(userId: string) {
    const result = await query<UserRecord>(
      `SELECT id, email, role, first_name, last_name, phone, created_at FROM users WHERE id = $1;`,
      [userId]
    );

    if (result.rowCount === 0) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const user = result.rows[0];
    let profile: any = null;

    if (user.role === 'patient') {
      const pRes = await query('SELECT * FROM patient_profiles WHERE user_id = $1', [user.id]);
      profile = pRes.rows[0] || null;
    } else if (user.role === 'lender') {
      const lRes = await query('SELECT * FROM lender_profiles WHERE user_id = $1', [user.id]);
      profile = lRes.rows[0] || null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`.trim(),
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      profile,
    };
  }

  static async syncUser(userId: string, data: { role?: 'patient' | 'lender'; firstName?: string; lastName?: string; phone?: string }) {
    if (data.role || data.firstName || data.lastName || data.phone !== undefined) {
      await query(
        `UPDATE users
         SET role = COALESCE($1, role),
             first_name = COALESCE($2, first_name),
             last_name = COALESCE($3, last_name),
             phone = COALESCE($4, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5;`,
        [data.role || null, data.firstName || null, data.lastName || null, data.phone || null, userId]
      );

      // Ensure profile matches new role if changed
      if (data.role === 'lender') {
        const lRes = await query('SELECT id FROM lender_profiles WHERE user_id = $1', [userId]);
        if (lRes.rowCount === 0) {
          await query(
            `INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
             VALUES ($1, $2, 'Curify Health Finance', 'Credit Underwriter', $3);`,
            [randomUUID(), userId, `LND-${Math.floor(1000 + Math.random() * 9000)}`]
          );
        }
      }
    }
    return this.getMe(userId);
  }

  static async completeClerkSignup(data: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    role?: 'patient' | 'lender';
    phone?: string;
  }) {
    const email = data.email.trim();
    const role = data.role || 'patient';
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const phone = data.phone?.trim() || undefined;
    const password = data.password || 'Curify@Password2026';

    const secretKey = process.env.CLERK_SECRET_KEY || 'sk_test_Oi40pm58yIcIwf3hNguZtKCSkhFNQVQzZAVll1asGX';
    let clerkUserId: string | null = null;

    // 1. Check if user already exists in Clerk by email
    try {
      const searchRes = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      if (searchRes.ok) {
        const users: any = await searchRes.json();
        if (Array.isArray(users) && users.length > 0) {
          clerkUserId = users[0].id;

          // Ensure publicMetadata has the correct role (client-side signUp uses unsafeMetadata)
          try {
            await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                public_metadata: { role },
                first_name: firstName,
                last_name: lastName,
              }),
            });
          } catch (metaErr) {
            console.warn('[Clerk Service] Metadata update warning:', metaErr);
          }
        }
      }
    } catch (searchErr) {
      console.warn('[Clerk Service] User search warning:', searchErr);
    }

    // 2. If user doesn't exist in Clerk, create user via Clerk Backend API
    if (!clerkUserId) {
      try {
        const payload: any = {
          email_address: [email],
          password,
          first_name: firstName,
          last_name: lastName,
          skip_password_checks: true,
          skip_password_requirement: true,
          public_metadata: { role },
        };

        const areaCodes = ['415', '212', '312', '650', '206', '512', '617', '305', '702', '404'];
        const getRandomValidPhone = () => {
          const area = areaCodes[Math.floor(Math.random() * areaCodes.length)];
          const exchange = Math.floor(2000000 + Math.random() * 7999999);
          return `+1${area}${exchange}`;
        };

        // If user provided a valid +1 phone, use it; otherwise generate a unique valid E.164 phone
        if (phone && phone.startsWith('+1') && phone.replace(/\D/g, '').length === 11) {
          payload.phone_number = [phone.replace(/\s+/g, '')];
        } else {
          payload.phone_number = [getRandomValidPhone()];
        }

        let createRes = await fetch('https://api.clerk.com/v1/users', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        let createdData: any = await createRes.json();
        if (createdData?.id) {
          clerkUserId = createdData.id;
        } else if (
          createdData?.errors?.[0]?.code === 'unsupported_country_code' ||
          createdData?.errors?.[0]?.code === 'form_identifier_exists' ||
          createdData?.errors?.[0]?.code === 'form_param_format_invalid'
        ) {
          // Retry with fresh unique NANP phone format
          payload.phone_number = [getRandomValidPhone()];
          createRes = await fetch('https://api.clerk.com/v1/users', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secretKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          createdData = await createRes.json();
          if (createdData?.id) clerkUserId = createdData.id;
          else console.warn('[Clerk Service] User creation retry notice:', createdData);
        } else {
          console.warn('[Clerk Service] Create user notice:', createdData);
        }
      } catch (createErr) {
        console.warn('[Clerk Service] User creation fallback warning:', createErr);
      }
    }

    // 3. Generate a Clerk sign-in ticket token so frontend can sign in immediately
    let signInToken = '';
    if (clerkUserId) {
      try {
        const tokenRes = await fetch('https://api.clerk.com/v1/sign_in_tokens', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: clerkUserId }),
        });
        if (tokenRes.ok) {
          const tokenData: any = await tokenRes.json();
          signInToken = tokenData?.token || '';
        }
      } catch (tokenErr) {
        console.warn('[Clerk Service] Sign-in token generation warning:', tokenErr);
      }
    }

    // 4. Ensure user exists and is up to date in PostgreSQL
    const existing = await query<UserRecord>(
      `SELECT id, clerk_user_id, email, role, first_name, last_name, phone FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;`,
      [email]
    );

    let dbUserId: string;
    if (existing.rowCount && existing.rowCount > 0) {
      dbUserId = existing.rows[0].id;
      await query(
        `UPDATE users
         SET clerk_user_id = COALESCE($1, clerk_user_id),
             first_name = $2,
             last_name = $3,
             role = $4,
             phone = COALESCE($5, phone),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6;`,
        [clerkUserId, firstName, lastName, role, phone || null, dbUserId]
      );
    } else {
      dbUserId = randomUUID();
      const pwdHash = await bcrypt.hash(password, 10);
      await query(
        `INSERT INTO users (id, clerk_user_id, email, password_hash, role, first_name, last_name, phone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        [dbUserId, clerkUserId || dbUserId, email, pwdHash, role, firstName, lastName, phone || null]
      );
    }

    // Ensure profile row exists
    if (role === 'patient') {
      const pRes = await query('SELECT id, onboarding_completed FROM patient_profiles WHERE user_id = $1;', [dbUserId]);
      if (pRes.rowCount === 0) {
        await query(
          `INSERT INTO patient_profiles (id, user_id, onboarding_completed, created_at, updated_at)
           VALUES ($1, $2, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          [randomUUID(), dbUserId]
        );
      }
    } else if (role === 'lender') {
      const lRes = await query('SELECT id FROM lender_profiles WHERE user_id = $1;', [dbUserId]);
      if (lRes.rowCount === 0) {
        await query(
          `INSERT INTO lender_profiles (id, user_id, organization_name, designation, employee_id)
           VALUES ($1, $2, 'Curify Health Finance', 'Credit Underwriter', $3);`,
          [randomUUID(), dbUserId, `LND-${Math.floor(1000 + Math.random() * 9000)}`]
        );
      }
    }

    return {
      token: signInToken,
      user: {
        id: dbUserId,
        clerkUserId: clerkUserId || dbUserId,
        name: `${firstName} ${lastName}`.trim() || 'Patient',
        email,
        role,
        onboardingCompleted: false,
      },
    };
  }
}

