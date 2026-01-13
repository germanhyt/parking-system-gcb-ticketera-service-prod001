# Servicio de Impresión Local - WEB_TICKETERA_SERVICE

Servicio local Node.js para imprimir tickets térmicos desde aplicaciones web React.

## 🚀 Características

- Servidor Express local que escucha en el puerto 4000
- Impresión RAW compatible con comandos ESC/POS
- Soporte para impresoras térmicas (RPT006, etc.)
- API REST simple para integración con React
- Listado de impresoras disponibles
- Endpoint de salud del servicio

## 📋 Requisitos Previos

1. **Node.js** (versión 14 o superior)
2. **Impresora térmica** conectada por USB (ej: 3nStar-RPT006)
3. **Windows** con impresora configurada en el sistema (Panel de Control > Dispositivos e impresoras)
4. **Permisos de administrador** (opcional, solo si hay problemas de permisos)

### Configuración de la Impresora

#### Opción A: Usar el driver de Windows (Recomendado - Más fácil)

1. Conecta la impresora RPT006 por USB
2. Comparte la impresora en Windows (Panel de Control > Dispositivos e impresoras)
3. Anota el nombre exacto de la impresora
4. Configura el nombre en el archivo `.env` o directamente en `impresion-pc.js`

#### Opción B: Driver WinUSB con Zadig (Acceso raw total)

1. Descarga Zadig desde: https://zadig.akeo.ie/
2. Conecta la impresora por USB
3. Selecciona la impresora en Zadig
4. Cambia el driver a WinUSB
5. Instala el driver

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Instalar dependencias de desarrollo (TypeScript y tipos)
npm install --save-dev typescript @types/node @types/express @types/cors ts-node
```

## 🏃 Uso

### Desarrollo (con TypeScript)

```bash
# Ejecutar directamente con ts-node (sin compilar)
npm run dev
```

### Producción

```bash
# Compilar TypeScript a JavaScript
npm run build

# Ejecutar el código compilado
npm start
```

### Modo Watch (desarrollo)

```bash
# Compilar y observar cambios
npm run watch
```

El servidor se iniciará en `http://localhost:4000`

### Configurar variables de entorno (opcional)

Crea un archivo `.env`:

```
NOMBRE_IMPRESORA=3nStar-RPT006
PUERTO=4000
```

## 🔌 API Endpoints

### POST /imprimir

Envía un ticket a imprimir.

**Request:**
```json
{
  "texto": "\x1B\x40Hola Ticket\n\n\x1D\x56\x00"
}
```

**Response:**
```json
{
  "success": true,
  "jobID": "123",
  "impresora": "3nStar-RPT006"
}
```

### GET /impresoras

Lista todas las impresoras disponibles en el sistema.

**Response:**
```json
{
  "success": true,
  "impresoras": [...],
  "impresoraActual": "3nStar-RPT006"
}
```

### GET /health

Verifica el estado del servicio.

**Response:**
```json
{
  "status": "OK",
  "servicio": "Agente de Impresión Local",
  "puerto": 4000,
  "impresora": "3nStar-RPT006"
}
```

## 💻 Ejemplo de uso desde React

```javascript
// Imprimir ticket desde React
const imprimirTicket = async () => {
  const texto = "\x1B\x40\x1B\x61\x01TICKET\n\x1B\x61\x00";
  
  try {
    const response = await fetch('http://localhost:4000/imprimir', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ texto: texto })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Ticket enviado exitosamente');
    } else {
      console.error('Error al imprimir:', result.error);
    }
  } catch (error) {
    console.error('Error de conexión:', error);
  }
};
```

## 📝 Comandos ESC/POS comunes

- `\x1B\x40` - Inicializar impresora
- `\x1B\x61\x01` - Centrar texto
- `\x1B\x61\x00` - Alinear izquierda
- `\x1B\x45\x01` - Negrita ON
- `\x1B\x45\x00` - Negrita OFF
- `\x1D\x21\x00` - Tamaño normal
- `\x1D\x21\x11` - Texto doble alto y ancho
- `\x1D\x56\x00` - Corte de papel
- `\x0A` - Nueva línea

## 🛠️ Solución de Problemas

### Error: "No se encuentra la impresora"

1. Verifica que la impresora esté conectada y encendida
2. Lista las impresoras disponibles: `GET http://localhost:4000/impresoras`
3. Actualiza el nombre de la impresora en `impresion-pc.js` o `.env`

### Error: "Permission denied"

1. Ejecuta el script como administrador
2. Verifica permisos de la impresora en Windows

### La impresora imprime caracteres extraños

- Asegúrate de usar el modo RAW en la configuración
- Verifica que los comandos ESC/POS sean correctos
- Revisa que la codificación de caracteres sea UTF-8

## 📄 Licencia

ISC

