function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
  }
  
  function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.is_admin) {
      return next();
    }
    res.status(403).json({ error: 'Forbidden: Admins only' });
  }
  
  module.exports = { ensureAuthenticated, ensureAdmin };