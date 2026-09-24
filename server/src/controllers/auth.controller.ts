import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AuthService.register(req.body);
      
      // Also set HTTP-only cookie for convenience
      res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const data = await AuthService.login(email, password);

      res.cookie('token', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: 'Logged in successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AuthService.getMe(req.user!.id);
      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async sync(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { role, firstName, lastName, phone } = req.body;
      const user = await AuthService.syncUser(req.user!.id, { role, firstName, lastName, phone });
      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }

  static async completeSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, firstName, lastName, role, phone } = req.body;
      const data = await AuthService.completeClerkSignup({
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
      });

      res.status(200).json({
        success: true,
        message: 'Clerk signup completed and authenticated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

