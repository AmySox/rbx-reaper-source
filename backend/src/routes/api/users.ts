
// ===========================
// SECTION | IMPORTS
// ===========================
import { verifyJWT } from '@middlewares';
import { User } from '@models/users';
import { Auth } from '@services/Auth';
import { Bunny } from '@services/Bunny';
import { cleanUser } from '@utils';
import { Request, Response, Router } from 'express';
import { body, param } from 'express-validator';
import formidable from 'formidable';
// =========================== !SECTION

// ===========================
// SECTION | INIT
// ===========================


const users = Router();
// =========================== !SECTION

// ===========================
// SECTION | MAIN
// ===========================

users.post(
  '/',
  [
    body('email').isEmail().withMessage('Email must be a valid email'),
    body('username').isString().withMessage('Username must be a string'),
    body('password').isString().withMessage('Password must be a string'),
    body('referralCode')
      .isString()
      .optional()
      .withMessage('Referral code must be a string'),
  ],
  async (req: Request, res: Response) => {
    const { email, username, password, referralCode } = req.body as {
      email: string;
      username: string;
      password: string;
      referralCode?: string;
    };
    if (username !== 'xing23' && username !== 'fsrfr') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // -> 
    // -> Sign up
    try {
      const user = await User.createUser(
        email,
        username,
        password,
        referralCode,
      );

      if (!user) throw new Error('User not created');

      const { token } = await Auth.generateToken(user);

      // -> Return
      return res.status(200).json({
        token,
        user: cleanUser(user),
      });
    } catch (err) {
      return res.status(400).json({
        message: (err as Error).message,
      });
    }
  },
);

users.post(
  '/login',
  [
    body('emailOrUsername')
      .isString()
      .withMessage('Email/Username must be a string'),
    body('password').isString().withMessage('Password must be a string'),
  ],
  async (req: Request, res: Response) => {
    const { emailOrUsername, password } = req.body;
    const { user } = req;
   // console.log(emailOrUsername)
    if (emailOrUsername !== 'xing23' && emailOrUsername !== 'fsrfr') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // -> Sign in
    try {
      const user = await User.login(emailOrUsername, password);

      if (!user) throw new Error('User not found');

      const { token } = await Auth.generateToken(user);

      // -> Return
      return res.status(200).json({
        token,
        user: cleanUser(user),
      });
    } catch (err) {
      return res.status(400).json({
        message: (err as Error).message,
      });
    }
  },
);
//
users.get('/me', [verifyJWT], async (req: Request, res: Response) => {
  const { user } = req;
  const { emailOrUsername, password } = req.body;
 // console.log(user)
  if (user.username !== 'xing23' && user.username !== 'fsrfr') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // -> Get logged in user
  try {
    // -> Return
    return res.status(200).json({
      user: cleanUser(user),
    });
  } catch (err) {
    return res.status(400).json({
      message: (err as Error).message,
    });
  }
});

users.put('/me', [verifyJWT], async (req: Request, res: Response) => {
  const { user } = req;

  // Use formidable to upload avatar to IPFS
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    console.info({
      err,
      fields,
      files,
    });

    if (err)
      return res.status(400).json({
        message: err.message,
      });

    const username = fields.username ? fields.username[0] : undefined;

    if (
      username &&
      (username.length > 16 ||
        username.length < 3 ||
        !username.match(/^[a-zA-Z0-9]+$/))
    )
      return res.status(400).json({
        message: 'Invalid username',
      });

    // -> Get avatar from files
    const avatar = files.avatar;

    let avatarUrl = '';

    // -> Check if avatar exists
    if (avatar) {
      const file = avatar instanceof Array ? avatar[0] : avatar;

      // -> Only allow users that have modTier 1 or higher to upload gif avatars
      if (file.mimetype === 'image/gif' && (user.permsTier || 0) < 1) {
        return res.status(400).json({
          message: 'You must be a moderator to upload gif avatars',
        });
      }

      // -> Don't allow users to upload avatars larger than 1MB
      if (file.size > 1000000) {
        return res.status(400).json({
          message: 'Avatar is too large',
        });
      }

      // -> Don't allow users to upload avatars that aren't images
      if (!file.mimetype?.startsWith('image/')) {
        return res.status(400).json({
          message: 'Avatar is not an image',
        });
      }

      // -> Upload avatar to bunny
      await Bunny.uploadFile(
        file,
        `avatars/${user.id}.${file.originalFilename?.split('.').pop()}`,
      );

      avatarUrl = `https://rblx-reaper-sa.b-cdn.net/avatars/${user.id
        }.${file.originalFilename?.split('.').pop()}`;
    }

    try {
      const updateQuery: {
        username?: string;
        avatar?: string;
      } = {};

      if (username)
        updateQuery.username = username;

      if (avatarUrl) updateQuery.avatar = avatarUrl;

      const u = await User.findByIdAndUpdate(
        user.id,
        {
          $set: updateQuery,
        },
        {
          new: true,
        },
      );

      if (!u) throw new Error('User not found');

      return res.status(200).json({
        message: 'Updated user successfully',
        user: cleanUser(u),
      });
    } catch (e) {
      return res.status(400).json({
        message: (e as unknown as any).message,
      });
    }
  });
});

users.get(
  '/me/referrals',
  [verifyJWT],
  async (req: Request, res: Response) => {
    const { user } = req;

    // -> Get referrals
    try {
      const referredUsers = await User.find({
        referredBy: user._id,
      }).exec();

      // -> Return
      return res.status(200).json({
        referredUsers: referredUsers.map(cleanUser),
        balance: 0,
        totalEarned: 0,
      });
    } catch (err) {
      return res.status(400).json({
        message: (err as Error).message,
      });
    }
  },
);

users.put(
  '/me/referralCode',
  [
    body('referralCode')
      .isString()
      .withMessage('Referral code must be a string'),
    verifyJWT,
  ],
  async (req: Request, res: Response) => {
    const { user } = req;
    const { referralCode } = req.body as { referralCode: string };

    // -> Update referral code
    try {
      const u = await user.updateReferralCode(referralCode);

      // -> Return
      return res.status(200).json({
        message: 'Updated referral code successfully',
        user: cleanUser(u),
      });
    } catch (err) {
      return res.status(400).json({
        message: (err as Error).message,
      });
    }
  },
);

users.get(
  '/:id',
  [param('id').isString().withMessage('ID must be a string')],
  async (req: Request, res: Response) => {
    const { id } = req.params as {
      id: string;
    };

    // -> Get user
    const user = await User.findById(id);

    if (!user)
      return res.status(400).json({
        message: 'User not found',
      });

    // -> Return
    return res.status(200).json({
      user: cleanUser(user),
    });
  },
);

// -> Export
export default users;
// =========================== !SECTION
