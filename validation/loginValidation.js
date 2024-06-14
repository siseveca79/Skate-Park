const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().email({ message: "El email no es válido" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

module.exports = loginSchema;
