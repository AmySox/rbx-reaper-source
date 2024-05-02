import { Auth } from '@services/Auth';
import { NextFunction, Request, Response } from 'express';

export const verifyJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // -> Get token from header
  const token = req.header('Authorization');

  // -> Check if token exists
  if (!token)
    return res.status(401).json({
      message: 'Missing token',
    });

  try {
    // -> Verify token
    const user = await Auth.verifyJWT(token);

    // -> Check if user exists
    if (!user)
      return res.status(401).json({
        message: 'Invalid token',
      });

    // -> Set user in request
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      message: 'Invalid token',
    });
  }
};
