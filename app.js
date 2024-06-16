require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { engine } = require('express-handlebars');
const { create } = require('handlebars');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const Skater = require('./models/Skater'); // Importa el modelo Skater
const routes = require('./routes');
const loginSchema = require('./validation/loginValidation'); // Importa la validación de login
const profileSchema = require('./validation/profileValidation'); // Importa la validación del perfil
const { authenticateToken } = require('./authMiddleware');

const app = express();



app.use(methodOverride('_method'));
// Configuración de middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));
// Middleware para sobrescribir métodos HTTP
app.use(methodOverride('_method'));



// Configuración de Handlebars
const hbs = create({
  allowProtoMethodsByDefault: true,
  allowProtoPropertiesByDefault: true,
});



app.engine('handlebars', engine({
  handlebars: hbs,
  defaultLayout: 'main',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  }
}));

app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// Sincroniza modelos con la base de datos
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Modelos sincronizados con la base de datos.');
    return sequelize.authenticate();
  })
  .then(() => {
    console.log('Conexión establecida correctamente con la base de datos.');
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Error al sincronizar modelos con la base de datos:', error);
  });

// Middleware para redirigir a admin.handlebars si el usuario es admin
async function redirectAdmin(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const skater = await Skater.findByPk(decoded.id);

    if (!skater) {
      return res.redirect('/login');
    }

    // Redirigir a admin.handlebars si es admin
    if (skater.email === 'admin@gmail.com') {
      return res.redirect('/admin');
    }

    req.user = skater;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.redirect('/login');
  }
}

// Ruta para el inicio de sesión
app.get('/login', (req, res) => {
  res.render('login');
});

// Ruta POST para manejar el inicio de sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validar los datos del formulario utilizando el esquema de validación
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
      // Si las credenciales no son válidas, renderizar de nuevo el login con un mensaje de error
      res.render('login', { error: { message: 'Credenciales incorrectas. Por favor, intente de nuevo.' } });
    }
  } catch (error) {
    console.error("Error en el inicio de sesión:", error);
    res.render('login', { error: { message: 'Error al iniciar sesión. Por favor, intente de nuevo.' } });
  }
});

// Ruta para el registro de usuarios
app.get('/register', (req, res) => {
  res.render('registro');
});

app.post('/register', async (req, res) => {
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

    // Inserta el nuevo skater en la base de datos
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

// Ruta para ver el perfil del usuario
app.get('/profile', redirectAdmin, authenticateToken, async (req, res) => {
  try {
    const { id, email, nombre } = req.user;
    const skater = await Skater.findByPk(id);
    if (!skater) throw new Error('Skater no encontrado');
    res.render('datos', { skater: skater.get({ plain: true }) });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});

// Ruta POST para actualizar el perfil del usuario
app.post('/profile', authenticateToken, async (req, res) => {
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

// Ruta para manejar el logout
app.post('/logout', (req, res) => {
  res.clearCookie('token'); // Borra la cookie de token
  res.redirect('/'); // Redirige al usuario a la página principal
});

// Otro middleware y rutas
app.use('/', routes);

app.get('/favicon.ico', (req, res) => res.status(204));

module.exports = app;
