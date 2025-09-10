const jwt = require('jsonwebtoken');

// JWT secret - in production this should be from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'vimm-core-default-secret-change-in-production';

function generateToken(hiveAccount) {
  return jwt.sign(
    { hiveAccount },
    JWT_SECRET,
    { expiresIn: '7d' } // Token expires in 7 days
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Middleware to authenticate JWT tokens
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied',
      message: 'No token provided' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ 
      error: 'Invalid token',
      message: 'Token is invalid or expired' 
    });
  }

  req.user = decoded;
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken
};