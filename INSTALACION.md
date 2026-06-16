# 📋 GUÍA DE INSTALACIÓN DEL AGENTE DE IMPRESIÓN

## 🎯 Descripción

Agente de impresión local que se conecta al servidor de producción vía WebSocket para recibir comandos de impresión y enviarlos a impresoras térmicas USB conectadas localmente.

---

## 📦 Requisitos Previos

1. **Node.js** versión 18 o superior
2. **Windows 10/11** (o el sistema operativo donde se instalará)
3. **Impresora térmica** conectada por USB
4. **Conexión a Internet** estable

---

## 🚀 Instalación Paso a Paso

### Paso 1: Preparar el entorno

```powershell
# 1. Navegar a la carpeta del proyecto
cd parking-system-gcb-ticketera-comunication-prod001

# 2. Instalar dependencias
npm install
```

### Paso 2: Configurar variables de entorno

**IMPORTANTE:** Cada caja necesita su propio archivo `.env` con su configuración específica.

#### Para CAJA 001 (Pérgola):
```env
WEBSOCKET_SERVER_URL=wss://tu-dominio.com:8004
WEBSOCKET_APP_KEY=tu-reverb-app-key-produccion
CAJA_ID=1
CAJA_CODIGO=001
SEDE_NOMBRE=PÉRGOLA
NOMBRE_IMPRESORA=POS-80
PUERTO_LOCAL=4000
```

#### Para CAJA 002 (Abonados):
```env
WEBSOCKET_SERVER_URL=wss://tu-dominio.com:8004
WEBSOCKET_APP_KEY=tu-reverb-app-key-produccion
CAJA_ID=2
CAJA_CODIGO=002
SEDE_NOMBRE=ABONADOS
NOMBRE_IMPRESORA=3nStar-RPT006
PUERTO_LOCAL=4000
```

#### Para CAJA 003 (Explanada):
```env
WEBSOCKET_SERVER_URL=wss://tu-dominio.com:8004
WEBSOCKET_APP_KEY=tu-reverb-app-key-produccion
CAJA_ID=3
CAJA_CODIGO=003
SEDE_NOMBRE=EXPLANADA
NOMBRE_IMPRESORA=POS-80
PUERTO_LOCAL=4000
```

**(Repetir para las demás cajas: 4, 5, 6, 7, 8, 9)**

### Paso 3: Verificar nombre de la impresora

```powershell
# Listar impresoras disponibles en Windows
Get-Printer | Select-Object Name, Status
```

El nombre debe coincidir exactamente con `NOMBRE_IMPRESORA` en el archivo `.env`.

### Paso 4: Compilar el proyecto

```powershell
npm run build
```

Esto generará los archivos JavaScript en la carpeta `dist/`.

### Paso 5: Probar el agente

```powershell
# Ejecutar en modo desarrollo
npm run dev
```

Deberías ver:
```
═══════════════════════════════════════════════════════
🚀 AGENTE DE IMPRESIÓN - INICIANDO
═══════════════════════════════════════════════════════
📍 Sede: PÉRGOLA (Caja 001)
🆔 Caja ID: 1
🖨️  Impresora: POS-80
🔌 Servidor: wss://tu-dominio.com:8004
📡 Canal: printer.caja.1
═══════════════════════════════════════════════════════

🌐 Servidor HTTP local: http://localhost:4000
   - Estado: http://localhost:4000/status
   - Health: http://localhost:4000/health

✅ Conectado al servidor WebSocket
   Socket ID: abc123...
   Escuchando canal: printer.caja.1
```

### Paso 6: Instalar como servicio de Windows (PM2)

```powershell
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el agente
pm2 start dist/index.js --name "agente-caja-001"

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
# Seguir las instrucciones que aparecen en pantalla
```

### Paso 7: Verificar que funciona

```powershell
# Ver estado del agente
pm2 status

# Ver logs en tiempo real
pm2 logs agente-caja-001

# Verificar endpoint de estado
curl http://localhost:4000/status
```

### Paso 8: Arranque automático al iniciar sesión en Windows

Si el servicio quedó configurado correctamente, al cerrar sesión y volver a entrar en Windows PM2 debe restaurar el proceso automáticamente.

Verificaciones útiles:

```powershell
# Confirmar que PM2 tiene el proceso guardado para resurrect
pm2 save --force

# Ver el estado actual de PM2
pm2 list

# Confirmar que el puerto local está en uso por el servicio
netstat -ano | findstr :4000

# Confirmar la entrada de inicio automático de Windows para el usuario actual
reg.exe query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v PM2
```

Si necesitas levantarlo manualmente antes del próximo inicio de sesión:

```powershell
# Desde la carpeta del proyecto
npm run build
pm2 start dist/index.js --name ticketera-service --update-env
pm2 save --force
```

En esta implementación, el inicio automático depende de dos piezas:

1. La entrada `PM2` en `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`.
2. El archivo `C:\Users\USER\.pm2\dump.pm2`, que PM2 usa para restaurar procesos al entrar a sesión.

---

## 🔧 Configuración Avanzada

### Cambiar el puerto local

Editar `.env`:
```env
PUERTO_LOCAL=5000
```

### Verificar conexión WebSocket

Abrir en el navegador: `http://localhost:4000/status`

Debería mostrar:
```json
{
  "status": "online",
  "caja_id": 1,
  "caja_codigo": "001",
  "sede_nombre": "PÉRGOLA",
  "websocket": {
    "connected": true,
    "server": "wss://tu-dominio.com:8004"
  },
  "printer": {
    "name": "POS-80",
    "available": true
  },
  "uptime": 123.45
}
```

---

## 🐛 Solución de Problemas

### Error: "Impresora no encontrada"

1. Verificar que la impresora esté encendida y conectada
2. Verificar el nombre exacto en Windows:
   ```powershell
   Get-Printer | Select-Object Name
   ```
3. Actualizar `NOMBRE_IMPRESORA` en `.env` con el nombre exacto

### Error: "No se puede conectar al servidor WebSocket"

1. Verificar que el servidor Reverb esté corriendo
2. Verificar la URL en `.env` (debe ser `wss://` para HTTPS)
3. Verificar que el puerto 8004 esté abierto en el firewall
4. Verificar las credenciales `WEBSOCKET_APP_KEY`

### El agente se desconecta frecuentemente

1. Verificar conexión a Internet estable
2. Verificar que el servidor Reverb esté disponible
3. Revisar logs: `pm2 logs agente-caja-001`

---

## 📊 Monitoreo

### Ver logs en tiempo real
```powershell
pm2 logs agente-caja-001 --lines 50
```

### Reiniciar el agente
```powershell
pm2 restart agente-caja-001
```

### Detener el agente
```powershell
pm2 stop agente-caja-001
```

### Eliminar el agente de PM2
```powershell
pm2 delete agente-caja-001
```

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` creado con configuración correcta
- [ ] Nombre de impresora verificado en Windows
- [ ] Proyecto compilado (`npm run build`)
- [ ] Prueba exitosa en modo desarrollo (`npm run dev`)
- [ ] Agente instalado como servicio con PM2
- [ ] Inicio automático configurado
- [ ] Estado verificado (`http://localhost:4000/status`)
- [ ] Conexión WebSocket exitosa

---

## 📞 Soporte

En caso de problemas, verificar:
1. Logs del agente: `pm2 logs agente-caja-001`
2. Estado del agente: `http://localhost:4000/status`
3. Logs del servidor Reverb en producción

