export type Rol = 'administrador' | 'farmaceutico' | 'tecnico'

export const ROLES: Rol[] = ['administrador', 'farmaceutico', 'tecnico']

/** RBAC jerárquico: el administrador accede a todo. */
export function tienePermiso(rol: Rol, permitidos: Rol[]): boolean {
  return rol === 'administrador' || permitidos.includes(rol)
}
