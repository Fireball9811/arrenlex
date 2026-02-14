export type Propiedad = {
  id: string
  direccion: string
  ciudad: string
  barrio: string
  tipo: string
  habitaciones: number
  banos: number
  area: number
  valor_arriendo: number
  descripcion: string
  estado: "disponible" | "arrendado" | "mantenimiento"
  created_at: string
}

export type Arrendatario = {
  id: string
  nombre: string
  cedula: string
  telefono: string
  created_at: string
}

export type Perfil = {
  id: string
  email: string
  nombre?: string | null
  role: "admin" | "propietario" | "inquilino"
  active: boolean
  blocked: boolean
  created_at: string
  updated_at: string
}
