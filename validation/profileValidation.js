// Archivo: validation/profileValidation.js

const { z } = require('zod');

const profileSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  password_repeat: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
  anos_experiencia: z.number().int().positive({ message: "Los años de experiencia deben ser un número entero positivo" }),
  especialidad: z.string().min(2, { message: "La especialidad debe tener al menos 2 caracteres" }),
});

module.exports = profileSchema;
