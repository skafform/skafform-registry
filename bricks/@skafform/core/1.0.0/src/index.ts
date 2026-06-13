export interface SkafformUserData {
  id: string
  email: string
  name: string
  role: string
  image?: string
  emailVerified: boolean
  createdAt: Date
}

export interface SkafformAuthAdapter {
  getUsers: () => Promise<SkafformUserData[]>
  getUserById: (id: string) => Promise<SkafformUserData | null>
  deleteUser: (id: string) => Promise<void>
  getSession: (request: Request) => Promise<SkafformUserData | null>
  updateProfile: (userId: string, data: { name?: string }) => Promise<void>
  changePassword: (request: Request, data: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>
}

export interface SkafformConfig {
  theme: string
  customize?: Record<string, unknown>
}

export function defineConfig(config: SkafformConfig): SkafformConfig {
  return config
}
