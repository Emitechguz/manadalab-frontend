export type Estado = "PENDIENTE" | "VISTO" | "SOLUCIONADO";
export type Ema = { id: number; nombre: string };
export type Aula = {
  id: number;
  numero: string;
  emaId: number;
  ema: { nombre: string };
  incidencias: { pendientes: number; vistas: number; solucionadas: number }
};
export type Tipo = { id: number; nombre: string };
export type Activa = { id: number; folio: string; estado: Estado; creadaEn: string };
export type Recurso = {
  id: number;
  clave: string;
  tipo: Tipo;
  incidenciaActiva: Activa | null
};
export type Pagina<T> = {
  datos: T[];
  paginacion: { pagina: number; limite: number; total: number; totalPaginas: number }
};
export type Recursos = Pagina<Recurso> & { aula: Omit<Aula, "incidencias"> };
export type Incidencia = Activa & {
  actualizadaEn: string;
  dispositivo: {
    id: number;
    clave: string;
    aulaId: number | null;
    emaId: number;
    tipo: Tipo;
    aula: { numero: string } | null;
    ema: { nombre: string }
  };
};
export type DetalleIncidencia = Incidencia & {
  descripcion: string;
  version: number;
  historial: {
    estadoAnterior: Estado | null;
    estadoNuevo: Estado;
    fecha: string;
    usuario: { id: number; nombre: string } | null
  }[]
};
export type Prestamo = {
  id: number;
  profesorNombre: string;
  fechaPrestamo: string;
  fechaDevolucion: string | null;
  admin: { id: number; nombre: string };
  dispositivo: {
    id: number;
    clave: string;
    emaId: number;
    aulaId: number | null;
    tipo: { nombre: string }
  };
};
export type Prestable = {
  id: number;
  clave: string;
  aulaId: number | null;
  tipo: { nombre: string }
};
export type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  emaId: number;
  esTecnico: boolean
};
export type Sesion = { usuario: Usuario; csrfToken: string; expiraEn?: string };
export type Alta = { mensaje: string; incidencia: Incidencia };
