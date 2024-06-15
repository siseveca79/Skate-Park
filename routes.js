const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Skater = require('./models/Skater'); // Asegúrate de importar correctamente Skater
const { z } = require('zod');
const loginSchema = require('./validation/loginValidation');
const registerSchema = require('./validation/validation');
const profileSchema = require('./validation/profileValidation');

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

router.get('/', async (req, res) => {
  try {
    console.log("Intentando obtener skaters...");
    const skaters = await Skater.findAll();
    console.log("Skaters obtenidos de la base de datos:", skaters);

    res.render('index', { skaters: skaters.map(skater => skater.get({ plain: true })) });
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
    // Validar los datos del formulario utilizando un esquema de validación
    loginSchema.parse({ email, password });

    // Buscar al skater por su email en la base de datos
    const skater = await Skater.findOne({ where: { email } });

    // Verificar si existe el skater y si la contraseña es correcta
    if (skater && await bcrypt.compare(password, skater.password)) {
      // Generar un token de sesión
      const token = jwt.sign({ id: skater.id, email: skater.email }, process.env.JWT_SECRET, { expiresIn: '1h' });

      // Establecer la cookie con el token
      res.cookie('token', token, { httpOnly: true });

      // Redirigir al usuario a su perfil
      res.redirect('/profile');
    } else {
      // Si las credenciales no son válidas, redirigir de nuevo al login con un mensaje de error
      res.render('login', { error: { message: 'Credenciales incorrectas. Por favor, intente de nuevo.' } });
    }
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
    res.render('login', { error: { message: 'Error al iniciar sesión. Por favor, intente de nuevo.' } });
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

// Ruta POST para actualizar el perfil del usuario
router.post('/profile', authenticateToken, async (req, res) => {
  const { nombre, anos_experiencia, especialidad } = req.body;

  try {
    // Validar los datos del formulario utilizando el esquema de validación
    profileSchema.parse({ nombre, anos_experiencia: Number(anos_experiencia), especialidad });

    await Skater.update(
      { nombre, anos_experiencia: Number(anos_experiencia), especialidad },
      { where: { id: req.user.id } }
    );

    // Recargar el perfil con un mensaje de éxito
    const skater = await Skater.findByPk(req.user.id);
    res.render('datos', { skater, successMessage: 'Cambios guardados con éxito.' });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token'); // Borra la cookie de token
  res.redirect('/'); // Redirige al usuario a la página principal
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