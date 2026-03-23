export interface User {
  id: string
  email: string
  name: string
}

export interface Note {
  id: string
  userId: string
  content: string
}

export interface IDatabaseAdapter {
  getUser(id: string): Promise<User | null>
  getNotes(userId: string): Promise<Note[]>
  createNote(userId: string, content: string): Promise<Note>
  deleteNote(id: string): Promise<void>
}

export interface IAuthAdapter {
  login(email: string, password?: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}