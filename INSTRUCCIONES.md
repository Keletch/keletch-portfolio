# 🎯 INSTRUCCIONES DE USO - CRT TV Installation

## ✅ Estado Actual
- ✅ Proyecto configurado e instalado
- ✅ Servidor de desarrollo corriendo en **http://localhost:3000**
- ✅ Modelo `OldTVLowPoly.glb` cargado y listo

---

## 🚀 PASO SIGUIENTE

### 1. Abre tu navegador
Navega a: **http://localhost:3000**

### 2. ¿Qué deberías ver?
- Una escena 3D oscura con tu modelo de TV CRT
- Una pantalla en la TV con un ojo pixel art azul
- El ojo debería seguir tu mouse cuando lo mueves

### 3. Controles
- **Click + Arrastrar**: Rotar la cámara alrededor de la TV
- **Scroll**: Acercar/alejar zoom
- **Mover mouse**: El ojo sigue el cursor

---

## 🔧 AJUSTES QUE PROBABLEMENTE NECESITES

### Si no ves la pantalla encendida:
El código busca automáticamente una mesh llamada `"screen"`, `"pantalla"`, `"display"`, o `"monitor"` en tu modelo GLB.

**Para verificar el nombre correcto:**
1. Abre tu navegador en http://localhost:3000
2. Abre la consola del navegador (F12)
3. Busca mensajes que digan `"Mesh encontrada: [nombre]"`
4. Si el nombre de tu pantalla es diferente, edita `CRTTelevision.tsx` línea 48

Ejemplo de lo que verás en consola:
```
Mesh encontrada: TV_Body
Mesh encontrada: TV_Screen  ← Este es el que buscamos
Mesh encontrada: TV_Knobs
✓ Pantalla detectada: TV_Screen
```

### Si necesitas ajustar la detección de pantalla:

Edita: `components/CRTTelevision.tsx` línea 48

```typescript
const screenNames = ['screen', 'pantalla', 'display', 'monitor', 'glass'];
// Agrega el nombre de tu mesh aquí ↑
```

---

## 🎨 PERSONALIZACIÓN

### Cambiar el color del ojo:
`components/CRTTelevision.tsx` línea 116
```typescript
ctx.fillStyle = '#4080ff'; // Cambia este color
```

### Ajustar tamaño del ojo:
`components/CRTTelevision.tsx` líneas 113-114
```typescript
const maxOffset = 16; // Qué tan lejos se mueve la pupila
drawPixelEllipse(ctx, centerX, centerY, 60, 40, pixelSize); // Tamaño del ojo
```

### Cambiar resolución de pixel art:
`components/CRTTelevision.tsx` línea 109
```typescript
const pixelSize = 8; // Valores más grandes = pixels más grandes
```

---

## ⏭️ PRÓXIMOS PASOS

Una vez que confirmes que funciona:

1. **Optimizar la detección de pantalla** según el nombre real en tu modelo
2. **Ajustar el diseño del ojo** a tu gusto
3. **Crear sistema de múltiples TVs** apiladas
4. **Añadir efectos de pantalla CRT** (scanlines, curvatura)
5. **Implementar variaciones** de tamaño y ángulo

---

## 📌 COMANDOS ÚTILES

```bash
# Detener servidor
Ctrl + C en la terminal

# Reiniciar servidor
npm run dev

# Ver errores en tiempo real
Revisa la consola del navegador (F12)
```

---

## 🐛 TROUBLESHOOTING

### La TV se ve negra completamente:
- Revisa la consola del navegador para ver qué meshes se detectaron
- Ajusta los nombres en el array `screenNames`

### El ojo no sigue el mouse:
- Verifica que el modelo se haya cargado correctamente
- Asegúrate de que la pantalla se detectó (busca el mensaje "✓ Pantalla detectada")

### El modelo no aparece:
- Verifica que el archivo esté en `public/models/OldTVLowPoly.glb`
- Revisa la consola del navegador por errores de carga

---

**¡Listo para probar! 🎮**
