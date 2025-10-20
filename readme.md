# 🤖 AI Chat Backend

Backend para un asistente conversacional basado en IA que permite gestionar contactos mediante comandos naturales en lenguaje humano.

## 📋 Descripción

Este proyecto es un backend desarrollado con Node.js y Express que integra un modelo de IA (Groq/LLaMA) para interpretar conversaciones y realizar operaciones CRUD sobre una base de datos de contactos. El sistema puede entender instrucciones como "guarda el contacto de Juan" o "muéstrame todos los contactos" y ejecutar las acciones correspondientes.

## ✨ Características

- 💬 **Chat conversacional con IA** mediante la API de Groq (LLaMA 3.3 70B)
- 📇 **Gestión inteligente de contactos** (crear, leer, actualizar, eliminar)
- 🗄️ **Base de datos PostgreSQL** con Sequelize ORM
- 🔄 **Procesamiento de lenguaje natural** para interpretar intenciones del usuario
- 📝 **Conversión de Markdown a HTML** para respuestas formateadas
- 🔒 **Validación de datos** con Sequelize validators

## 🛠️ Tecnologías

- **Node.js** v20+
- **Express.js** v5.1.0
- **Sequelize** v6.37.7 (ORM)
- **PostgreSQL** (base de datos)
- **Groq API** (modelo LLaMA 3.3)
- **Marked** v16.2.1 (procesamiento Markdown)
- **dotenv** (gestión de variables de entorno)
- **CORS** (habilitado para desarrollo)

## 📁 Estructura del Proyecto

```
backend/
├── config/
│   └── db.js                 # Configuración de Sequelize
├── controller/
│   └── ai.controller.js      # Controlador principal del chat
├── models/
│   └── contacto.model.js     # Modelo de datos de Contacto
├── services/
│   └── contacto.service.js   # Lógica de negocio de contactos
├── router/
│   └── router.js             # Rutas de la API
├── app.js                    # Configuración de Express
├── server.js                 # Punto de entrada
├── .env                      # Variables de entorno (no incluir en Git)
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Instalación

### Prerrequisitos

- Node.js v20 o superior
- PostgreSQL 12 o superior
- Una cuenta en [Groq](https://groq.com) con API key

### Pasos

1. **Clonar el repositorio**

```bash
git clone https://github.com/MatiasBorsatto/backend_botAi
cd backend_botAi
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:

```env
PORT=3000
BASE_URL=http://localhost:3000

# Groq API
APIGROQ=https://api.groq.com/openai/v1/chat/completions
APIKEYGROQ=tu_api_key_groq
APIKEYGROQTEST=tu_api_key_groq_test

# PostgreSQL
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_db?sslmode=require

```

4. **Inicializar la base de datos**

El modelo se sincroniza automáticamente al iniciar. Asegúrate de que existe el schema `aurai` en tu base de datos:

```sql
CREATE SCHEMA IF NOT EXISTS aurai;
```

5. **Iniciar el servidor**

```bash
node server.js
```

El servidor estará disponible en `http://localhost:3000`

## 📡 API Endpoints

### POST `/api/prompt`

Envía mensajes al asistente de IA y procesa operaciones sobre contactos.

**Body:**

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Eres un asistente que gestiona contactos..."
    },
    {
      "role": "user",
      "content": "Guarda el contacto de María con email maria@example.com"
    }
  ]
}
```

**Respuesta exitosa (operación de guardado):**

```json
{
  "mensaje": "Contacto guardado exitosamente",
  "contacto": {
    "id_contacto": 1,
    "name": "María",
    "email": "maria@example.com",
    "phone": null,
    "createdAt": "2025-10-20T...",
    "updatedAt": "2025-10-20T..."
  },
  "respuesta": "...",
  "raw": {...}
}
```

### POST `/api/guardar`

Guarda uno o varios contactos directamente.

**Body:**

```json
[
  {
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+54 9 11 1234-5678"
  }
]
```

### GET `/api/obtener-contactos`

Obtiene todos los contactos almacenados.

**Respuesta:**

```json
{
  "mensaje": "Contactos obtenidos correctamente",
  "contacto": [
    {
      "id_contacto": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "phone": "+54 9 11 1234-5678",
      "createdAt": "2025-10-20T...",
      "updatedAt": "2025-10-20T..."
    }
  ]
}
```

## 🤖 Funcionamiento del Sistema

1. **El usuario envía un mensaje** al endpoint `/api/prompt`
2. **El sistema procesa el historial** de mensajes y lo envía a la API de Groq
3. **La IA interpreta la intención** y responde con:
   - Texto conversacional (formato Markdown)
   - JSON estructurado para operaciones (POST, GET, etc.)
4. **El backend detecta** si la respuesta contiene operaciones sobre contactos
5. **Ejecuta la operación** correspondiente en la base de datos
6. **Devuelve la respuesta** al cliente con los resultados

### Ejemplo de flujo

```
Usuario: "Guarda el contacto de Ana López, su email es ana@company.com"
    ↓
IA procesa y genera JSON:
{
  "operation": "POST",
  "contacts": [
    {
      "name": "Ana López",
      "email": "ana@company.com"
    }
  ]
}
    ↓
Backend guarda en PostgreSQL
    ↓
Respuesta: "Contacto guardado exitosamente"
```

## 🔒 Seguridad

⚠️ **IMPORTANTE**: Nunca subas tu archivo `.env` a Git. Las API keys son sensibles.

- Las credenciales están en variables de entorno
- La conexión a PostgreSQL usa SSL
- Validación de datos con Sequelize
- CORS configurado (ajustar para producción)

## 🐛 Debugging

El sistema incluye logs detallados:

```javascript
console.log("=== MENSAJES RECIBIDOS ===");
console.log("=== INFO DEL REQUEST ===");
console.log("=== RESPUESTA DE GROQ ===");
```

Para ver los logs SQL de Sequelize, verifica la configuración en `db.js`:

```javascript
logging: console.log; // Cambiar a false para desactivar
```

## 📝 Modelo de Datos

### Contacto

```javascript
{
  id_contacto: INTEGER (PK, autoincrement),
  name: STRING (required, not empty),
  email: STRING (required, valid email),
  phone: STRING (optional, formato numérico),
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP
}
```

## 🚧 Mejoras Futuras

- [ ] Implementar autenticación de usuarios
- [ ] Agregar operaciones UPDATE y DELETE
- [ ] Implementar rate limiting
- [ ] Añadir tests unitarios y de integración
- [ ] Implementar caché con Redis
- [ ] Agregar paginación en listado de contactos
- [ ] Mejorar manejo de errores
- [ ] Implementar webhooks para notificaciones

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

ISC

## 👨‍💻 Autor

Desarrollado con ❤️ como proyecto de demostración de integración IA + Backend

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.

---

**Nota**: Este proyecto utiliza la API de Groq con el modelo LLaMA 3.3 70B Versatile. Asegúrate de revisar los límites y costos de la API en [groq.com](https://groq.com).
