# 00 — PUNTO DE SEGURIDAD Y RESPALDO PREVIO A LIMPIEZA

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Respaldo:** 26 de Noviembre de 2026  
**Repositorio Remoto Destino:** `https://github.com/bmaravilla-hub/StockCare-Inventory.git`

---

## 1. Identificación del Respaldo Git

- **Rama Actual:** `main`
- **Hash de Commit de Respaldo:** `f07360f`
- **Mensaje de Commit:** `chore(backup): respaldo pre-limpieza total de StockCare`
- **Repositorio Remoto:** `origin -> https://github.com/bmaravilla-hub/StockCare-Inventory.git`

---

## 2. Estado del Build Previo a la Limpieza

- **Comando Ejecutado:** `npm run build` (`tsc -b && vite build`)
- **Resultado:** **EXIT CODE 0 (Éxito)**
- **Módulos compilados:** 1,704 módulos transformados sin errores TypeScript.
- **Artefactos generados:**
  - `dist/index.html` (0.49 kB)
  - `dist/assets/index-BTKdv0MQ.css` (41.35 kB)
  - `dist/assets/index-ByZlXL5m.js` (1,153.50 kB)
  - `dist/assets/stockcare-logo-CpG3XUCJ.png` (405.53 kB)

---

## 3. Estado de Firebase Detectado

- **Proyecto Configurado:** `stockcare-e000b`
- **Dominio de Auth:** `stockcare-e000b.firebaseapp.com`
- **Storage Bucket:** `stockcare-e000b.firebasestorage.app`
- **Authentication:** Funcional con Email/Password y Google OAuth (`signInWithPopup`).
- **Cloud Firestore:** Inicializado (`firestore.rules` presentes en local).
- **Hosting:** Pendiente de configuración en `firebase.json`.

---

## 4. Archivos Respaldados en este Punto

Se incluye la totalidad del código fuente (`src/`), configuración de empaquetado (`vite.config.ts`, `tsconfig.json`, `package.json`), reglas de seguridad (`firestore.rules`, `firebase.json`), documentación académica preliminar (`ADS Inventario Farmacia.pdf`) y los 21 documentos de auditoría técnica previa (`01_...` a `21_...`).
