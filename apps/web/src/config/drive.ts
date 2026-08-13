/**
 * ⚠️ MODO PILOTO: el Service Account de Google Drive está embebido en el bundle.
 * Esto expone la clave privada en el navegador. Es aceptable para una prueba piloto,
 * pero en producción real las operaciones de Drive deben ir por backend (Firebase Functions).
 */

/** JSON completo del Service Account descargado de Google Cloud Console. */
export const DRIVE_SA_JSON = import.meta.env.VITE_DRIVE_SA_JSON || ''

/** ID de la carpeta raíz de Drive del centro (se extrae de la URL de la carpeta). */
export const DRIVE_ROOT_FOLDER_ID =
  import.meta.env.VITE_DRIVE_ROOT_FOLDER_ID || '1aAbPRqrNNdL55qy73P7BFuK5cZInQy8c'
