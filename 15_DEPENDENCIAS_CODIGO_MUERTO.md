# 15 — AUDITORÍA DE DEPENDENCIAS Y CÓDIGO MUERTO

**Proyecto:** StockCare — Sistema de Gestión y Control de Inventario para Farmacia  
**Materia:** Análisis y Diseño de Sistemas (ADS) — Universidad Don Bosco  
**Fecha de Auditoría:** 26 de Noviembre de 2026  
**Archivos Auditados:** `package.json`, `package-lock.json`, `tsconfig.json`, árbol de código en `src/`.

---

## 1. Clasificación de Dependencias de `package.json`

```json
{
  "dependencies": {
    "firebase": "^13.4.0",
    "lucide-react": "^0.511.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.7",
    "@types/react": "^19.1.4",
    "@types/react-dom": "^19.1.3",
    "@vitejs/plugin-react": "^4.4.1",
    "tailwindcss": "^4.1.7",
    "typescript": "~5.8.3",
    "vite": "^6.3.5"
  }
}
```

### Tabla de Auditoría de Dependencias

| Paquete | Versión | Tipo | Estado de Uso | Dónde se Utiliza | Observaciones |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `firebase` | ^13.4.0 | Runtime | **Usada** | `services/firebase.ts`, `services/authService.ts`, `services/firestoreService.ts` | Versión moderna del SDK modular. Cubre Auth y Firestore. |
| `lucide-react` | ^0.511.0 | Runtime | **Usada** | Todos los componentes y páginas | Iconografía unificada de todo el sistema. |
| `react` | ^19.1.0 | Runtime | **Usada** | Todo el frontend | Versión React 19. |
| `react-dom` | ^19.1.0 | Runtime | **Usada** | `src/main.tsx` | Montaje en el DOM. |
| `react-router-dom` | ^7.6.0 | Runtime | **Usada** | `src/App.tsx`, `components/RouteGuards.tsx`, navegación | Enrutamiento SPA. |
| `@tailwindcss/vite` | ^4.1.7 | Dev | **Usada** | `vite.config.ts` | Plugin oficial de compilación para Tailwind CSS v4. |
| `@types/react` | ^19.1.4 | Dev | **Usada** | Compilación TypeScript | Tipos de React 19. |
| `@types/react-dom` | ^19.1.3 | Dev | **Usada** | Compilación TypeScript | Tipos de ReactDOM. |
| `@vitejs/plugin-react`| ^4.4.1 | Dev | **Usada** | `vite.config.ts` | Soporte Fast Refresh y JSX en Vite. |
| `tailwindcss` | ^4.1.7 | Dev | **Usada** | `src/index.css` | Framework de diseño utilitario. |
| `typescript` | ~5.8.3 | Dev | **Usada** | `tsconfig.json` | Verificación de tipos estricta (`tsc -b`). |
| `vite` | ^6.3.5 | Dev | **Usada** | `vite.config.ts`, scripts npm | Servidor de desarrollo y empaquetador para producción. |

**Conclusión de Dependencias:** El proyecto mantiene un stack sumamente austero, moderno y eficiente. No existen librerías huérfanas ni paquetes redundantes (como Axios innecesario o librerías de estilos duplicadas).

---

## 2. Auditoría de Archivos Residuales y Código Muerto

### 2.1 Archivos en Raíz Sin Referencia (Candidatos a Eliminar en Limpieza)
1. **`Sin confirmar 531720.crdownload` (153 MB):**
   - **Clasificación:** **Basura / Obsoleto**.
   - Descarga abortada en el navegador Chromium. Ocupa 153 MB de almacenamiento innecesario en la raíz del proyecto.
2. **`stockcare_logo.jpg` (175 KB en raíz):**
   - **Clasificación:** **Duplicado / No conectado**.
   - La aplicación importa exclusivamente `src/assets/stockcare-logo.png` en `StockCareLogo.tsx`. Este archivo JPEG en la raíz no posee ningún import.
3. **`firebase-debug.log` (4 KB en raíz):**
   - **Clasificación:** **Log temporal / Obsoleto**.
   - Registro de fallo del comando CLI `firebase deploy` ejecutado el 26/11/2026. Debe excluirse en `.gitignore`.

### 2.2 Funciones Exportadas No Invocadas en la Aplicación
1. **`loginWithGoogleRedirect()` en `src/services/authService.ts:220`:**
   - La función está implementada y exportada, pero `LoginPage.tsx` solo invoca a `loginWithGoogle()` (flujo Popup). No existe ningún botón ni flujo que active el inicio de sesión por redirección.
   - **Recomendación:** Conservar como fallback para dispositivos móviles o navegadores con políticas estrictas de cookies de terceros donde los popups fallan.

### 2.3 Código de Backend Inexistente (Específico de Fase Previa)
- La arquitectura conceptual original contemplaba **Flask + SQL Server**.
- En el código actual no existen archivos `.py`, ni dependencias de backend, ni endpoints REST. La persistencia actual se basa exclusivamente en `StockCareContext` + `localStorage` + Cloud Firestore. No existe código muerto de Flask que requiera refactorizarse en este repositorio, ya que nunca fue comiteado aquí.
