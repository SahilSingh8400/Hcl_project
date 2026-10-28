const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'hcl_hr_secret_2025_secure_key';

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'hr') {
    return res.status(403).json({ error: 'Admin or HR access required' });
  }
  next();
};

module.exports = { authenticate, authorizeAdmin, JWT_SECRET };
