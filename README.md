# 📺 CRT TV Installation

Instalación artística interactiva 3D con televisores CRT vintage. Cada TV tiene una pantalla pixel art con un ojo que sigue el movimiento del mouse.

## 🎨 Concepto

Múltiples televisores CRT antiguos low-poly apilados en un cuarto oscuro, cada uno con una pantalla digital que muestra un ojo en pixel art que rastrea el cursor del usuario.

## 🛠️ Tech Stack

- **Next.js 14** - Framework React
- **Three.js** - Motor 3D
- **React Three Fiber** - Wrapper React para Three.js
- **React Three Drei** - Helpers y utilidades
- **TypeScript** - Type safety
- **Canvas API** - Texturas dinámicas pixel art

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
portfolio/
├── app/
│   ├── layout.tsx          # Layout raíz
│   ├── page.tsx             # Página principal
│   └── globals.css          # Estilos globales
├── components/
│   ├── TVScene.tsx          # Escena Three.js principal
│   ├── CRTTelevision.tsx    # Componente de TV con textura dinámica
│   └── PixelEyeScreen.tsx   # Utilidades para el ojo pixel art
├── public/
│   └── models/
│       └── OldTVLowPoly.glb # Modelo 3D de la TV
└── package.json
```

## 🎯 Features Actuales

- ✅ Modelo 3D low-poly de TV CRT
- ✅ Textura dinámica usando Canvas API
- ✅ Ojo pixel art que sigue el mouse
- ✅ Iluminación y controles de cámara
- ⏳ Sistema de múltiples TVs apiladas (próximamente)

## 🔧 Configuración del Modelo

El componente `CRTTelevision` busca automáticamente una mesh llamada "screen", "pantalla", "display", o "monitor" en tu modelo GLB. Si tu mesh tiene otro nombre, actualiza el array `screenNames` en `CRTTelevision.tsx`.

## 📝 Próximos Pasos

1. Ajustar detección de pantalla según el modelo
2. Optimizar el ojo pixel art
3. Crear sistema de apilamiento de múltiples TVs
4. Añadir variaciones de ángulo y tamaño
5. Implementar optimizaciones de performance

## 🎨 Personalización

### Cambiar el diseño del ojo

Edita las funciones `drawPixelEye`, `drawPixelCircle`, y `drawPixelEllipse` en `CRTTelevision.tsx`.

### Ajustar iluminación

Modifica los parámetros de `ambientLight`, `directionalLight`, y `pointLight` en `TVScene.tsx`.

### Cambiar posición de cámara

Actualiza el parámetro `camera.position` en `TVScene.tsx`.

---

**Hecho con ❤️ usando Three.js**
