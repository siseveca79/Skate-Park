require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const { engine } = require('express-handlebars');
const { create } = require('handlebars');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const cookieParser = require('cookie-parser');
const sequelize = require('./config/database');
const Skater = require('./models/Skater'); // Importa el modelo Skater
const routes = require('./routes');



const app = express();

// Configuración de middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));

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



// Otro middleware y rutas
app.use('/', routes);

app.get('/favicon.ico', (req, res) => res.status(204));



// Ruta para el registro de usuarios
app.get('/register', (req, res) => {
  res.render('registro');
});

// Ruta POST para procesar el registro
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
    res.render('login', { error: { message: 'Error al iniciar sesión. Por favor, intente de nuevo.' } }); // Renderiza la vista de login con el mensaje de error
  }
});


// Ruta para ver el perfil del usuario
app.get('/profile', async (req, res) => {
  const token = req.cookies.token;

  try {
    if (!token) return res.redirect('/login');

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) return res.redirect('/login');

      const skater = await Skater.findByPk(decoded.id);
      res.render('datos', { skater });
    });
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    res.status(500).send("Error interno en el servidor");
  }
});




// Agregar esta ruta para manejar el logout
app.post('/logout', (req, res) => {
  res.clearCookie('token'); // Borra la cookie de token
  res.redirect('/'); // Redirige al usuario a la página principal
});



app.listen(3002, () => {
  console.log('Servidor corriendo en el puerto 3001');
});

/* Inicia el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Conexión establecida correctamente con la base de datos.');
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
  }
});*/

module.exports = app;
