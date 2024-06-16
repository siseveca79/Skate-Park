const jwt = require('jsonwebtoken');
const Skater = require('./models/Skater'); // Asegúrate de importar correctamente Skater desde tu modelo

async function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const skater = await Skater.findByPk(decoded.id);

    if (!skater) {
      return res.redirect('/login');
    }

    req.user = skater;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.redirect('/login');
  }
}

module.exports = { authenticateToken };
