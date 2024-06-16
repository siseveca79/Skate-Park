const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Skater = require('./models/Skater');
const loginSchema = require('./validation/loginValidation');
const profileSchema = require('./validation/profileValidation');

// Middleware para verificar el token JWT y los permisos de administrador
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

router.get('/', async (req, res) => {
  try {
    console.log("Intentando obtener skaters...");
    const skaters = await Skater.findAll({
      order: [['estado', 'DESC']] // Ordena por estado, aprobados (true) primero
    });
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

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    loginSchema.parse({ email, password });
    const skater = await Skater.findOne({ where: { email } });

    if (skater && await bcrypt.compare(password, skater.password)) {
      const token = jwt.sign({ id: skater.id, email: skater.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.cookie('token', token, { httpOnly: true });
      res.redirect(skater.email === 'admin@gmail.com' ? '/admin' : '/profile');
    } else {
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

  if (!req.files || !req.files.foto) {
    return res.status(400).send('No se ha enviado ninguna imagen.');
  }

  const foto = req.files.foto;
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    await foto.mv(`./public/uploads/${foto.name}`);
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
  const { nombre, anos_experiencia, especialidad } = req.body;

  try {
    profileSchema.parse({ nombre, anos_experiencia: Number(anos_experiencia), especialidad });
    await Skater.update(
      { nombre, anos_experiencia: Number(anos_experiencia), especialidad },
      { where: { id: req.user.id } }
    );

    const skater = await Skater.findByPk(req.user.id);
    res.render('datos', { skater, successMessage: 'Cambios guardados con éxito.' });
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// Ruta GET para la página de administración
router.get('/admin', authenticateToken, async (req, res) => {
  if (req.user.email !== 'admin@gmail.com') return res.redirect('/profile');

  try {
    const skaters = await Skater.findAll();
    res.render('admin', { skaters });
  } catch (error) {
    console.error('Error al obtener skaters:', error);
    res.status(500).send('Error interno al obtener skaters');
  }
});

// Ruta PUT para actualizar el estado de un skater por ID
router.put('/admin/update/:id', async (req, res) => {
  const skaterId = req.params.id;
  const newState = req.body.estado === 'true'; // Asegúrate de convertir correctamente el valor del estado

  try {
    const skater = await Skater.findByPk(skaterId);
    if (!skater) {
      return res.status(404).send('Skater no encontrado');
    }

    skater.estado = newState;
    await skater.save();
    res.json({ message: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar el estado del skater:', error);
    res.status(500).send('Error interno del servidor');
  }
});


module.exports = router;
