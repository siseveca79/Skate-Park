const { z } = require('zod');

const passwordSchema = z.string()
  .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  .regex(/[A-Za-z]/, { message: "La contraseña debe contener al menos una letra" })
  .regex(/[0-9]/, { message: "La contraseña debe contener al menos un número" })
  .regex(/[\W_]/, { message: "La contraseña debe contener al menos un carácter especial" });

const registerSchema = z.object({
  email: z.string().email({ message: "El email no es válido" }),
  nombre: z.string()
    .nonempty({ message: "El nombre es requerido" })
    .min(2, { message: "El nombre debe tener al menos 2 caracteres" })
    .regex(/^[a-zA-Z\s]+$/, { message: "El nombre solo puede contener letras y espacios" }),
  password: passwordSchema,
  password_repeat: z.string().min(6, { message: "Repetir la contraseña es requerido" }),
  anos_experiencia: z.preprocess((val) => parseInt(val, 10), z.number().int().min(0, { message: "Los años de experiencia deben ser un número positivo" })),
  especialidad: z.string()
    .nonempty({ message: "La especialidad es requerida" })
    .min(2, { message: "La especialidad debe tener al menos 2 caracteres" })
    .regex(/^[a-zA-Z\s]+$/, { message: "La especialidad solo puede contener letras y espacios" }),
  foto: z.any().optional(), // Aquí se puede agregar validación para archivos si es necesario
}).refine((data) => data.password === data.password_repeat, {
  message: "Las contraseñas no coinciden",
  path: ["password_repeat"],
});

module.exports = { registerSchema };
