const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Skater = require('./models/Skater'); // Asegúrate de importar correctamente Skater
const { z } = require('zod');
const loginSchema = require('./validation/loginValidation');
const registerSchema = require('./validation/validation');


// Middleware para proteger rutas
function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Rutas
router.get('/', async (req, res) => {
  try {
    const skaters = await Skater.findAll();
    res.render('index', { skaters });
  } catch (error) {
    console.error('Error al obtener skaters:', error);
    res.status(500).send('Error interno al obtener skaters');
  }
});

router.get('/login', (req, res) => {
  res.render('login');
});



// Ruta POST para manejar el inicio de sesión
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Valida los datos del formulario
    loginSchema.parse({ email, password });

    const skater = await Skater.findOne({ where: { email } });

    if (skater && await bcrypt.compare(password, skater.password)) {
      const token = jwt.sign({ id: skater.id, email: skater.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true });
      res.redirect('/profile');
    } else {
      res.redirect('/login');
    }
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
    res.status(400).render('login', { error }); // Renderiza la vista de login con el mensaje de error
  }
});










router.get('/register', (req, res) => {
  res.render('registro');
});

router.post('/register', async (req, res) => {
  const { email, nombre, password, anos_experiencia, especialidad } = req.body;
  // Verifica si hay archivos adjuntos
  if (!req.files || !req.files.foto) {
    return res.status(400).send('No se ha enviado ninguna imagen.');
  }

  const foto = req.files.foto;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    // Mueve el archivo al directorio deseado
    await foto.mv(`./public/uploads/${foto.name}`);
    
    // Inserta el nuevo skater en la base de datos usando Sequelize
    await Skater.create({
      email,
      nombre,
      password: hashedPassword,
      anos_experiencia,
      especialidad,
      foto: `/uploads/${foto.name}`,
      estado: false
    });
    
    res.redirect('/login');
  } catch (error) {
    console.error("Error al registrar skater:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const skater = await Skater.findByPk(req.user.id);
    res.render('datos', { skater });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

router.post('/profile', authenticateToken, async (req, res) => {
  const { nombre, password, anos_experiencia, especialidad } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  try {
    await Skater.update(
      { nombre, password: hashedPassword, anos_experiencia, especialidad },
      { where: { id: req.user.id } }
    );
    
    res.redirect('/profile');
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

router.get('/admin', async (req, res) => {
  try {
    const skaters = await Skater.findAll();
    res.render('admin', { skaters });
  } catch (error) {
    console.error('Error al obtener skaters:', error);
    res.status(500).send('Error interno al obtener skaters');
  }
});

router.post('/admin', async (req, res) => {
  const { id, estado } = req.body;
  try {
    await Skater.update({ estado }, { where: { id } });
    res.redirect('/admin');
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

module.exports = router;
