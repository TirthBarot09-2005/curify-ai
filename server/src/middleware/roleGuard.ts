import type { Request, Response, NextFunction } from 'express';

export function requireRole(...roles: (string | string[])[]) {
  const allowed = roles.flat();
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!allowed.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowed.join(' or ')}`,
      });
      return;
    }

    next();
  };
}
