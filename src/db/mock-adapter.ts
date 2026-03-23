import { IDatabaseAdapter, User, Note } from "./interfaces";

export class MockDatabase implements IDatabaseAdapter {
  private users: User[] = [{ id: '1', email: 'test@example.com', name: 'Test User' }]
  private notes: Note[] = []

  async getUser(id: string): Promise<User | null> {
    return this.users.find(u => u.id === id) || null
  }

  async getNotes(userId: string): Promise<Note[]> {
    return this.notes.filter(n => n.userId === userId)
  }

  async createNote(userId: string, content: string): Promise<Note> {
    const newNote = {id: Date.now().toString(), userId, content}
    this.notes.push(newNote)
    return newNote
  }

  async deleteNote(id: string): Promise<void> {
    this.notes.filter(n => n.id !== id)
  }
}