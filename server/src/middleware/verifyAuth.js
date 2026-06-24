const { getAuth } = require('firebase-admin/auth');

async function verifyAuth(req, res, next) {
  console.log('Incoming Authorization Header:', req.headers.authorization ? `Present (length: ${req.headers.authorization.length})` : 'Missing');
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth check failed: No/invalid Bearer token provided');
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('verifyAuth Error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = verifyAuth;
